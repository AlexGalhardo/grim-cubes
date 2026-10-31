import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Kind = "sfx" | "music" | "voice";

export interface PromptEntry {
	file: string;
	kind: Kind;
	prompt: string;
	durationSeconds: number;
	loop?: boolean;
	promptInfluence?: number;
	voiceId?: string;
	model: string;
}

export interface MetaFile {
	prompt: string;
	model: string;
	durationSeconds: number;
	generatedAt: string;
	plan: string;
	promptInfluence?: number;
	voiceId?: string;
	hash: string;
}

export interface HttpResponse {
	ok: boolean;
	status: number;
	arrayBuffer(): Promise<ArrayBuffer>;
}

export type FetchFn = (
	url: string,
	init: { method: string; headers: Record<string, string>; body: string },
) => Promise<HttpResponse>;

export const API_BASE = "https://api.elevenlabs.io";
export const DEFAULT_MAX_CREDITS = 20000;

const CREDITS_PER_SFX = 200;
const CREDITS_PER_MUSIC_MINUTE = 900;
const KINDS: readonly string[] = ["sfx", "music", "voice"];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePrompts(raw: unknown): PromptEntry[] {
	if (!Array.isArray(raw)) throw new Error("prompts.json must be an array");
	const seen = new Set<string>();
	return raw.map((item, i) => {
		if (!isRecord(item)) throw new Error(`prompts[${i}] must be an object`);
		const { file, kind, prompt, durationSeconds, model, loop, promptInfluence, voiceId } = item;
		if (typeof file !== "string" || !/^[a-z][a-z0-9_]*$/.test(file))
			throw new Error(`prompts[${i}].file invalid`);
		if (seen.has(file)) throw new Error(`prompts: duplicate file "${file}"`);
		seen.add(file);
		if (typeof kind !== "string" || !KINDS.includes(kind)) throw new Error(`prompts[${i}].kind invalid`);
		if (typeof prompt !== "string" || prompt === "") throw new Error(`prompts[${i}].prompt invalid`);
		if (typeof durationSeconds !== "number" || durationSeconds <= 0)
			throw new Error(`prompts[${i}].durationSeconds invalid`);
		// API limits: sound-generation 0.5-30 s; music 3000-600000 ms.
		if (kind === "sfx" && (durationSeconds < 0.5 || durationSeconds > 30))
			throw new Error(`prompts[${i}].durationSeconds must be 0.5-30 for sfx`);
		if (kind === "music" && (durationSeconds < 3 || durationSeconds > 600))
			throw new Error(`prompts[${i}].durationSeconds must be 3-600 for music`);
		if (typeof model !== "string" || model === "") throw new Error(`prompts[${i}].model invalid`);
		if (kind === "voice" && typeof voiceId !== "string")
			throw new Error(`prompts[${i}].voiceId required for voice`);
		const entry: PromptEntry = { file, kind: kind as Kind, prompt, durationSeconds, model };
		if (typeof loop === "boolean") entry.loop = loop;
		if (typeof promptInfluence === "number") entry.promptInfluence = promptInfluence;
		if (typeof voiceId === "string") entry.voiceId = voiceId;
		return entry;
	});
}

// Conservative estimate; official SFX/music rates are not published per second. Revise against the real balance.
export function estimateCredits(entry: PromptEntry): number {
	if (entry.kind === "sfx") return CREDITS_PER_SFX;
	if (entry.kind === "voice") return entry.prompt.length;
	return Math.round((entry.durationSeconds / 60) * CREDITS_PER_MUSIC_MINUTE);
}

export function hashEntry(entry: PromptEntry): string {
	const { prompt, model, durationSeconds, loop, promptInfluence, voiceId } = entry;
	return createHash("sha256")
		.update(
			JSON.stringify([
				prompt,
				model,
				durationSeconds,
				loop ?? null,
				promptInfluence ?? null,
				voiceId ?? null,
			]),
		)
		.digest("hex");
}

