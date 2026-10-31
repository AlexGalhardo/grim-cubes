export interface Violation {
	rule: string;
	file: string;
	line: number;
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const CONSOLE_LOG = /\bconsole\.log\b/;
const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;

export function hexViolations(file: string, text: string): Violation[] {
	return matchLines("no-hex-in-tsx", file, text, HEX);
}

export function consoleLogViolations(file: string, text: string): Violation[] {
	return matchLines("no-console-log", file, text, CONSOLE_LOG);
}

/** Checks only dependency fields, so `engines` ranges are allowed. */
export function rangeViolations(file: string, text: string): Violation[] {
	const manifest = JSON.parse(text) as Record<string, unknown>;
	const lines = text.split(/\r?\n/);
	const out: Violation[] = [];
	for (const field of DEP_FIELDS) {
		const deps = manifest[field];
		if (typeof deps !== "object" || deps === null) continue;
		for (const [name, range] of Object.entries(deps)) {
			if (typeof range !== "string" || !/^[\^~]/.test(range)) continue;
			const line = lines.findIndex((l) => l.includes(`"${name}"`) && l.includes(range));
			out.push({ rule: "no-range-versions", file, line: line + 1 });
		}
	}
	return out;
}

function matchLines(rule: string, file: string, text: string, pattern: RegExp): Violation[] {
	const out: Violation[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		if (pattern.test(line)) out.push({ rule, file, line: index + 1 });
	});
	return out;
}
