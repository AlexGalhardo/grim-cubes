import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { EventType } from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface EliteView {
	/** Handles EliteIncoming / EliteSpawned / EliteEscaped / ChestDropped / ChestOpened. */
	onEvent(type: number, a: number, b: number, c: number): void;
	/** The world origin moved by (dx, dz). */
	shift(dx: number, dz: number): void;
	/** `heroX`/`heroZ` in scene coordinates; drives the edge marker and picks the chest the hero opened. */
	update(seconds: number, heroX: number, heroZ: number): void;
	readonly chests: number;
	/** Scene x, z of chest `i`, or undefined. */
	chestAt(i: number): { x: number; z: number } | undefined;
	/** Scene x of the instance drawn for the marker (the last one written). */
	readonly markerDrawnX: number;
	readonly markerVisible: boolean;
}

const MAX_CHESTS = 8;
const CHEST_SIZE = 0.9;
/** Distance from the hero at which the incoming marker rests: about the edge of the visible ground. */
const EDGE_DISTANCE = 9;
const MARKER_SIZE = 0.8;
const MARKER_HEIGHT = 1.2;
const BLINK_HZ = 3;
/** Radius around the hero inside which an opened chest is removed. */
const OPEN_RADIUS = 3;

/** Placeholder chest on the ground and the edge marker of an elite that is about to arrive (GDD section 11). */
export function createEliteView(game: GameScene): EliteView {
	const chestMesh = CreateBox("vfx_chests", { size: 1 }, game.scene);
	const chestMaterial = new StandardMaterial("vfx_chests", game.scene);
	chestMaterial.disableLighting = true;
	chestMaterial.emissiveColor = Color3.FromHexString(PALETTE.emberLight);
	chestMaterial.diffuseColor = Color3.Black();
	chestMesh.material = chestMaterial;
	const chestSet = createInstanceSet(chestMesh, MAX_CHESTS, false);
	const chestX = new Float32Array(MAX_CHESTS);
	const chestZ = new Float32Array(MAX_CHESTS);
	let chests = 0;

	const markerMesh = CreateBox("vfx_elite_marker", { size: 1 }, game.scene);
	const markerMaterial = new StandardMaterial("vfx_elite_marker", game.scene);
	markerMaterial.disableLighting = true;
	markerMaterial.emissiveColor = Color3.FromHexString(PALETTE.bloodLight);
	markerMaterial.diffuseColor = Color3.Black();
	markerMesh.material = markerMaterial;
	const markerSet = createInstanceSet(markerMesh, 1, false);
	let markerOn = false;
	let markerX = 0;
	let markerZ = 0;
	let clock = 0;
	let drawnX = 0;
	let lastHeroX = 0;
	let lastHeroZ = 0;

	return {
		get chests(): number {
			return chests;
		},
		chestAt(i): { x: number; z: number } | undefined {
			return i < chests ? { x: chestX[i] ?? 0, z: chestZ[i] ?? 0 } : undefined;
		},
		get markerDrawnX(): number {
			return drawnX;
		},
		get markerVisible(): boolean {
			return markerOn;
		},
		onEvent(type, a, b): void {
			if (type === EventType.EliteIncoming) {
				markerOn = true;
				markerX = a;
				markerZ = b;
			} else if (type === EventType.EliteSpawned || type === EventType.EliteEscaped) {
				markerOn = false;
			} else if (type === EventType.ChestOpened) {
				// The offer carries no position: the chest the hero walked into is the nearest one.
				let best = -1;
				let bestDistance = OPEN_RADIUS * OPEN_RADIUS;
				for (let i = 0; i < chests; i++) {
					const dx = (chestX[i] ?? 0) - lastHeroX;
					const dz = (chestZ[i] ?? 0) - lastHeroZ;
					if (dx * dx + dz * dz < bestDistance) {
						bestDistance = dx * dx + dz * dz;
						best = i;
					}
				}
				if (best >= 0) {
					chests--;
					chestX[best] = chestX[chests] ?? 0;
					chestZ[best] = chestZ[chests] ?? 0;
				}
			} else if (type === EventType.ChestDropped && chests < MAX_CHESTS) {
				chestX[chests] = a;
				chestZ[chests] = b;
				chests++;
			}
		},
		shift(dx, dz): void {
			markerX -= dx;
			markerZ -= dz;
			for (let i = 0; i < chests; i++) {
				chestX[i] = (chestX[i] ?? 0) - dx;
				chestZ[i] = (chestZ[i] ?? 0) - dz;
			}
		},
		update(seconds, heroX, heroZ): void {
			clock += seconds;
			lastHeroX = heroX;
			lastHeroZ = heroZ;
			for (let i = 0; i < chests; i++) {
				writeTransform(
					chestSet.matrices,
					i,
					chestX[i] ?? 0,
					CHEST_SIZE / 2,
					chestZ[i] ?? 0,
					CHEST_SIZE,
					0,
				);
			}
			chestSet.commit(chests);

			let shown = 0;
			if (markerOn) {
				const dx = markerX - heroX;
				const dz = markerZ - heroZ;
				const distance = Math.hypot(dx, dz);
				const blink = Math.sin(clock * BLINK_HZ * Math.PI * 2) > -0.3;
				if (distance > EDGE_DISTANCE && blink) {
					const k = EDGE_DISTANCE / distance;
					drawnX = heroX + dx * k;
					writeTransform(
						markerSet.matrices,
						0,
						heroX + dx * k,
						MARKER_HEIGHT,
						heroZ + dz * k,
						MARKER_SIZE,
						clock * 3,
					);
					shown = 1;
				} else if (distance <= EDGE_DISTANCE && blink) {
					writeTransform(
						markerSet.matrices,
						0,
						markerX,
						MARKER_HEIGHT,
						markerZ,
						MARKER_SIZE,
						clock * 3,
					);
					shown = 1;
				}
			}
			markerSet.commit(shown);
		},
	};
}
