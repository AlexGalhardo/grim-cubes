import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { CATEGORIES } from "../assets-build/rules";

/** Art Bible §3.3 / §14: glowing details live in a separate `<name>_e.png`; here they are the pixels painted with the ember tokens. */
const EMBER = new Set(["e07a2a", "f5b04a"]);
const BLOOD_LIGHT = "8e1a1f";
/** Models whose eyes or visor are `bloodLight` and glow (briefs: wail, hunter, alpha_hunter, swamp_matriarch, nest_queen). */
export const BLOOD_EMISSIVE: ReadonlySet<string> = new Set([
	"wail",
	"hunter",
	"alpha_hunter",
	"swamp_matriarch",
	"nest_queen",
]);

/** Copies only the glowing pixels of `diffuse` into a transparent PNG of the same size; null when it has none. */
export function emissiveMask(diffuse: PNG, includeBloodLight: boolean): PNG | null {
	const out = new PNG({ width: diffuse.width, height: diffuse.height });
	let lit = 0;
	for (let i = 0; i < diffuse.data.length; i += 4) {
		if ((diffuse.data[i + 3] ?? 0) === 0) continue;
		const hex = [0, 1, 2].map((n) => (diffuse.data[i + n] ?? 0).toString(16).padStart(2, "0")).join("");
		if (!EMBER.has(hex) && !(includeBloodLight && hex === BLOOD_LIGHT)) continue;
		for (let n = 0; n < 4; n++) out.data[i + n] = diffuse.data[i + n] ?? 0;
		lit++;
	}
	return lit > 0 ? out : null;
}

/** Rewrites every `_e.png` under `srcDir/models`; returns the `category/name` of the files created, changed (by pixels, not by encoding) or removed. */
export function writeEmissive(srcDir: string): string[] {
	const changed: string[] = [];
	for (const category of CATEGORIES) {
		const dir = join(srcDir, "models", category);
		if (!existsSync(dir)) continue;
		for (const file of readdirSync(dir)
			.filter((f) => f.endsWith("_d.png"))
			.sort()) {
			const name = file.slice(0, -"_d.png".length);
			const target = join(dir, `${name}_e.png`);
			const mask = emissiveMask(PNG.sync.read(readFileSync(join(dir, file))), BLOOD_EMISSIVE.has(name));
			const before = existsSync(target) ? readFileSync(target) : null;
			if (!mask) {
				if (before) {
					rmSync(target);
					changed.push(`${category}/${name}`);
				}
				continue;
			}
			if (before && PNG.sync.read(before).data.equals(mask.data)) continue;
			const bytes = PNG.sync.write(mask, { filterType: 0 });
			writeFileSync(target, bytes);
			changed.push(`${category}/${name}`);
		}
	}
	return changed;
}

if (import.meta.main) {
	const changed = writeEmissive(fileURLToPath(new URL("../../assets/src", import.meta.url)));
	console.log(
		`emissive: ${changed.length} files changed${changed.length ? `: ${changed.join(", ")}` : ""}`,
	);
}
