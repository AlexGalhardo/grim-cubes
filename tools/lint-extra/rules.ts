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

const HARD_ATTR = /\b(?:aria-label|placeholder|title|alt)="[^"{}]*[A-Za-zÀ-ú]{2}[^"{}]*"/;
const CODE_WORDS = new Set(["else", "try", "finally", "break", "continue", "default", "return", "async"]);

/** A line that is only prose: letters, spaces and light punctuation, no code characters (JSX text between tags). */
function isProseLine(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.length < 3 || /^(?:\/\/|\/\*|\*|import |export )/.test(trimmed)) return false;
	// Two or more words, not a destructured or imported identifier list (`store,`): single-word text is caught by the
	// same-line `>Text<` check instead.
	if (CODE_WORDS.has(trimmed) || !/\s/.test(trimmed) || /,$/.test(trimmed)) return false;
	return (
		/^[A-Za-zÀ-ú][A-Za-zÀ-ú0-9 ,.:!?'·×+−()-]*$/.test(trimmed) &&
		/[A-Za-zÀ-ú]{2}/.test(trimmed) &&
		!/[();]$/.test(trimmed)
	);
}

/** Visible text must come from `t()`: flags JSX text lines and literal accessibility attributes in `.tsx` (A-07-01). */
export function hardcodedTextViolations(file: string, text: string): Violation[] {
	const out: Violation[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		if (
			HARD_ATTR.test(line) ||
			(/>\s*[A-Za-zÀ-ú][^<>{}]*[A-Za-zÀ-ú]\s*</.test(line) && !/=>|<[A-Z]\w*\s*</.test(line)) ||
			isProseLine(line)
		) {
			out.push({ rule: "no-hardcoded-text", file, line: index + 1 });
		}
	});
	return out;
}
