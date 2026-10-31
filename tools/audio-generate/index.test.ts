import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { estimateCredits, type FetchFn, type PromptEntry, parsePrompts, resolvePlan, run } from "./lib";

const promptsPath = fileURLToPath(new URL("./prompts.json", import.meta.url));
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
		maxCredits: extra.maxCredits ?? 20000,
		fetch: extra.fetch ?? mockFetch(),
		log: (l) => lines.push(l),
		sleep: async () => {},
		now: () => new Date("2026-01-01T00:00:00Z"),
	});
}

describe("audio-generate", () => {
	it("ships 20 sfx and 2 music prompts", async () => {
		const prompts = await loadPrompts();
		expect(prompts.filter((p) => p.kind === "sfx")).toHaveLength(20);
		expect(prompts.filter((p) => p.kind === "music")).toHaveLength(2);
	});

	it("estimates credits per kind", async () => {
		const prompts = await loadPrompts();
		expect(prompts.reduce((s, p) => s + estimateCredits(p), 0)).toBe(20 * 200 + 2 * 2250);
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
		expect(await runWith({ ELEVENLABS_PLAN: "free", ELEVENLABS_API_KEY: SECRET })).toBe(1);
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
		expect(calls).toBe(4);
		const meta = JSON.parse(await readFile(join(outDir, "sfx", "sfx_ui_hover.meta.json"), "utf8")) as {
			plan: string;
			hash: string;
		};
		expect(meta.plan).toBe("creator");
		expect(meta.hash).toHaveLength(64);

		lines = [];
		expect(await runWith(env, { only: "sfx_ui_*" })).toBe(0);
		expect(calls).toBe(4);
		expect(lines).toContain("to generate: 0, up to date: 4");
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
});
