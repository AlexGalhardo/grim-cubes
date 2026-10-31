import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const script = resolve("tools/sim/index.ts");
const run = (cwd: string, ...args: string[]): { status: number | null; stderr: string } => {
	const result = spawnSync("bun", [script, ...args], { encoding: "utf8", cwd });
	return { status: result.status, stderr: result.stderr };
};

it("gives the same reports with one job or several, and accepts an out path above the working directory", () => {
	const dir = mkdtempSync(join(tmpdir(), "sim-"));
	const sub = join(dir, "sub");
	mkdirSync(sub);
	const one = join(dir, "one.json");
	const many = join(dir, "many.json");
	expect(run(dir, "--runs", "6", "--rounds", "2", "--seed", "3", "--jobs", "1", "--out", one).status).toBe(
		0,
	);
	expect(run(dir, "--runs", "6", "--rounds", "2", "--seed", "3", "--jobs", "3", "--out", many).status).toBe(
		0,
	);
	const a = JSON.parse(readFileSync(one, "utf8")) as { runs: unknown[]; metrics: unknown };
	const b = JSON.parse(readFileSync(many, "utf8")) as { runs: unknown[]; metrics: unknown };
	expect(b.runs).toEqual(a.runs);
	expect(b.metrics).toEqual(a.metrics);
	// Relative out paths such as "../x.json" used to fail with EEXIST on Windows.
	expect(run(sub, "--runs", "1", "--rounds", "1", "--out", "../up.json").status).toBe(0);
	expect(JSON.parse(readFileSync(join(dir, "up.json"), "utf8"))).toHaveProperty("report");
}, 120_000);

it("rejects unknown options with exit code 2", () => {
	expect(run(tmpdir(), "--nope").status).toBe(2);
});
