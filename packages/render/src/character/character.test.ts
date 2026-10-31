// Registered up front: loading the glTF plugin on first use counts against the test timeout under CPU load.
import "@babylonjs/loaders/glTF";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Document, NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { loadCharacter } from "./character";
import { createPortrait } from "./portrait";

async function characterGlb(): Promise<string> {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const position = doc
		.createAccessor()
		.setType("VEC3")
		.setBuffer(buffer)
		.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
	const mesh = doc.createMesh("m").addPrimitive(doc.createPrimitive().setAttribute("POSITION", position));
	const socket = doc.createNode("weapon_socket").setTranslation([0.5, 1, 0]);
	const hit = doc.createNode("hit_socket");
	const body = doc.createNode("body").setMesh(mesh).addChild(socket).addChild(hit);
	const root = doc.createNode("root").addChild(body);
	doc.createScene().addChild(root);
	for (const name of ["idle", "run", "attack_melee", "death"]) {
		const input = doc
			.createAccessor()
			.setType("SCALAR")
			.setBuffer(buffer)
			.setArray(new Float32Array([0, 1]));
		const output = doc
			.createAccessor()
			.setType("VEC3")
			.setBuffer(buffer)
			.setArray(new Float32Array([0, 0, 0, 0, 1, 0]));
		const sampler = doc
			.createAnimationSampler()
			.setInput(input)
			.setOutput(output)
			.setInterpolation("LINEAR");
		const channel = doc
			.createAnimationChannel()
			.setTargetNode(body)
			.setTargetPath("translation")
			.setSampler(sampler);
		doc.createAnimation(name).addSampler(sampler).addChannel(channel);
	}
	const bytes = await new NodeIO().writeBinary(doc);
	return `data:model/gltf-binary;base64,${Buffer.from(bytes).toString("base64")}`;
}

const options = { blendSeconds: 0.1, refSpeed: 4, idle: "idle", move: "run" };

async function setup() {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const character = await loadCharacter(game.scene, await characterGlb(), options);
	return { game, character, dispose };
}

describe("character rig", () => {
	it("parents the weapon to weapon_socket and exposes hit_socket", async () => {
		const { game, character, dispose } = await setup();
		const sword = CreateBox("sword", { size: 0.2 }, game.scene);
		character.attachWeapon(sword);
		expect(sword.parent?.name).toBe("weapon_socket");
		expect(character.socket("hit_socket")).not.toBeNull();
		character.attachWeapon(null);
		expect(sword.parent).toBeNull();
		dispose();
	});

	it("blends 0.1 s: weight is intermediate at 0.05 s and complete at 0.1 s", async () => {
		const { character, dispose } = await setup();
		expect(character.weight("idle")).toBe(1);
		character.setSpeed(4);
		character.update(0.05);
		expect(character.weight("run")).toBeCloseTo(0.5, 5);
		expect(character.weight("idle")).toBeCloseTo(0.5, 5);
		character.update(0.06);
		expect(character.weight("run")).toBe(1);
		expect(character.weight("idle")).toBe(0);
		dispose();
	});

	it("scales the move clip with speed: speedRatio = |v| / refSpeed within 5%", async () => {
		const { character, dispose } = await setup();
		for (const speed of [1, 2.5, 4, 6]) {
			character.setSpeed(speed);
			expect(Math.abs(character.speedRatio("run") - speed / options.refSpeed)).toBeLessThanOrEqual(
				0.05 * (speed / options.refSpeed),
			);
		}
		dispose();
	});

	it("plays a one-shot over the movement and keeps a final clip", async () => {
		const { character, dispose } = await setup();
		expect(character.playOnce("attack_melee")).toBe(true);
		expect(character.playOnce("missing")).toBe(false);
		character.update(0.2);
		expect(character.weight("attack_melee")).toBe(1);
		expect(character.playFinal("death")).toBe(true);
		character.setSpeed(4);
		character.update(0.2);
		expect(character.weight("death")).toBe(1);
		expect(character.playOnce("attack_melee")).toBe(false);
		dispose();
	});

	it("places the holder in game coordinates", async () => {
		const { character, dispose } = await setup();
		character.setPose(3, -2, 0.5);
		expect(character.holder.position.x).toBe(3);
		expect(character.holder.position.z).toBe(-2);
		expect(character.holder.rotation.y).toBe(0.5);
		dispose();
	});

	it("leaves a final clip on revive and goes back to idle", async () => {
		const { character, dispose } = await setup();
		character.playFinal("death");
		character.update(0.2);
		expect(character.weight("death")).toBe(1);
		character.clearFinal();
		character.update(0.2);
		expect(character.weight("death")).toBe(0);
		expect(character.weight("idle")).toBe(1);
		expect(character.playOnce("attack_melee")).toBe(true);
		dispose();
	});

	it("fades the model and lifts the holder", async () => {
		const { character, dispose } = await setup();
		character.setAlpha(0.15);
		const meshes = character.holder.getChildMeshes().filter((m) => m.getTotalVertices() > 0);
		expect(meshes.length).toBeGreaterThan(0);
		for (const m of meshes) expect(m.visibility).toBeCloseTo(0.15, 5);
		character.setLift(2);
		character.setPose(1, 2, 0);
		expect(character.holder.position.y).toBe(2);
		dispose();
	});

	it("draws a portrait through an engine view and releases it on stop", async () => {
		const { game, character, dispose } = await setup();
		const canvas = {} as HTMLCanvasElement;
		const engine = game.scene.getEngine();
		const registered: unknown[] = [];
		engine.registerView = ((c: HTMLCanvasElement) => {
			registered.push(c);
			return {} as never;
		}) as typeof engine.registerView;
		engine.unRegisterView = ((c: HTMLCanvasElement) => {
			registered.splice(registered.indexOf(c), 1);
			return engine;
		}) as typeof engine.unRegisterView;
		const portrait = createPortrait(game, canvas, character);
		portrait.start();
		portrait.start();
		expect(registered).toEqual([canvas]);
		expect(portrait.running).toBe(true);
		const camera = game.scene.getCameraByName("portrait");
		expect(camera?.layerMask).not.toBe(game.camera.layerMask);
		expect(
			character.holder.getChildMeshes().every((m) => (m.layerMask & game.camera.layerMask) !== 0),
		).toBe(true);
		portrait.stop();
		expect(registered).toEqual([]);
		expect(game.scene.getCameraByName("portrait")).toBeNull();
		dispose();
	});
});
