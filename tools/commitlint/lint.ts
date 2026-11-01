const TYPES = "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert";
const HEADER = new RegExp(`^(${TYPES})(\\([a-z0-9][a-z0-9-]*\\))?!?: \\S.*$`);
const MAX_HEADER = 100;
const RELEASE_BRANCH = /^release\//;
const RELEASE_TYPES = new Set(["fix", "docs", "chore"]);

/**
 * Returns an error message, or null when the header is valid. Merge commits are exempt.
 * On a `release/*` branch only `fix:`, `docs:` and `chore:` are accepted.
 */
export function lintCommitMessage(message: string, branch?: string): string | null {
	const header = message.split(/\r?\n/, 1)[0] ?? "";
	if (header.startsWith("Merge ")) return null;
	const match = HEADER.exec(header);
	if (!match) return `header must match "type(scope)!: description" with type in ${TYPES}`;
	if (header.length > MAX_HEADER) return `header longer than ${MAX_HEADER} characters`;
	const type = match[1] ?? "";
	if (branch !== undefined && RELEASE_BRANCH.test(branch) && !RELEASE_TYPES.has(type))
		return `release branch ${branch} only accepts fix, docs and chore (got ${type})`;
	return null;
}
