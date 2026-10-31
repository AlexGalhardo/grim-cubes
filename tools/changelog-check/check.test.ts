import { expect, test } from "vitest";
import { checkChangelog, unreleasedSection } from "./check";

const base = `# Changelog

## [Unreleased]

### Added

- **core:** Old item

## [0.1.0] - 2026-10-31

### Added

- **core:** Released item

[Unreleased]: https://example.test/compare/v0.1.0...HEAD
`;
const withNew = base.replace("- **core:** Old item", "- **core:** Old item\n- **ui:** New item");
const inReleased = base.replace("- **core:** Released item", "- **core:** Released item\n- **ui:** New item");
const run = (subjects: string[], head: string, labels: string[] = []): string | null =>
	checkChangelog({ subjects, baseChangelog: base, headChangelog: head, labels });

test("unreleasedSection stops at the next version heading", () => {
	const section = unreleasedSection(base);
	expect(section).toContain("Old item");
	expect(section).not.toContain("Released item");
});

test("feat without a new Unreleased item fails", () => {
	expect(run(["feat(ui): add x"], base)).not.toBeNull();
	expect(run(["fix: y"], inReleased)).not.toBeNull();
});

test("feat with a new Unreleased item passes", () => {
	expect(run(["feat(ui): add x"], withNew)).toBeNull();
});

test("other commit types and the skip label are exempt", () => {
	expect(run(["docs: x", "chore(ci): y", "test: z"], base)).toBeNull();
	expect(run(["feat: x"], base, ["skip-changelog"])).toBeNull();
});
