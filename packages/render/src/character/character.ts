import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

export interface CharacterOptions {
	/** Seconds a clip takes to fade in while the previous one fades out (SDD 09: 0.1). */
	blendSeconds: number;
	/** Speed (u/s) at which the locomotion clip was authored: `speedRatio = |v| / refSpeed`. */
	refSpeed: number;
	/** Clip played while standing still. */
	idle: string;
	/** Clip played while moving. */
	move: string;
}

export interface Character {
	/** Scene node to place: position (x, 0, z) and yaw in the game's convention (0 looks along +z). */
	readonly holder: TransformNode;
	setPose(x: number, z: number, yaw: number): void;
	/** Idle or locomotion by speed; the move clip runs at `|v| / refSpeed`. Ignored while a one-shot clip plays. */
	setSpeed(speed: number): void;
	/** Plays a clip once over the current pose, then goes back to idle/locomotion. */
	playOnce(clip: string): boolean;
	/** Plays a clip and keeps its last frame (death, victory). */
	playFinal(clip: string): boolean;
	/** Advances the blend by `dt` seconds. */
	update(dt: number): void;
	/** Current blend weight of a clip, 0..1. */
	weight(clip: string): number;
	speedRatio(clip: string): number;
	/** A named node from the model (`weapon_socket`, `hit_socket`), or null. */
	socket(name: string): TransformNode | null;
	/** Parents a weapon mesh to `weapon_socket`; null detaches the current one. */
	attachWeapon(mesh: AbstractMesh | null): void;
	setVisible(visible: boolean): void;
	dispose(): void;
}

const STILL = 0.05;

export async function loadCharacter(
	scene: Scene,
	url: string,
	options: CharacterOptions,
): Promise<Character> {
	await import("@babylonjs/loaders/glTF");
	const result = await ImportMeshAsync(url, scene, { pluginExtension: ".glb" });
	const groups = new Map<string, AnimationGroup>();
	for (const group of result.animationGroups) {
		group.stop();
		groups.set(group.name, group);
	}
	const sockets = new Map<string, TransformNode>();
	for (const node of result.transformNodes) sockets.set(node.name, node);
	const importRoot = result.meshes.find((m) => m.name === "__root__") ?? result.meshes[0] ?? null;

	// The loader's `__root__` carries the handedness mirror; the holder is a plain node in game coordinates.
	const holder = new TransformNode("character", scene);
	if (importRoot) importRoot.parent = holder;

	const weights = new Map<string, number>();
	let current = "";
	let previous = "";
	let blend = 1;
	let locomotion = options.idle;
	let oneShot = "";
	let finalClip = "";
	let weapon: AbstractMesh | null = null;

	function start(clip: string, loop: boolean): boolean {
		const group = groups.get(clip);
		if (!group) return false;
		if (current === clip && group.isPlaying) return true;
		if (previous && previous !== current) stop(previous);
		previous = current;
		current = clip;
		blend = 0;
		weights.set(clip, 0);
		group.start(loop, 1, group.from, group.to, false);
		group.setWeightForAllAnimatables(0);
		return true;
	}

	function stop(clip: string): void {
		groups.get(clip)?.stop();
		weights.set(clip, 0);
	}

	function setWeights(): void {
		const k = options.blendSeconds > 0 ? Math.min(1, blend / options.blendSeconds) : 1;
		if (current) {
			weights.set(current, k);
			groups.get(current)?.setWeightForAllAnimatables(k);
		}
		if (previous && previous !== current) {
			weights.set(previous, 1 - k);
			groups.get(previous)?.setWeightForAllAnimatables(1 - k);
			if (k >= 1) {
				stop(previous);
				previous = "";
			}
		}
	}

	groups.get(options.idle)?.start(true);
	current = options.idle;
	weights.set(options.idle, 1);

	for (const group of groups.values()) {
		group.onAnimationGroupEndObservable.add(() => {
			if (group.name === oneShot && group.name !== finalClip) {
				oneShot = "";
				start(locomotion, true);
			}
		});
	}

	return {
		holder,
		setPose(x, z, yaw): void {
			holder.position.set(x, 0, z);
			holder.rotation.y = yaw;
		},
		setSpeed(speed): void {
			const moving = speed > STILL;
			locomotion = moving ? options.move : options.idle;
			if (!oneShot && !finalClip) start(locomotion, true);
			// After `start`: it restarts the group at speed 1.
			const move = groups.get(options.move);
			if (move) move.speedRatio = moving ? speed / options.refSpeed : 1;
		},
		playOnce(clip): boolean {
			if (finalClip) return false;
			if (!start(clip, false)) return false;
			oneShot = clip;
			return true;
		},
		playFinal(clip): boolean {
			if (!start(clip, false)) return false;
			oneShot = clip;
			finalClip = clip;
			return true;
		},
		update(dt): void {
			blend += dt;
			setWeights();
		},
		weight(clip): number {
			return weights.get(clip) ?? 0;
		},
		speedRatio(clip): number {
			return groups.get(clip)?.speedRatio ?? 0;
		},
		socket(name): TransformNode | null {
			return sockets.get(name) ?? null;
		},
		attachWeapon(mesh): void {
			if (weapon) weapon.parent = null;
			weapon = mesh;
			const socket = sockets.get("weapon_socket");
			if (mesh && socket) mesh.parent = socket;
		},
		setVisible(visible): void {
			holder.setEnabled(visible);
		},
		dispose(): void {
			for (const group of groups.values()) group.dispose();
			holder.dispose(false, true);
		},
	};
}
