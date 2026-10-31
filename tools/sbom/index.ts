import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { buildSbom, checksumsText, parseBunLock, parseDirectDeps } from "./lib";

function flagValue(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
}

/** Usage: bun tools/sbom/index.ts [--out dir] [extra files to checksum...] */
function main(argv: string[]): number {
	const outDir = flagValue(argv, "--out") ?? ".";
	const extras = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--out");
	const root = parseDirectDeps(readFileSync("package.json", "utf8"));
	const sbom = `${JSON.stringify(buildSbom(root, parseBunLock(readFileSync("bun.lock", "utf8"))), null, "\t")}\n`;

	mkdirSync(outDir, { recursive: true });
	const sbomName = `grim-cubes_${root.version}.sbom.json`;
	writeFileSync(join(outDir, sbomName), sbom);
	const files = [
		{ name: sbomName, data: sbom },
		...extras.map((path) => ({ name: basename(path), data: new Uint8Array(readFileSync(path)) })),
	];
	writeFileSync(join(outDir, "checksums.txt"), checksumsText(files));
	console.log(`wrote ${sbomName} and checksums.txt (${files.length} files) in ${outDir}`);
	return 0;
}

try {
	process.exit(main(process.argv.slice(2)));
} catch (error) {
	console.error(`sbom: ${error instanceof Error ? error.message : "failed"}`);
	process.exit(1);
}
