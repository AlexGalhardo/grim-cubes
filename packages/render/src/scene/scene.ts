import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { CAMERA, createCamera } from "./camera";
import { LIGHTING, PALETTE } from "./palette";

export const GROUND_SIZE = 16;
export const HERO_SIZE = 1;

export interface GameScene {
	readonly scene: Scene;
	readonly camera: ArcRotateCamera;
	/** The hero cube; its position is what the camera and the prop fade look at. */
	readonly hero: Mesh;
	setHeroPosition(x: number, z: number): void;
	/** Cosmetic skin (GDD 20, round 50): recolors the hero cube with a theme.css token name such as "iron-black". */
	setHeroTint(token: string): void;
	/** The world origin moved by (dx, dz): static geometry shifts by the opposite amount. */
	shiftWorld(dx: number, dz: number): void;
	/** Turns the camera rim light on or off (a third light costs the lit materials ~15% of a frame; SDD 14). */
	setRim(on: boolean): void;
	dispose(): void;
}

export function flatMaterial(scene: Scene, name: string, hex: string): StandardMaterial {
	const material = new StandardMaterial(name, scene);
	material.diffuseColor = Color3.FromHexString(hex);
	material.specularColor = Color3.Black();
	material.freeze();
	return material;
}

export function createGameScene(engine: Engine | NullEngine, mobile = false): GameScene {
	const scene = new Scene(engine);
	scene.clearColor = Color4.FromColor3(Color3.FromHexString(PALETTE.night), 1);
	scene.fogMode = Scene.FOGMODE_LINEAR;
	scene.fogStart = LIGHTING.fogStart;
	scene.fogEnd = LIGHTING.fogEnd;
	scene.fogColor = Color3.FromHexString(PALETTE.night);

	const sun = new DirectionalLight("sun", new Vector3(...LIGHTING.sunDirection), scene);
	sun.diffuse = Color3.FromHexString(PALETTE.sun);
	sun.specular = Color3.Black();
	sun.intensity = LIGHTING.sunIntensity;

	const hemi = new HemisphericLight("hemi", Vector3.Up(), scene);
	hemi.diffuse = Color3.FromHexString(LIGHTING.hemiSky);
	hemi.groundColor = Color3.FromHexString(PALETTE.shadow);
	hemi.specular = Color3.Black();
	hemi.intensity = LIGHTING.hemiIntensity;

	// Rim: shines along the camera's view so every model gets a lit front, whatever the sun does.
	// The camera sits at alpha -PI/2 (south of the hero) and looks down at (PI/2 - beta) of elevation.
	const elevation = Math.PI / 2 - CAMERA.beta;
	const rim = new DirectionalLight("rim", new Vector3(0, -Math.sin(elevation), Math.cos(elevation)), scene);
	rim.diffuse = Color3.FromHexString(PALETTE.bone);
	rim.specular = Color3.Black();
	rim.intensity = LIGHTING.rimIntensity;

	const ground: Mesh = CreateGround("ground", { width: GROUND_SIZE, height: GROUND_SIZE }, scene);
	ground.material = flatMaterial(scene, "ground", PALETTE.night2);
	ground.freezeWorldMatrix();

	const hero: Mesh = CreateBox("hero", { size: HERO_SIZE }, scene);
	hero.material = flatMaterial(scene, "hero", PALETTE.bone);
	hero.position.y = HERO_SIZE / 2;

	const camera = createCamera(scene, new Vector3(0, HERO_SIZE / 2, 0), mobile);

	return {
		scene,
		camera,
		hero,
		shiftWorld(dx, dz) {
			ground.unfreezeWorldMatrix();
			ground.position.x -= dx;
			ground.position.z -= dz;
			ground.freezeWorldMatrix();
		},
		setHeroTint(token) {
			const key = token.replace(/-([a-z0-9])/g, (_, c: string) =>
				c.toUpperCase(),
			) as keyof typeof PALETTE;
			const hex = PALETTE[key];
			if (hex === undefined) throw new RangeError(`unknown palette token "${token}"`);
			const material = hero.material;
			if (!(material instanceof StandardMaterial)) return;
			material.unfreeze();
			material.diffuseColor = Color3.FromHexString(hex);
			material.freeze();
		},
		setHeroPosition(x, z) {
			hero.position.x = x;
			hero.position.z = z;
		},
		setRim(on) {
			rim.setEnabled(on);
		},
		dispose: () => scene.dispose(),
	};
}
