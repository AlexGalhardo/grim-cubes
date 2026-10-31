import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSbom, checksumsText, parseBunLock, parseDirectDeps, sha256 } from "./lib";

const LOCK = `{
  "lockfileVersion": 2,
  "workspaces": { "": { "name": "demo", }, },
  "packages": {
    "@gc/core": ["@gc/core@workspace:packages/core"],
    "react": ["react@19.3.1", "", { "dependencies": {}, }, "sha512-AAAA"],
    "@scope/pkg": ["@scope/pkg@1.2.3", "", {}, "sha512-AAAA"],
  },
}
`;
const PKG = JSON.stringify({
	name: "demo",
	version: "0.1.0",
	dependencies: { react: "19.3.1" },
	devDependencies: { "@scope/pkg": "1.2.3" },
});

describe("sbom", () => {
	it("parses the JSONC lock and skips workspace packages", () => {
		expect(parseBunLock(LOCK).map((p) => `${p.name}@${p.version}`)).toEqual([
			"@scope/pkg@1.2.3",
			"react@19.3.1",
		]);
	});

	it("builds a CycloneDX bom with exact versions and purls", () => {
		const bom = buildSbom(parseDirectDeps(PKG), parseBunLock(LOCK)) as {
			bomFormat: string;
			components: Array<{ purl: string; version: string }>;
		};
		expect(bom.bomFormat).toBe("CycloneDX");
		expect(bom.components.map((c) => c.purl)).toEqual([
			"pkg:npm/%40scope/pkg@1.2.3",
			"pkg:npm/react@19.3.1",
		]);
	});

	it("is deterministic", () => {
		const build = (): string => JSON.stringify(buildSbom(parseDirectDeps(PKG), parseBunLock(LOCK)));
		expect(build()).toBe(build());
	});

	it("lists every package.json dependency of the repo with its exact version", () => {
		const root = parseDirectDeps(readFileSync("package.json", "utf8"));
		const bom = buildSbom(root, parseBunLock(readFileSync("bun.lock", "utf8"))) as {
			components: Array<{ name: string; version: string }>;
		};
		const listed = new Map(bom.components.map((c) => [c.name, c.version]));
		for (const [name, version] of Object.entries({ ...root.dependencies, ...root.devDependencies })) {
			if (version.startsWith("workspace:")) continue;
			expect(listed.get(name), name).toBe(version);
		}
	});

	it("writes sha256sum-style checksums sorted by name", () => {
		const text = checksumsText([
			{ name: "b.txt", data: "b" },
			{ name: "a.txt", data: "a" },
		]);
		expect(text).toBe(`${sha256("a")}  a.txt\n${sha256("b")}  b.txt\n`);
	});

	it("emits unique bom-refs even when the lock repeats a name@version", () => {
		const dup = LOCK.replace(
			'"@scope/pkg": [',
			'"x/react": ["react@19.3.1", "", {}, "sha512-AAAA"],\n    "@scope/pkg": [',
		);
		expect(parseBunLock(dup).filter((p) => p.name === "react")).toHaveLength(1);

		const bom = buildSbom(
			parseDirectDeps(readFileSync("package.json", "utf8")),
			parseBunLock(readFileSync("bun.lock", "utf8")),
		) as { components: Array<{ "bom-ref": string }> };
		const refs = bom.components.map((c) => c["bom-ref"]);
		expect(new Set(refs).size).toBe(refs.length);
	});

	it("sorts by code unit, not by locale", () => {
		const lock = '{"packages":{"b":["b@1.0.0"],"B":["B@1.0.0"],"a":["a@1.0.0"]}}';
		expect(parseBunLock(lock).map((p) => p.name)).toEqual(["B", "a", "b"]);
	});
});
