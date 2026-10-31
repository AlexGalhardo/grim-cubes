import {
	consoleLogViolations,
	hardcodedTextViolations,
	hexViolations,
	rangeViolations,
	type Violation,
} from "./rules";

const SKIP = ["node_modules/", "dist/", "coverage/", "graphify-out/"];
const LOGGER = "packages/core/src/logger.ts";

async function files(pattern: string): Promise<string[]> {
	const found: string[] = [];
	for await (const path of new Bun.Glob(pattern).scan({ cwd: ".", dot: false })) {
		const normalized = path.replaceAll("\\", "/");
		if (!SKIP.some((skip) => normalized.includes(skip))) found.push(normalized);
	}
	return found;
}

const violations: Violation[] = [];
for (const file of await files("packages/ui/**/*.tsx")) {
	const source = await Bun.file(file).text();
	violations.push(...hexViolations(file, source));
	if (!file.endsWith(".test.tsx")) violations.push(...hardcodedTextViolations(file, source));
}
for (const file of [...(await files("packages/**/*.{ts,tsx}")), ...(await files("apps/**/*.{ts,tsx}"))]) {
	if (file === LOGGER) continue;
	violations.push(...consoleLogViolations(file, await Bun.file(file).text()));
}
for (const file of ["package.json", ...(await files("{apps,packages}/*/package.json"))]) {
	violations.push(...rangeViolations(file, await Bun.file(file).text()));
}

for (const v of violations) console.error(`lint-extra: ${v.rule} at ${v.file}:${v.line}`);
process.exit(violations.length > 0 ? 1 : 0);
