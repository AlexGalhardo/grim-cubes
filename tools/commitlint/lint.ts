const TYPES = "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert";
const HEADER = new RegExp(`^(${TYPES})(\\([a-z0-9][a-z0-9-]*\\))?!?: \\S.*$`);
const MAX_HEADER = 100;

/** Returns an error message, or null when the header is valid. Merge commits are exempt. */
export function lintCommitMessage(message: string): string | null {
	const header = message.split(/\r?\n/, 1)[0] ?? "";
	if (header.startsWith("Merge ")) return null;
	if (!HEADER.test(header)) return `header must match "type(scope)!: description" with type in ${TYPES}`;
	if (header.length > MAX_HEADER) return `header longer than ${MAX_HEADER} characters`;
	return null;
}
