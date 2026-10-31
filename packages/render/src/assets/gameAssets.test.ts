// Registered up front: loading the glTF plugin on first use counts against the test timeout under CPU load.
import "@babylonjs/loaders/glTF";
import { Scene } from "@babylonjs/core/scene";
import { Document, NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import type { VatMeta } from "../vat/loader";
import { type AssetManifest, loadGameAssets } from "./gameAssets";

async function glbDataUrl(): Promise<string> {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const position = doc
		.createAccessor()
		.setType("VEC3")
		.setBuffer(buffer)
		.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
	const node = doc
		.createNode("n")
		.setMesh(doc.createMesh("m").addPrimitive(doc.createPrimitive().setAttribute("POSITION", position)));
	doc.createScene().addChild(node);
	const bytes = await new NodeIO().writeBinary(doc);
	return `data:model/gltf-binary;base64,${Buffer.from(bytes).toString("base64")}`;
}

const meta: VatMeta = {
	format: "rgba32f",
	fps: 12,
	boneCount: 1,
	width: 8,
	height: 2,
	clips: { walk: { from: 0, to: 1 } },
};

describe("loadGameAssets", () => {
	it("loads models and VATs from the manifest and skips what is missing", async () => {
		const model = await glbDataUrl();
		const manifest: AssetManifest = {
			version: "0.0.0",
			entries: {
				husk: { url: model, hash: "h", bytes: 1, kind: "model", group: "core" },
				vat_husk: {
					url: "vat/husk.bin",
					meta: "vat/husk.json",
					hash: "h",
					bytes: 1,
					kind: "vat",
					group: "core",
				},
				prop_a: { url: model, hash: "h", bytes: 1, kind: "model", group: "core" },
			},
		};
		const requested: string[] = [];
		const fetchFn = async (url: string): Promise<Response> => {
			requested.push(url);
			if (url === "/assets/manifest.json") return Response.json(manifest);
			if (url === "/assets/vat/husk.json") return Response.json(meta);
			if (url === "/assets/vat/husk.bin") return new Response(new Float32Array(8 * 2 * 4).buffer);
			return new Response("missing", { status: 404 });
		};

		const warnings: string[] = [];
		const { engine, dispose } = createNullEngine();
		const scene = new Scene(engine);
		const loaded = await loadGameAssets(scene, {
			baseUrl: "",
			enemyIds: ["wail", "husk"],
			propIds: ["prop_a", "prop_missing"],
			warn: (message) => warnings.push(message),
			fetchFn: async (url) =>
				fetchFn(url === "manifest.json" ? "/assets/manifest.json" : `/assets/${url}`),
		});

		// "wail" has no VAT: it keeps its slot (the horde indexes by EnemyType id) and draws the first model available.
		expect(loaded.enemies.map((e) => e.id)).toEqual(["wail", "husk"]);
		expect(warnings).toEqual([
			'enemy "wail" has no model or VAT in the manifest, drawing "husk" instead',
		]);
		expect(loaded.enemies[0]?.mesh).not.toBe(loaded.enemies[1]?.mesh);
		expect(loaded.enemies[1]?.vat.meta.clips.walk).toEqual({ from: 0, to: 1 });
		expect([...loaded.props.keys()]).toEqual(["prop_a"]);
		expect(loaded.props.get("prop_a")?.getTotalVertices()).toBe(3);
		expect(requested).not.toContain("/assets/vat/wail.json");
		scene.dispose();
		dispose();
	});

	it("rejects when the manifest is missing", async () => {
		const { engine, dispose } = createNullEngine();
		const scene = new Scene(engine);
		await expect(
			loadGameAssets(scene, {
				baseUrl: "/assets/",
				enemyIds: [],
				propIds: [],
				fetchFn: async () => new Response("nope", { status: 404 }),
			}),
		).rejects.toThrow("404");
		scene.dispose();
		dispose();
	});
});
