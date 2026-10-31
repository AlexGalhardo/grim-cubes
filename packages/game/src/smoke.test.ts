import { describe, expect, it } from "vitest";

describe("@gc/game", () => {
	it("runs under the node environment", () => {
		expect("document" in globalThis).toBe(false);
	});
});
