import "@babylonjs/loaders/glTF/2.0";
import { readFileSync } from "node:fs";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { NodeIO } from "@gltf-transform/core";
import { describe, expect, it, vi } from "vitest";
import { bbmodelToDocument, parseBbmodel } from "../assets-build/bbmodel";
import { packGlb } from "../assets-build/glb";
import { rigidSkin } from "../assets-build/rigidSkin";
import { bakeVat } from "./bake";

// Eight enemy types, each baked and compared frame by frame with the Babylon skeleton: heavier than the default 5 s.
vi.setConfig({ testTimeout: 30_000 });

const enemies = JSON.parse(readFileSync(new URL("../../data/enemies.json", import.meta.url), "utf8")) as {
	id: string;
}[];

/**
 * A-02-02b oracle on the real generated models: for every enemy of data/enemies.json the VAT rows equal Babylon's own
 * `getTransformMatrices` for every frame of the five clips (error < 1e-5).
 */
describe("bakeVat against the Babylon skeleton, per enemy type", () => {
	it("covers all 8 enemy types", () => {
		expect(enemies.length).toBe(8);
	});

	it.each(enemies.map((e) => e.id))("%s", async (id) => {
		const source = readFileSync(
			new URL(`../../assets/src/models/enemies/${id}.bbmodel`, import.meta.url),
			"utf8",
		);
		const doc = bbmodelToDocument(id, "enemies", parseBbmodel(id, source));
		rigidSkin(id, doc, { skin: true });
		const baked = bakeVat(id, doc);
		const glb = packGlb(await new NodeIO().writeJSON(doc));

		const engine = new NullEngine();
		const scene = new Scene(engine);
		new FreeCamera("camera", new Vector3(0, 0, -10), scene);
		const container = await LoadAssetContainerAsync(new Uint8Array(glb), scene, {
			pluginExtension: ".glb",
		});
		container.addAllToScene();
		const skeleton = container.meshes.find((m) => m.skeleton)?.skeleton;
		const mesh = container.meshes.find((m) => m.skeleton);
		if (!mesh || !skeleton) throw new Error(`${id}: loader produced no skinned mesh`);

		let maxError = 0;
		let frames = 0;
		// The comparison proves nothing on a still rig: the walk clip must differ between its frames.
		let walkMoved = false;
		let firstWalk: Float32Array | null = null;
		for (const [clipName, range] of Object.entries(baked.meta.clips)) {
			const group = container.animationGroups.find((g) => g.name === clipName);
			const fps = group?.targetedAnimations[0]?.animation.framePerSecond;
			if (!group || !fps) throw new Error(`${id}: missing animation group ${clipName}`);
			for (let frame = range.from; frame <= range.to; frame++) {
				group.start(false, 1, group.from, group.to);
				group.goToFrame(group.from + ((frame - range.from) / 12) * fps);
				group.pause();
				scene.render();
				skeleton.prepare(true);
				const babylon = skeleton.getTransformMatrices(mesh);
				const row = frame * baked.meta.width * 4;
				for (let i = 0; i < baked.meta.boneCount * 16; i++) {
					maxError = Math.max(maxError, Math.abs((babylon[i] ?? 0) - (baked.data[row + i] ?? 0)));
				}
				if (clipName === "walk") {
					const rowData = baked.data.slice(row, row + baked.meta.boneCount * 16);
					if (!firstWalk) firstWalk = rowData;
					else if (rowData.some((v, i) => Math.abs(v - (firstWalk?.[i] ?? 0)) > 1e-3))
						walkMoved = true;
				}
				group.stop();
				frames++;
			}
		}
		expect(Object.keys(baked.meta.clips).sort()).toEqual(["attack", "death", "hit", "idle", "walk"]);
		expect(frames).toBeGreaterThan(10);
		expect(maxError).toBeLessThan(1e-5);
		expect(walkMoved).toBe(true);
		scene.dispose();
		engine.dispose();
	});
});
