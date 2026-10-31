import { Effect } from "@babylonjs/core/Materials/effect";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import type { GameScene } from "./scene";

export type ColorblindMode = "off" | "protanopia" | "deuteranopia" | "tritanopia";

export const BRIGHTNESS_RANGE = { min: -0.5, max: 0.5 } as const;
export const CONTRAST_RANGE = { min: 0.5, max: 1.5 } as const;

export interface Vision {
	/** -0.5..0.5, 0 = untouched: the scene exposure becomes 1 + brightness. Out-of-range values are clamped. */
	setBrightness(value: number): void;
	/** 0.5..1.5, 1 = untouched. Out-of-range values are clamped. */
	setContrast(value: number): void;
	/** Daltonisation post-process: moves the colour the eye misses into the channels it still sees. */
	setColorblindMode(mode: ColorblindMode): void;
	/** Cuts the white hit flash, the hit-stop, the camera shake and the execution flash. */
	setFlashReduction(on: boolean): void;
	readonly brightness: number;
	readonly contrast: number;
	readonly colorblindMode: ColorblindMode;
	readonly flashReduced: boolean;
}

/**
 * Row-major simulation matrices (RGB approximations of the missing cone); the shader adds the simulation error back
 * into the other channels (the classic daltonize correction), so reds and greens stay tellable.
 */
const SIMULATION: Readonly<Record<Exclude<ColorblindMode, "off">, readonly number[]>> = {
	protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
	deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
	tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};
const SHIFT: Readonly<Record<Exclude<ColorblindMode, "off">, readonly number[]>> = {
	protanopia: [0, 0, 0, 0.7, 1, 0, 0.7, 0, 1],
	deuteranopia: [0, 0, 0, 0.7, 1, 0, 0.7, 0, 1],
	tritanopia: [1, 0, 0.7, 0, 1, 0.7, 0, 0, 0],
};

const SHADER = "portColorblind";
Effect.ShadersStore[`${SHADER}FragmentShader`] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform mat3 simulation;
uniform mat3 shift;
void main(void) {
	vec3 c = texture2D(textureSampler, vUV).rgb;
	vec3 error = c - simulation * c;
	gl_FragColor = vec4(clamp(c + shift * error, 0.0, 1.0), 1.0);
}`;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
/** Column-major mat3 for a uniform from a row-major table. */
const columnMajor = (m: readonly number[]): number[] => [
	m[0] ?? 0,
	m[3] ?? 0,
	m[6] ?? 0,
	m[1] ?? 0,
	m[4] ?? 0,
	m[7] ?? 0,
	m[2] ?? 0,
	m[5] ?? 0,
	m[8] ?? 0,
];

/** The uniforms of each mode, built once at load: nothing is allocated when a mode is selected. */
const MATRICES: Readonly<
	Record<Exclude<ColorblindMode, "off">, { simulation: Float32Array; shift: Float32Array }>
> = {
	protanopia: {
		simulation: Float32Array.from(columnMajor(SIMULATION.protanopia)),
		shift: Float32Array.from(columnMajor(SHIFT.protanopia)),
	},
	deuteranopia: {
		simulation: Float32Array.from(columnMajor(SIMULATION.deuteranopia)),
		shift: Float32Array.from(columnMajor(SHIFT.deuteranopia)),
	},
	tritanopia: {
		simulation: Float32Array.from(columnMajor(SIMULATION.tritanopia)),
		shift: Float32Array.from(columnMajor(SHIFT.tritanopia)),
	},
};

/**
 * Accessibility look of the game (Options screen): brightness and contrast through the scene's image processing (enabled by default, identity at exposure 1 and contrast 1),
 * the colour-blind correction as a one-pass post-process created only while a mode is on, and the flash-reduction flag
 * the VFX read. The default state changes nothing, so the baseline look and cost stay as they were.
 */
export function createVision(game: GameScene): Vision {
	const { scene, camera } = game;
	let brightness = 0;
	let contrast = 1;
	let mode: ColorblindMode = "off";
	let flashReduced = false;
	let process: PostProcess | undefined;

	function applyImageProcessing(): void {
		const config = scene.imageProcessingConfiguration;
		config.exposure = 1 + brightness;
		config.contrast = contrast;
	}

	return {
		get brightness(): number {
			return brightness;
		},
		get contrast(): number {
			return contrast;
		},
		get colorblindMode(): ColorblindMode {
			return mode;
		},
		get flashReduced(): boolean {
			return flashReduced;
		},
		setBrightness(value): void {
			brightness = clamp(value, BRIGHTNESS_RANGE.min, BRIGHTNESS_RANGE.max);
			applyImageProcessing();
		},
		setContrast(value): void {
			contrast = clamp(value, CONTRAST_RANGE.min, CONTRAST_RANGE.max);
			applyImageProcessing();
		},
		setColorblindMode(next): void {
			mode = next;
			process?.dispose();
			process = undefined;
			if (next === "off") return;
			const matrices = MATRICES[next];
			process = new PostProcess("colorblind", SHADER, ["simulation", "shift"], null, 1, camera);
			process.onApplyObservable.add((effect) => {
				effect.setMatrix3x3("simulation", matrices.simulation);
				effect.setMatrix3x3("shift", matrices.shift);
			});
		},
		setFlashReduction(on): void {
			flashReduced = on;
		},
	};
}
