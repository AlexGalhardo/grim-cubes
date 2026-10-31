import { spawnSync } from "node:child_process";

/** SDD 08 section 3: effects and voice at -16 LUFS, music at -14 LUFS, within +-1 LU. */
export const TARGET_LUFS = { sfx: -16, voice: -16, music: -14 } as const;
export const TOLERANCE_LU = 1;
/** Below this the integrated loudness gate (400 ms blocks, -70 LUFS) has nothing to measure. */
const UNMEASURABLE_LUFS = -60;

export type LoudnessKind = keyof typeof TARGET_LUFS;

/** Ambience beds sit under the action: 8 LU below the other effects. */
export const AMBIENCE_LUFS = -24;

export function targetFor(id: string, kind: LoudnessKind): number {
	return id.startsWith("sfx_ambience_") ? AMBIENCE_LUFS : TARGET_LUFS[kind];
}

export interface Measurement {
	/** Integrated loudness, LUFS. */
	lufs: number;
	/** True peak, dBTP. */
	peak: number;
}

/** `input_i` and `input_tp` of the JSON block `ffmpeg -af loudnorm=print_format=json` prints on stderr. */
export function parseMeasured(stderr: string): Measurement | null {
	const lufs = /"input_i"\s*:\s*"(-?[\d.]+|-inf)"/.exec(stderr)?.[1];
	const peak = /"input_tp"\s*:\s*"(-?[\d.]+|-inf|inf)"/.exec(stderr)?.[1];
	if (!lufs || !peak) return null;
	const l = Number(lufs);
	const p = Number(peak);
	return Number.isFinite(l) && Number.isFinite(p) && l > UNMEASURABLE_LUFS ? { lufs: l, peak: p } : null;
}

/** The loudest a file may get: peaks stay under this many dBTP, and no file is boosted or cut by more than the cap. */
export const PEAK_CEILING = -1;
export const MAX_GAIN_DB = 12;

/**
 * Gain in dB that brings a file to the target of its kind, held by the peak ceiling and by `MAX_GAIN_DB`, so a quiet
 * transient is brought up as far as it can go without clipping instead of being crushed by a limiter.
 */
export function gainFor(target: number, m: Measurement): number {
	const wanted = target - m.lufs;
	const headroom = PEAK_CEILING - m.peak;
	const gain = Math.min(wanted, wanted > 0 ? headroom : wanted, MAX_GAIN_DB);
	return Math.round(Math.max(-MAX_GAIN_DB, gain) * 100) / 100;
}

/** True when the loudness after `gainFor` still misses the target by more than the tolerance. */
export function needsFix(target: number, m: Measurement): boolean {
	return Math.abs(m.lufs - target) > TOLERANCE_LU && Math.abs(gainFor(target, m)) >= 0.5;
}

export function measureLufs(file: string): Measurement | null {
	const run = spawnSync(
		"ffmpeg",
		[
			"-hide_banner",
			"-nostats",
			"-i",
			file,
			"-af",
			"loudnorm=I=-16:print_format=json",
			"-f",
			"null",
			"-",
		],
		{ encoding: "utf8" },
	);
	return run.error ? null : parseMeasured(run.stderr);
}

export function applyGain(file: string, gainDb: number, tmp: string): boolean {
	const run = spawnSync(
		"ffmpeg",
		[
			"-hide_banner",
			"-y",
			"-i",
			file,
			"-af",
			`volume=${gainDb}dB`,
			"-codec:a",
			"libmp3lame",
			"-b:a",
			"128k",
			tmp,
		],
		{ encoding: "utf8" },
	);
	return !run.error && run.status === 0;
}
