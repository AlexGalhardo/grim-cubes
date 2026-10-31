const NEEDS_ENTRY = /^(feat|fix)(\([a-z0-9][a-z0-9-]*\))?!?: /;
export const SKIP_LABEL = "skip-changelog";

/** Text of the `## [Unreleased]` section, up to the next `## ` heading. */
export function unreleasedSection(changelog: string): string {
	const match = /^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## |^\[[^\]]+\]: |(?![\s\S]))/m.exec(changelog);
	return match?.[1] ?? "";
}

/** Returns an error message, or null when the PR passes. */
export function checkChangelog(input: {
	subjects: string[];
	baseChangelog: string;
	headChangelog: string;
	labels: string[];
}): string | null {
	if (input.labels.includes(SKIP_LABEL)) return null;
	if (!input.subjects.some((s) => NEEDS_ENTRY.test(s))) return null;
	const before = new Set(unreleasedSection(input.baseChangelog).split(/\r?\n/));
	const added = unreleasedSection(input.headChangelog)
		.split(/\r?\n/)
		.some((line) => line.startsWith("- ") && !before.has(line));
	if (added) return null;
	return `a feat/fix commit needs a new item under [Unreleased] in CHANGELOG.md (or the "${SKIP_LABEL}" label)`;
}
