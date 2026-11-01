import type { DynamicScaleConfig, PresetsData, VideoPreset } from "@gc/game";
import type { GameScene } from "./scene";

/** What a preset changed on the render side, for the HUD, the debug API and the caller that owns the pools. */
export interface AppliedPreset {
	readonly id: string;
	readonly shadowsEnabled: boolean;
	readonly hardwareScalingLevel: number;
	readonly enemyCap: number;
	readonly decalPool: number;
	readonly particlePool: number;
	readonly post: VideoPreset["post"];
}

export interface QualityEngine {
	setHardwareScalingLevel(level: number): void;
	getHardwareScalingLevel(): number;
}

/**
 * Applies the render half of a video preset (SDD 14 section 5): shadows on/off and the render scale. The enemy cap and
 * the pool sizes are the caller's to apply (the spawner and the VFX pools live outside this module). Shadow
 * generators do not exist yet; the cascade/blob choice is kept in `AppliedPreset` for when they do.
 */
/** Presets that draw without the ground contrast rings (SDD 14: rings and health bars cost 10 to 16% of a frame in software). */
export const NO_RINGS_PRESETS: readonly string[] = ["minimum"];

export function applyPreset(game: GameScene, engine: QualityEngine, preset: VideoPreset): AppliedPreset {
	game.scene.shadowsEnabled = preset.shadows !== "none";
	const hardwareScalingLevel = 1 / preset.renderScale;
	engine.setHardwareScalingLevel(hardwareScalingLevel);
	return {
		id: preset.id,
		shadowsEnabled: game.scene.shadowsEnabled,
		hardwareScalingLevel,
		enemyCap: preset.enemyCap,
		decalPool: preset.decalPool,
		particlePool: preset.particlePool,
		post: preset.post,
	};
}

export interface DynamicScaler {
	/** Feed one frame time in ms; adjusts the engine hardware scaling level when the p99 stays bad or good. */
	frame(frameMs: number): void;
	readonly level: number;
	/** Turns the scaler on or off (presets without `dynamicScale` leave the level where `applyPreset` put it). */
	setEnabled(enabled: boolean): void;
}

type AutoPresetData = PresetsData["auto"];

const WINDOW = 120;

/**
 * SceneOptimizer-style dynamic resolution (SDD 14): starts at `devicePixelRatio / startDivisor`, degrades one `step`
 * up to `maxLevel` when the p99 of the last frames stays above `p99Ms` for `degradeSeconds`, and recovers one step after
 * `recoverSeconds` below it. Allocation-free: a fixed ring of frame times, sorted in a scratch copy per decision.
 */
export function createDynamicScaler(
	engine: QualityEngine,
	config: DynamicScaleConfig,
	devicePixelRatio: number,
	floorLevel = 1,
): DynamicScaler {
	const start = Math.max(floorLevel, devicePixelRatio / config.startDivisor);
	let level = Math.min(config.maxLevel, start);
	let enabled = true;
	const ring = new Float32Array(WINDOW);
	const scratch = new Float32Array(WINDOW);
	let filled = 0;
	let head = 0;
	let badFor = 0;
	let goodFor = 0;
	engine.setHardwareScalingLevel(level);

	function p99(): number {
		scratch.set(ring);
		const view = scratch.subarray(0, filled);
		view.sort();
		return view[Math.min(filled - 1, Math.floor(filled * 0.99))] ?? 0;
	}

	return {
		get level(): number {
			return level;
		},
		setEnabled(value): void {
			enabled = value;
		},
		frame(frameMs): void {
			ring[head] = frameMs;
			head = (head + 1) % WINDOW;
			filled = Math.min(WINDOW, filled + 1);
			if (!enabled || filled < WINDOW) return;
			const dt = frameMs / 1000;
			if (p99() > config.p99Ms) {
				badFor += dt;
				goodFor = 0;
				if (badFor >= config.degradeSeconds && level < config.maxLevel) {
					level = Math.min(config.maxLevel, level + config.step);
					engine.setHardwareScalingLevel(level);
					badFor = 0;
					filled = 0;
				}
			} else {
				goodFor += dt;
				badFor = 0;
				if (goodFor >= config.recoverSeconds && level > start) {
					level = Math.max(start, level - config.step);
					engine.setHardwareScalingLevel(level);
					goodFor = 0;
					filled = 0;
				}
			}
		},
	};
}

/** What the browser tells us about the machine (R-01-03). Fields it does not expose stay undefined. */
export interface HardwareInfo {
	mobile: boolean;
	cores?: number | undefined;
	/** `navigator.deviceMemory` in GB; Chromium only. */
	memoryGb?: number | undefined;
	/** The unmasked WebGL renderer string. */
	renderer?: string | undefined;
}

/** Maps the navigator facts the auto preset reads; `deviceMemory` is Chromium-only and stays undefined elsewhere. */
export function hardwareInfo(
	mobile: boolean,
	nav: { hardwareConcurrency?: number; deviceMemory?: number },
	renderer?: string,
): HardwareInfo {
	return { mobile, cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory, renderer };
}

/**
 * Preset precedence: `?preset=` wins; bench and debug runs pin the data default so SwiftShader measurements stay
 * comparable (its renderer would otherwise trip the `minimum` rule); otherwise the hardware pick.
 */
export function choosePresetId(
	forced: string | null,
	pinned: boolean,
	autoId: string,
	defaultId: string,
): string {
	return forced ?? (pinned ? defaultId : autoId);
}

/** Picks the first auto-preset rule that holds for `hardware`, else the fallback. A bound on a fact the browser hides never matches. */
export function pickAutoPreset(auto: AutoPresetData, hardware: HardwareInfo): string {
	for (const rule of auto.rules) {
		if (rule.mobile !== undefined && rule.mobile !== hardware.mobile) continue;
		const { cores, memoryGb, renderer } = hardware;
		if (rule.maxCores !== undefined && (cores === undefined || cores > rule.maxCores)) continue;
		if (rule.minCores !== undefined && (cores === undefined || cores < rule.minCores)) continue;
		if (rule.maxMemoryGb !== undefined && (memoryGb === undefined || memoryGb > rule.maxMemoryGb))
			continue;
		if (rule.minMemoryGb !== undefined && (memoryGb === undefined || memoryGb < rule.minMemoryGb))
			continue;
		if (
			rule.rendererMatches !== undefined &&
			!(renderer && new RegExp(rule.rendererMatches, "i").test(renderer))
		)
			continue;
		return rule.preset;
	}
	return auto.fallback;
}
