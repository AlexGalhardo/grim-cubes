import "@babylonjs/core/Culling/ray";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { roundsData } from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { CAMERA, createCamera } from "./camera";

/** Ground point (y = 0) under the pixel (x, y). */
function groundAt(
	scene: Scene,
	camera: FreeCamera | ReturnType<typeof createCamera>,
	x: number,
	y: number,
): Vector3 {
	const ray = scene.createPickingRay(x, y, Matrix.Identity(), camera);
	const t = -ray.origin.y / ray.direction.y;
	return ray.origin.add(ray.direction.scale(t));
}

describe("camera", () => {
	it("takes its angles from data/render.json: 55 degrees of elevation is beta pi/2 - 55 degrees", () => {
		expect(CAMERA.beta).toBeCloseTo(0.611, 3);
		expect(CAMERA.radius).toBe(28.5);
		expect(CAMERA.radiusMobile).toBe(25.5);
		expect(CAMERA.followRate).toBe(8);
	});

	it("sees the ground trapezoid of GDD §5 (depth 19.2 u, widths 22.7 / 26.9 / 33.2 u, ±3%)", () => {
		const { engine, dispose } = createNullEngine({ width: 1920, height: 1080 });
		const scene = new Scene(engine);
		const camera = createCamera(scene, Vector3.Zero());
		const [width, height] = [1920, 1080];

		const bottomLeft = groundAt(scene, camera, 0, height);
		const bottomRight = groundAt(scene, camera, width, height);
		const midLeft = groundAt(scene, camera, 0, height / 2);
		const midRight = groundAt(scene, camera, width, height / 2);
		const topLeft = groundAt(scene, camera, 0, 0);
		const topRight = groundAt(scene, camera, width, 0);
		const bottomCenter = groundAt(scene, camera, width / 2, height);
		const topCenter = groundAt(scene, camera, width / 2, 0);

		const within = (actual: number, expected: number): boolean =>
			Math.abs(actual - expected) / expected <= 0.03;
		const measured = {
			depth: topCenter.z - bottomCenter.z,
			bottomWidth: Math.abs(bottomRight.x - bottomLeft.x),
			heroWidth: Math.abs(midRight.x - midLeft.x),
			topWidth: Math.abs(topRight.x - topLeft.x),
		};
		expect(
			{
				depth: within(measured.depth, 19.2),
				bottomWidth: within(measured.bottomWidth, 22.7),
				heroWidth: within(measured.heroWidth, 26.9),
				topWidth: within(measured.topWidth, 33.2),
			},
			JSON.stringify(measured),
		).toEqual({ depth: true, bottomWidth: true, heroWidth: true, topWidth: true });
		// The hero sits at the vertical centre of the screen (the target is the middle pixel).
		const centre = groundAt(scene, camera, width / 2, height / 2);
		expect(Math.hypot(centre.x, centre.z)).toBeLessThan(0.01);
		scene.dispose();
		dispose();
	});

	it("keeps the mobile radius shorter (depth 17.2 u at radius 25.5)", () => {
		const { engine, dispose } = createNullEngine({ width: 1920, height: 1080 });
		const scene = new Scene(engine);
		const camera = createCamera(scene, Vector3.Zero(), true);
		const depth = groundAt(scene, camera, 960, 0).z - groundAt(scene, camera, 960, 1080).z;
		expect(Math.abs(depth - 17.2) / 17.2).toBeLessThanOrEqual(0.03);
		scene.dispose();
		dispose();
	});

	// GDD 6.4: enemies are born off-screen. The farthest ground the camera shows is a top corner, so the whole
	// spawn ring has to start beyond it on every screen target (D31).
	it.each([
		{ name: "1920x1080", width: 1920, height: 1080, mobile: false },
		{ name: "2560x1440", width: 2560, height: 1440, mobile: false },
		{ name: "896x414", width: 896, height: 414, mobile: true },
		{ name: "800x360", width: 800, height: 360, mobile: true },
	])("keeps the spawn ring off-screen at $name", ({ width, height, mobile }) => {
		const { engine, dispose } = createNullEngine({ width, height });
		const scene = new Scene(engine);
		const camera = createCamera(scene, Vector3.Zero(), mobile);
		const corners = [
			groundAt(scene, camera, 0, 0),
			groundAt(scene, camera, width, 0),
			groundAt(scene, camera, 0, height),
			groundAt(scene, camera, width, height),
		];
		const farthest = Math.max(...corners.map((corner) => Math.hypot(corner.x, corner.z)));
		expect(farthest).toBeLessThan(roundsData.spawn.ringMin);
		scene.dispose();
		dispose();
	});
});
