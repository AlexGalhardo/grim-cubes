import { copyFileSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	applyGain,
	gainFor,
	type LoudnessKind,
	measureLufs,
	needsFix,
	TARGET_LUFS,
	targetFor,
} from "./loudness";

/**
 * Loudness pass (SDD 08 section 3). `bun tools/audio-generate/normalize.ts` only reports; `--apply` rewrites the
 * mp3 files that are more than 1 LU away from their target and records `loudness` in their `.meta.json`.
 * Needs `ffmpeg` on the PATH.
 */
const root = fileURLToPath(new URL("../../assets/src/audio", import.meta.url));
const apply = process.argv.includes("--apply");

let off = 0;
let fixed = 0;
let skipped = 0;
for (const kind of Object.keys(TARGET_LUFS) as LoudnessKind[]) {
	const dir = join(root, kind);
	for (const name of readdirSync(dir)
		.filter((f) => f.endsWith(".mp3"))
		.sort()) {
		const file = join(dir, name);
		const id = name.slice(0, -4);
		const before = measureLufs(file);
		if (before === null) {
			skipped++;
			console.log(`skip ${id}: too short or silent to measure`);
			continue;
		}
		const target = targetFor(id, kind);
		const gain = gainFor(target, before);
		const reach = Math.abs(before.lufs + gain - target) <= 1 ? "" : " (held by peak or cap)";
		const bad = needsFix(target, before);
		if (bad) off++;
		console.log(
			`${bad ? "off " : "ok  "} ${id}: ${before.lufs.toFixed(1)} LUFS, ${before.peak.toFixed(1)} dBTP (target ${target}, gain ${gain} dB${reach})`,
		);
		if (!apply) continue;
		const metaPath = join(dir, `${id}.meta.json`);
		const record = (after: number | null): void => {
			const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>;
			meta.loudness = {
				target,
				before: Math.round(before.lufs * 10) / 10,
				after: after === null ? null : Math.round(after * 10) / 10,
			};
			writeFileSync(
				metaPath,
				`${JSON.stringify(meta, null, "	")}
`,
			);
		};
		// Already within a LU of the target: nothing to rewrite, but the meta still records the measurement.
		if (!bad) {
			if (!("loudness" in (JSON.parse(readFileSync(metaPath, "utf8")) as object))) record(before.lufs);
			continue;
		}
		const tmp = `${file}.tmp.mp3`;
		copyFileSync(file, `${file}.bak`);
		if (!applyGain(file, gain, tmp)) {
			rmSync(tmp, { force: true });
			rmSync(`${file}.bak`);
			console.log(`  failed to process ${id}`);
			continue;
		}
		renameSync(tmp, file);
		rmSync(`${file}.bak`);
		const after = measureLufs(file);
		record(after?.lufs ?? null);
		fixed++;
		console.log(`  -> ${after === null ? "n/a" : after.lufs.toFixed(1)} LUFS`);
	}
}
console.log(`${off} file(s) off target, ${fixed} fixed, ${skipped} skipped`);
process.exit(apply || off === 0 ? 0 : 1);
