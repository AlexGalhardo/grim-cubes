import { describe, expect, it } from "vitest";

describe("@gc/game", () => {
	it("runs under the node environment", () => {
		expect(typeof document).toBe("undefined");
	});
});