export type PlanResult =
	| { ok: true; plan: string }
	| { ok: false; reason: "missing" | "free"; error: string };

export function resolvePlan(planEnv: string | undefined, allowFree: boolean): PlanResult {
	const plan = planEnv?.trim().toLowerCase() ?? "";
	if (plan === "")
		return {
			ok: false,
			reason: "missing",
			error: "ELEVENLABS_PLAN is not set; a paid plan is required for commercial use",
		};
	if (plan === "free" && !allowFree)
		return {
			ok: false,
			reason: "free",
			error: "ELEVENLABS_PLAN=free has no commercial license; refusing (pass --allow-free to override)",
		};
	return { ok: true, plan };
}

export function matchesOnly(file: string, pattern: string | undefined): boolean {
	if (pattern === undefined) return true;
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
	return new RegExp(`^${escaped}$`).test(file);
}

export function buildRequest(entry: PromptEntry): { url: string; body: Record<string, unknown> } {
	if (entry.kind === "sfx") {
		return {
			url: `${API_BASE}/v1/sound-generation`,
			body: {
				text: entry.prompt,
				duration_seconds: entry.durationSeconds,
				prompt_influence: entry.promptInfluence ?? 0.5,
				loop: entry.loop ?? false,
				model_id: entry.model,
			},
		};
	}
	if (entry.kind === "music") {
		return {
			url: `${API_BASE}/v1/music`,
			body: {
				prompt: entry.prompt,
				music_length_ms: Math.round(entry.durationSeconds * 1000),
				model_id: entry.model,
			},
		};
	}
	return {
		url: `${API_BASE}/v1/text-to-speech/${entry.voiceId ?? ""}`,
		body: { text: entry.prompt, model_id: entry.model },
	};
}

export interface Paths {
	audio: string;
	meta: string;
}

export function pathsFor(outDir: string, entry: PromptEntry): Paths {
	const dir = join(outDir, entry.kind);
	return { audio: join(dir, `${entry.file}.mp3`), meta: join(dir, `${entry.file}.meta.json`) };
}

async function readMetaHash(path: string): Promise<string | undefined> {
	try {
		const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
		return isRecord(parsed) && typeof parsed.hash === "string" ? parsed.hash : undefined;
	} catch {
		return undefined;
	}
}

export async function isUpToDate(outDir: string, entry: PromptEntry): Promise<boolean> {
	return (await readMetaHash(pathsFor(outDir, entry).meta)) === hashEntry(entry);
}

export interface GenerateDeps {
	fetch: FetchFn;
	apiKey: string;
	plan: string;
	outDir: string;
	sleep: (ms: number) => Promise<void>;
	now: () => Date;
	maxAttempts?: number;
}

class HttpError extends Error {
	constructor(readonly status: number) {
		super(`HTTP ${status}`);
	}
}

export async function generateOne(entry: PromptEntry, deps: GenerateDeps): Promise<void> {
	const { url, body } = buildRequest(entry);
	const attempts = deps.maxAttempts ?? 3;
	let lastError = "";
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			// The key travels only in this header; it is never part of an error message or log.
			const response = await deps.fetch(url, {
				method: "POST",
				headers: {
					"xi-api-key": deps.apiKey,
					"content-type": "application/json",
					accept: "audio/mpeg",
				},
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new HttpError(response.status);
			const audio = new Uint8Array(await response.arrayBuffer());
			const paths = pathsFor(deps.outDir, entry);
			await mkdir(join(deps.outDir, entry.kind), { recursive: true });
			const meta: MetaFile = {
				prompt: entry.prompt,
				model: entry.model,
				durationSeconds: entry.durationSeconds,
				generatedAt: deps.now().toISOString(),
				plan: deps.plan,
				hash: hashEntry(entry),
				...(entry.promptInfluence !== undefined && { promptInfluence: entry.promptInfluence }),
				...(entry.voiceId !== undefined && { voiceId: entry.voiceId }),
			};
			await writeFile(paths.audio, audio);
			await writeFile(paths.meta, `${JSON.stringify(meta, null, "\t")}\n`);
			return;
		} catch (error) {
			lastError = error instanceof Error ? error.message : "unknown error";
			// 4xx (bad request, auth, quota) will not succeed on retry, except 429 (rate limit).
			if (
				error instanceof HttpError &&
				error.status >= 400 &&
				error.status < 500 &&
				error.status !== 429
			)
				break;
			if (attempt < attempts) await deps.sleep(500 * 2 ** (attempt - 1));
		}
	}
	throw new Error(`${entry.file}: generation failed (${lastError})`);
}

