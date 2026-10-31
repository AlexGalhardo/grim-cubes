import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { buildCatalog } from "./catalog";

/**
 * Models edited by hand in Blockbench (docs/blockbench.md), as `category/name`. The generator never overwrites them,
 * so `assets:gen` can still refresh the remaining placeholders.
 */
export function readAuthored(srcDir: string): ReadonlySet<string> {
	const file = join(srcDir, "models", "authored.json");
	if (!existsSync(file)) return new Set();
	const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
	const models = (parsed as { models?: unknown }).models;
	if (
		!Array.isArray(models) ||
		!models.every((m) => typeof m === "string" && /^[a-z]+\/[a-z0-9_]+$/.test(m))
	) {
		throw new Error(`${file}: "models" must be an array of "category/name" strings`);
	}
	return new Set(models);
}

/** Writes every placeholder (or only the named models) `.bbmodel` and `_d.png` under `srcDir/models/<category>/`; output is byte-stable. */
export function writeCatalog(srcDir: string, only?: readonly string[]): string[] {
	const written: string[] = [];
	const authored = readAuthored(srcDir);
	for (const { name, category, generated } of buildCatalog()) {
		if (only && !only.includes(name)) continue;
		if (authored.has(`${category}/${name}`)) continue;
		const dir = join(srcDir, "models", category);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, `${name}.bbmodel`), `${JSON.stringify(generated.bbmodel)}\n`);
		writeFileSync(join(dir, `${name}_d.png`), PNG.sync.write(generated.texture, { filterType: 0 }));
		written.push(`${category}/${name}`);
	}
	return written;
}

if (import.meta.main) {
	const written = writeCatalog("assets/src");
	console.log(`assets-gen: ${written.length} models written to assets/src/models`);
}
