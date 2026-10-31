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
