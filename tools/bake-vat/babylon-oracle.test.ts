import "@babylonjs/loaders/glTF/2.0";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { packGlb } from "../assets-build/glb";
import { bakeVat } from "./bake";
import { makeRootedRig } from "./rigFixture";

/**
 * Independent oracle: Babylon's own glTF loader and skeleton evaluate the same animation, and its
 * `getTransformMatrices` must equal the baked rows frame by frame (clip frame f is at f / 12 s).
 */
describe("bakeVat against the Babylon skeleton", () => {
	it.each(["single", "siblings"] as const)(
		"matches getTransformMatrices on a rig under transformed non-joint ancestors (%s)",
		async (variant) => {
			const doc = makeRootedRig(variant);
			const baked = bakeVat("rig", doc, ["walk", "attack"]);
			const glb = packGlb(await new NodeIO().writeJSON(doc));

			const engine = new NullEngine();
			const scene = new Scene(engine);
			new FreeCamera("camera", new Vector3(0, 0, -10), scene);
			const container = await LoadAssetContainerAsync(new Uint8Array(glb), scene, {
				pluginExtension: ".glb",
			});
			container.addAllToScene();
			const mesh = container.meshes.find((m) => m.skeleton);
			const skeleton = mesh?.skeleton;
			if (!mesh || !skeleton) throw new Error("loader produced no skinned mesh");

			let maxError = 0;
			let worldError = 0;
			let moved = false;
			for (const [clipName, range] of Object.entries(baked.meta.clips)) {
				const group = container.animationGroups.find((g) => g.name === clipName);
				const fps = group?.targetedAnimations[0]?.animation.framePerSecond;
				if (!group || !fps) throw new Error(`missing animation group ${clipName}`);
				for (let frame = range.from; frame <= range.to; frame++) {
					group.start(false, 1, group.from, group.to);
					group.goToFrame(group.from + ((frame - range.from) / 12) * fps);
					group.pause();
					scene.render();
					skeleton.prepare(true);
					const babylon = skeleton.getTransformMatrices(mesh);
					const row = frame * baked.meta.width * 4;
					for (let i = 0; i < baked.meta.boneCount * 16; i++) {
						maxError = Math.max(
							maxError,
							Math.abs((babylon[i] ?? 0) - (baked.data[row + i] ?? 0)),
						);
					}

					// World position of every vertex skinned two ways: with the baked rows and with Babylon's own
					// skeleton matrices (what a normal skinned mesh renders), both through the mesh world matrix.
					const bind = mesh.getVerticesData("position") ?? [];
					const indices = mesh.getVerticesData("matricesIndices") ?? [];
					const weights = mesh.getVerticesData("matricesWeights") ?? [];
					const world = mesh.getWorldMatrix();
					for (let v = 0; v < bind.length / 3; v++) {
						const p = new Vector3(bind[v * 3], bind[v * 3 + 1], bind[v * 3 + 2]);
						const viaVat = Vector3.Zero();
						for (let k = 0; k < 4; k++) {
							const weight = weights[v * 4 + k] ?? 0;
							if (weight === 0) continue;
							const joint = indices[v * 4 + k] ?? 0;
							const matrix = Matrix.FromArray(
								Array.from(baked.data.subarray(row + joint * 16, row + joint * 16 + 16)),
							);
							viaVat.addInPlace(Vector3.TransformCoordinates(p, matrix).scale(weight));
						}
						const viaSkeleton = Vector3.Zero();
						for (let k = 0; k < 4; k++) {
							const weight = weights[v * 4 + k] ?? 0;
							if (weight === 0) continue;
							const joint = indices[v * 4 + k] ?? 0;
							const matrix = Matrix.FromArray(
								Array.from(babylon.subarray(joint * 16, joint * 16 + 16)),
							);
							viaSkeleton.addInPlace(Vector3.TransformCoordinates(p, matrix).scale(weight));
						}
						const fromVat = Vector3.TransformCoordinates(viaVat, world);
						const fromSkeleton = Vector3.TransformCoordinates(viaSkeleton, world);
						worldError = Math.max(worldError, Vector3.Distance(fromVat, fromSkeleton));
						// The pose must actually move something, otherwise the comparison proves nothing.
						moved = moved || Vector3.Distance(viaVat, p) > 0.1;
					}
					group.stop();
				}
			}
			expect(maxError).toBeLessThan(1e-5);
			expect(worldError).toBeLessThan(1e-5);
			expect(moved).toBe(true);
			scene.dispose();
			engine.dispose();
		},
	);
});
