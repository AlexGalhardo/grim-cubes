import { expect, test } from "vitest";
import { lintCommitMessage } from "./lint";

test("accepts conventional headers", () => {
	expect(lintCommitMessage("feat(core): add logger")).toBeNull();
	expect(lintCommitMessage("fix!: drop old api\n\nbody")).toBeNull();
	expect(lintCommitMessage("Merge branch 'x'")).toBeNull();
});

test("rejects other headers", () => {
	expect(lintCommitMessage("bad message")).not.toBeNull();
	expect(lintCommitMessage("feat(Core): x")).not.toBeNull();
	expect(lintCommitMessage("feat:")).not.toBeNull();
});

test("a release branch rejects feat and accepts fix, docs and chore", () => {
	const branch = "release/1.0";
	expect(lintCommitMessage("feat: add a boss", branch)).not.toBeNull();
	expect(lintCommitMessage("feat(ui): add a boss", branch)).not.toBeNull();
	expect(lintCommitMessage("refactor: tidy", branch)).not.toBeNull();
	expect(lintCommitMessage("fix: stop the leak", branch)).toBeNull();
	expect(lintCommitMessage("docs: note the rc rule", branch)).toBeNull();
	expect(lintCommitMessage("chore: bump the lockfile", branch)).toBeNull();
	expect(lintCommitMessage("feat: add a boss", "main")).toBeNull();
});
