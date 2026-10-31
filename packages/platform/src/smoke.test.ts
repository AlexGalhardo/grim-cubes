import { describe, expect, it } from "vitest";

describe("@gc/platform", () => {
	it("runs under the node environment", () => {
		expect(typeof document).toBe("undefined");
	});
});
