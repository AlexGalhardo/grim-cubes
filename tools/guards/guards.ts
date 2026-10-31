import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Floors {
	/** Minimum entries per audio kind in `prompts.json`. */
	audio: Record<string, number>;
	/** Minimum test cases (`test(`, `it(` and their `.each` forms) per workspace folder. */
	tests: Record<string, number>;
}

const SKIP = new Set(["node_modules", "dist", "coverage", ".git", "playwright-report", "test-results"]);
const TEST_CASE = /^\s*(?:test|it)(?:\.each\([^)]*\))?\(/gm;

export function walk(dir: string, accept: (file: string) => boolean, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP.has(entry.name)) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) walk(path, accept, out);
		else if (accept(path)) out.push(path);
	}
	return out;
}

export function countTestCases(root: string, folder: string): number {
	const files = walk(join(root, folder), (f) => /\.test\.tsx?$/.test(f));
	return files.reduce((sum, f) => sum + (readFileSync(f, "utf8").match(TEST_CASE)?.length ?? 0), 0);
}

export function missingFiles(root: string, essential: readonly string[]): string[] {
	return essential.filter((f) => !existsSync(join(root, f)));
}

interface PromptRef {
	file: string;
	kind: string;
}

/** Problems between `prompts.json` and the generated files in `assets/src/audio/<kind>/`. */
export function audioProblems(root: string, floors: Floors["audio"]): string[] {
	const problems: string[] = [];
	const audioDir = join(root, "assets/src/audio");
	const prompts = JSON.parse(readFileSync(join(audioDir, "prompts.json"), "utf8")) as PromptRef[];
	const expected = new Set<string>();
	for (const p of prompts) {
		for (const ext of ["mp3", "meta.json"]) {
			const rel = `${p.kind}/${p.file}.${ext}`;
			expected.add(rel);
			if (!existsSync(join(audioDir, rel)))
				problems.push(`prompts.json lists ${p.file} but ${rel} is missing`);
		}
		const metaPath = join(audioDir, p.kind, `${p.file}.meta.json`);
		if (existsSync(metaPath)) {
			const plan = (JSON.parse(readFileSync(metaPath, "utf8")) as { plan?: string }).plan;
			if (!plan || plan === "free")
				problems.push(`${p.file}.meta.json has plan "${plan ?? "missing"}"`);
		}
	}
	for (const kind of ["sfx", "music", "voice"]) {
		for (const file of walk(join(audioDir, kind), () => true)) {
			const rel = `${kind}/${file.slice(join(audioDir, kind).length + 1).replaceAll("\\", "/")}`;
			if (!expected.has(rel)) problems.push(`${rel} has no entry in prompts.json`);
		}
		const count = prompts.filter((p) => p.kind === kind).length;
		const floor = floors[kind] ?? 0;
		if (count < floor) problems.push(`prompts.json has ${count} ${kind} entries, the floor is ${floor}`);
	}
	return problems;
}