export async function runPool<T>(
	items: readonly T[],
	limit: number,
	task: (item: T) => Promise<void>,
): Promise<void> {
	let next = 0;
	const worker = async (): Promise<void> => {
		for (let i = next++; i < items.length; i = next++) {
			const item = items[i];
			if (item !== undefined) await task(item);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export interface RunOptions {
	prompts: PromptEntry[];
	outDir: string;
	env: Record<string, string | undefined>;
	dryRun: boolean;
	force: boolean;
	allowFree: boolean;
	only?: string;
	maxCredits: number;
	fetch: FetchFn;
	log: (line: string) => void;
	sleep?: (ms: number) => Promise<void>;
	now?: () => Date;
}

/** Returns the process exit code. Never prints the API key. */
export async function run(options: RunOptions): Promise<number> {
	const { log } = options;
	const plan = resolvePlan(options.env.ELEVENLABS_PLAN, options.allowFree);
	// A dry-run only prints the plan, so a missing ELEVENLABS_PLAN is tolerated there; free is always refused.
	if (!plan.ok && !(plan.reason === "missing" && options.dryRun)) {
		log(`error: ${plan.error}`);
		return 2;
	}
	const planLabel = plan.ok ? plan.plan : "missing";
	const apiKey = options.env.ELEVENLABS_API_KEY;
	const hasKey = apiKey !== undefined && apiKey !== "";

	const selected = options.prompts.filter((p) => matchesOnly(p.file, options.only));
	const todo: PromptEntry[] = [];
	const skipped: PromptEntry[] = [];
	for (const entry of selected) {
		if (!options.force && (await isUpToDate(options.outDir, entry))) skipped.push(entry);
		else todo.push(entry);
	}
	const credits = todo.reduce((sum, e) => sum + estimateCredits(e), 0);

	log(`audio-generate${options.dryRun ? " (dry-run)" : ""}`);
	log(`plan: ${planLabel}`);
	log(`api key: ${hasKey ? "set" : "missing"}`);
	log(`to generate: ${todo.length}, up to date: ${skipped.length}`);
	for (const e of todo) log(`  ${e.file}  ${e.kind}  ${e.durationSeconds}s  ${estimateCredits(e)} credits`);
	for (const e of skipped) log(`  ${e.file}  skip (hash unchanged)`);
	log(`estimated credits: ${credits} (limit ${options.maxCredits})`);

	if (credits > options.maxCredits) {
		log("error: estimated cost exceeds the credit limit; raise it with --max-credits after PO approval");
		return 1;
	}
	if (options.dryRun) return 0;
	if (!plan.ok) return 2;
	if (!hasKey) {
		log("error: ELEVENLABS_API_KEY is not set (put it in .env)");
		return 1;
	}

	const deps: GenerateDeps = {
		fetch: options.fetch,
		apiKey,
		plan: plan.plan,
		outDir: options.outDir,
		sleep: options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
		now: options.now ?? (() => new Date()),
	};
	let failed = 0;
	await runPool(todo, 2, async (entry) => {
		try {
			await generateOne(entry, deps);
			log(`generated ${entry.file}`);
		} catch (error) {
			failed++;
			log(`error: ${error instanceof Error ? error.message : "generation failed"}`);
		}
	});
	return failed === 0 ? 0 : 1;
}
