import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { EventType } from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface EliteView {
	/** Handles EliteIncoming / EliteSpawned / EliteEscaped. */
	onEvent(type: number, a: number, b: number, c: number): void;
	/** The world origin moved by (dx, dz). */
	shift(dx: number, dz: number): void;
	/** `heroX`/`heroZ` in scene coordinates; drives the edge marker. */
	update(seconds: number, heroX: number, heroZ: number): void;
	/** Scene x of the instance drawn for the marker (the last one written). */
	readonly markerDrawnX: number;
	readonly markerVisible: boolean;
}

/** Distance from the hero at which the incoming marker rests: about the edge of the visible ground. */
const EDGE_DISTANCE = 9;
const MARKER_SIZE = 0.8;
const MARKER_HEIGHT = 1.2;
const BLINK_HZ = 3;

/** The edge marker of an elite that is about to arrive (GDD section 11). */
export function createEliteView(game: GameScene): EliteView {
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

	return {
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
			}
		},
		shift(dx, dz): void {
			markerX -= dx;
			markerZ -= dz;
		},
		update(seconds, heroX, heroZ): void {
			clock += seconds;
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
