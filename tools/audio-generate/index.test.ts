import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	buildRequest,
	estimateCredits,
	type FetchFn,
	type PromptEntry,
	parsePrompts,
	resolvePlan,
	run,
} from "./lib";

const promptsPath = fileURLToPath(new URL("../../assets/src/audio/prompts.json", import.meta.url));
const SECRET = "sk-test-secret-123";

let outDir = "";
let lines: string[] = [];
let calls = 0;

beforeEach(async () => {
	outDir = await mkdtemp(join(tmpdir(), "audio-gen-"));
	lines = [];
	calls = 0;
});
afterEach(async () => {
	await rm(outDir, { recursive: true, force: true });
});

async function loadPrompts(): Promise<PromptEntry[]> {
	return parsePrompts(JSON.parse(await readFile(promptsPath, "utf8")) as unknown);
}

function mockFetch(statuses: number[] = [200]): FetchFn {
	return async () => {
		const status = statuses[Math.min(calls, statuses.length - 1)] ?? 200;
		calls++;
		return { ok: status === 200, status, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
	};
}

async function runWith(
	env: Record<string, string | undefined>,
	extra: { dryRun?: boolean; fetch?: FetchFn; only?: string; maxCredits?: number } = {},
): Promise<number> {
	return run({
		prompts: await loadPrompts(),
		outDir,
		env,
		dryRun: extra.dryRun ?? false,
		force: false,
		allowFree: false,
		...(extra.only !== undefined && { only: extra.only }),
		maxCredits: extra.maxCredits ?? 40000,
		fetch: extra.fetch ?? mockFetch(),
		log: (l) => lines.push(l),
		sleep: async () => {},
		now: () => new Date("2026-01-01T00:00:00Z"),
	});
}

describe("audio-generate", () => {
	it("ships 70 sfx, 9 music and 40 voice prompts (every id the audio engine asks for)", async () => {
		const prompts = await loadPrompts();
		expect(prompts.filter((p) => p.kind === "sfx")).toHaveLength(70);
		expect(prompts.filter((p) => p.kind === "music")).toHaveLength(9);
		expect(prompts.filter((p) => p.kind === "voice")).toHaveLength(40);
	});

	it("estimates credits per kind", async () => {
		const prompts = await loadPrompts();
		const music = prompts.filter((p) => p.kind === "music").reduce((n, p) => n + p.durationSeconds, 0);
		const voice = prompts.filter((p) => p.kind === "voice").reduce((n, p) => n + p.prompt.length, 0);
		expect(prompts.reduce((s, p) => s + estimateCredits(p), 0)).toBe(
			70 * 200 + Math.round((music / 60) * 900) + voice,
		);
	});

	it("refuses missing and free plans", () => {
		expect(resolvePlan(undefined, false).ok).toBe(false);
		expect(resolvePlan("free", false).ok).toBe(false);
		expect(resolvePlan("creator", false)).toEqual({ ok: true, plan: "creator" });
	});

	it("dry-run prints the plan, never calls the API and never prints the key", async () => {
		const code = await runWith(
			{ ELEVENLABS_PLAN: "creator", ELEVENLABS_API_KEY: SECRET },
			{ dryRun: true },
		);
		expect(code).toBe(0);
		expect(lines).toContain("plan: creator");
		expect(lines.join("\n")).not.toContain(SECRET);
		expect(calls).toBe(0);
	});

	it("exits non-zero on a free plan without calling the API", async () => {
		expect(await runWith({ ELEVENLABS_PLAN: "free", ELEVENLABS_API_KEY: SECRET })).toBe(2);
		expect(calls).toBe(0);
	});

	it("fails clearly when the key is missing on a real run", async () => {
		expect(await runWith({ ELEVENLABS_PLAN: "creator" })).toBe(1);
		expect(lines.join("\n")).toContain("ELEVENLABS_API_KEY is not set");
	});

	it("refuses a batch above the credit limit", async () => {
		expect(
			await runWith({ ELEVENLABS_PLAN: "creator", ELEVENLABS_API_KEY: SECRET }, { maxCredits: 100 }),
		).toBe(1);
		expect(calls).toBe(0);
	});

	it("generates with a mocked fetch, writes meta and skips on the second run", async () => {
		const env = { ELEVENLABS_PLAN: "creator", ELEVENLABS_API_KEY: SECRET };
		expect(await runWith(env, { only: "sfx_ui_*" })).toBe(0);
		expect(calls).toBe(6);
		const meta = JSON.parse(await readFile(join(outDir, "sfx", "sfx_ui_hover.meta.json"), "utf8")) as {
			plan: string;
			hash: string;
		};
		expect(meta.plan).toBe("creator");
		expect(meta.hash).toHaveLength(64);

		lines = [];
		expect(await runWith(env, { only: "sfx_ui_*" })).toBe(0);
		expect(calls).toBe(6);
		expect(lines).toContain("to generate: 0, up to date: 6");
	});

	it("retries with backoff and fails after 3 attempts", async () => {
		const code = await runWith(
			{ ELEVENLABS_PLAN: "creator", ELEVENLABS_API_KEY: SECRET },
			{ only: "sfx_ui_hover", fetch: mockFetch([500]) },
		);
		expect(code).toBe(1);
		expect(calls).toBe(3);
		expect(lines.join("\n")).not.toContain(SECRET);
	});

	it("recovers when a retry succeeds", async () => {
		const code = await runWith(
			{ ELEVENLABS_PLAN: "creator", ELEVENLABS_API_KEY: SECRET },
			{ only: "sfx_ui_hover", fetch: mockFetch([500, 200]) },
		);
		expect(code).toBe(0);
		expect(calls).toBe(2);
	});

	it("dry-run does not require ELEVENLABS_PLAN and logs plan: missing", async () => {
		expect(await runWith({}, { dryRun: true })).toBe(0);
		expect(lines).toContain("plan: missing");
		expect(calls).toBe(0);
	});

	it("dry-run still refuses the free plan with exit 2", async () => {
		expect(await runWith({ ELEVENLABS_PLAN: "free" }, { dryRun: true })).toBe(2);
	});

	it("a real run without a plan is refused with exit 2", async () => {
		expect(await runWith({ ELEVENLABS_API_KEY: SECRET })).toBe(2);
		expect(calls).toBe(0);
	});

	it("does not retry 4xx errors, except 429", async () => {
		const env = { ELEVENLABS_PLAN: "creator", ELEVENLABS_API_KEY: SECRET };
		expect(await runWith(env, { only: "sfx_ui_hover", fetch: mockFetch([401]) })).toBe(1);
		expect(calls).toBe(1);

		calls = 0;
		expect(await runWith(env, { only: "sfx_ui_hover", fetch: mockFetch([429, 200]) })).toBe(0);
		expect(calls).toBe(2);
	});

	it("estimates voice credits per character", () => {
		const voice: PromptEntry = {
			file: "vo_test",
			kind: "voice",
			prompt: "hello there",
			durationSeconds: 2,
			voiceId: "v",
			model: "m",
		};
		expect(estimateCredits(voice)).toBe(11);
	});

	it("rejects durations outside the API limits", () => {
		const base = { file: "a", prompt: "p", model: "m" };
		expect(() => parsePrompts([{ ...base, kind: "sfx", durationSeconds: 0.3 }])).toThrow(/0.5-30/);
		expect(() => parsePrompts([{ ...base, kind: "music", durationSeconds: 2 }])).toThrow(/3-600/);
	});

	it("asks the music API for force_instrumental only when the entry says so, and ships every track that way", async () => {
		const base: PromptEntry = {
			file: "m",
			kind: "music",
			prompt: "p",
			durationSeconds: 60,
			model: "music_v1",
		};
		expect(buildRequest(base).body).not.toHaveProperty("force_instrumental");
		expect(buildRequest({ ...base, instrumental: true }).body).toMatchObject({
			force_instrumental: true,
		});
		const music = (await loadPrompts()).filter((p) => p.kind === "music");
		for (const m of music) {
			expect(m.instrumental).toBe(true);
			expect(m.prompt).toContain("no vocals, no choir, no singing, no humming");
		}
	});
});
