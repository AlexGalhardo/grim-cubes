import { describe, expect, it } from "vitest";

describe("@gc/core", () => {
	it("runs under the node environment", () => {
		expect(typeof document).toBe("undefined");
	});
});
