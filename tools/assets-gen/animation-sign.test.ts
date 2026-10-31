import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type BbModel, parseBbmodel } from "../assets-build/bbmodel";
import { buildCatalog } from "./catalog";
import { baseModelName } from "./emissive";

const MODELS = fileURLToPath(new URL("../../assets/src/models/", import.meta.url));

type Key = { time: number; value: [number, number, number] };

/** `clip|bone|channel` to its keyframes. */
function tracks(model: BbModel): Map<string, Key[]> {
	const out = new Map<string, Key[]>();
	for (const clip of model.animations ?? []) {
		for (const animator of Object.values(clip.animators)) {
			for (const channel of ["rotation", "position", "scale"] as const) {
				const keys = animator.keyframes
					.filter((k) => k.channel === channel)
					.map((k): Key => {
						const p = k.data_points[0];
						return {
							time: k.time,
							value: [Number(p?.x ?? 0), Number(p?.y ?? 0), Number(p?.z ?? 0)],
						};
					});
				if (keys.length > 0) out.set(`${clip.name}|${animator.name ?? "?"}|${channel}`, keys);
			}
		}
	}
	return out;
}

/**
 * Blockbench shows the x and y animation angles of a 4.10 file with the opposite sign and writes the shown value back,
 * so a model reloaded and saved without care comes out with the tracks it did not touch mirrored (docs/blockbench.md
 * section 10). The generator keeps the right signs: a saved track that is exactly the generator's with x and y
 * negated, with the same times, is a mirrored one.
 */
function isMirrored(saved: Key[], generated: Key[]): boolean {
	if (saved.length !== generated.length) return false;
	const times = saved.every((k, i) => Math.abs(k.time - (generated[i]?.time ?? Number.NaN)) < 1e-3);
	const mirrored = saved.every((k, i) => {
		const g = generated[i]?.value ?? [Number.NaN, 0, 0];
		return (
			Math.abs(k.value[0] + g[0]) < 1e-3 &&
			Math.abs(k.value[1] + g[1]) < 1e-3 &&
			Math.abs(k.value[2] - g[2]) < 1e-3
		);
	});
	const moves = generated.some((k) => Math.abs(k.value[0]) > 1e-3 || Math.abs(k.value[1]) > 1e-3);
	return times && mirrored && moves;
}

describe("animation rotation signs", () => {
	const catalog = buildCatalog();

	it("has no track that is the generator's with x and y mirrored", () => {
		const bad: string[] = [];
		let compared = 0;
		for (const { name, category, generated } of catalog) {
			const generatedTracks = tracks(parseBbmodel(name, JSON.stringify(generated.bbmodel)));
			for (const folder of [category, "variants"]) {
				const files = folder === "variants" ? [`${name}_02`] : [name];
				for (const file of files) {
					const path = join(MODELS, folder, `${file}.bbmodel`);
					if (!existsSync(path) || baseModelName(file) !== name) continue;
					const saved = tracks(parseBbmodel(file, readFileSync(path, "utf8")));
					for (const [key, keys] of saved) {
						const reference = generatedTracks.get(key);
						if (reference) compared++;
						if (reference && key.endsWith("|rotation") && isMirrored(keys, reference))
							bad.push(`${folder}/${file}: ${key}`);
					}
				}
			}
		}
		expect(bad).toEqual([]);
		expect(compared).toBeGreaterThan(100);
	});

	it("detects a mirrored track", () => {
		const reference: Key[] = [
			{ time: 0, value: [0, 0, 0] },
			{ time: 0.25, value: [90, 0, 0] },
		];
		expect(
			isMirrored(
				reference.map((k) => ({ time: k.time, value: [-k.value[0], -k.value[1], k.value[2]] })),
				reference,
			),
		).toBe(true);
		expect(isMirrored(reference, reference)).toBe(false);
	});
});
