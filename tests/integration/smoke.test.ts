import { describe, expect, it } from "vitest";

describe("integration", () => {
	it("is picked up by the integration project", () => {
		expect(typeof document).toBe("undefined");
	});
});
