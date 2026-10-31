import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { buildCatalog } from "./catalog";

/** Writes every placeholder (or only the named models) `.bbmodel` and `_d.png` under `srcDir/models/<category>/`; output is byte-stable. */
export function writeCatalog(srcDir: string, only?: readonly string[]): string[] {
	const written: string[] = [];
	for (const { name, category, generated } of buildCatalog()) {
		if (only && !only.includes(name)) continue;
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
