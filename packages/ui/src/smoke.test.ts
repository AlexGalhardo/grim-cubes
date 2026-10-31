import { describe, expect, it } from "vitest";

describe("@gc/ui", () => {
	it("runs under the jsdom environment", () => {
		const el = document.createElement("div");
		el.textContent = "grim";
		expect(el.outerHTML).toBe("<div>grim</div>");
	});
});
