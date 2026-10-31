import { describe, expect, it } from "vitest";
import { bypassHeaders, debugApiProblems, errorsFrom, parseArgs, sameOrigin, withDebugParam } from "./lib";

describe("smoke lib", () => {
	it("fails a production deployment that exposes the debug API", () => {
		expect(debugApiProblems(false)).toEqual([]);
		expect(debugApiProblems(true)).toEqual(["debug API present in production"]);
	});

	it("probes the debug API with ?debug=1, keeping the other parameters", () => {
		expect(withDebugParam("https://grim-cubes.vercel.app/")).toBe(
			"https://grim-cubes.vercel.app/?debug=1",
		);
		expect(withDebugParam("https://x.app/?seed=42")).toBe("https://x.app/?seed=42&debug=1");
	});

	it("sends the Vercel bypass headers only when the secret is set", () => {
		expect(bypassHeaders({})).toEqual({});
		expect(bypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: "" })).toEqual({});
		expect(bypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: "s3cret" })).toEqual({
			"x-vercel-protection-bypass": "s3cret",
			"x-vercel-set-bypass-cookie": "true",
		});
	});

	it("matches origins strictly", () => {
		expect(sameOrigin("https://a.vercel.app/x.js", "https://a.vercel.app/")).toBe(true);
		expect(sameOrigin("https://cdn.example.com/x.js", "https://a.vercel.app/")).toBe(false);
		expect(sameOrigin("not a url", "https://a.vercel.app/")).toBe(false);
	});

	it("keeps console errors, ignoring warnings and the favicon", () => {
		const errors = errorsFrom([
			{ type: "log", text: "ready", url: "" },
			{ type: "warning", text: "gpu stall", url: "" },
			{ type: "error", text: "404", url: "http://x/favicon.ico" },
			{ type: "error", text: "boom", url: "" },
			{ type: "error", text: "Failed to load", url: "http://x/a.js" },
		]);
		expect(errors).toEqual(["boom", "Failed to load (http://x/a.js)"]);
	});

	it("requires an http(s) --url and defaults the output path", () => {
		expect(parseArgs(["--url", "http://localhost:4173"])).toEqual({
			url: "http://localhost:4173",
			out: "reports/smoke.png",
			timeoutMs: 30000,
		});
		expect(() => parseArgs([])).toThrow(/usage/);
		expect(() => parseArgs(["--url", "file:///etc/passwd"])).toThrow(/http/);
	});
});
