import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { buildSbom, checksumsText, parseBunLock, parseDirectDeps } from "./lib";

function flagValue(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
}

/**
 * The `license` of an installed package, read from its package.json (bun keeps each one under
 * `node_modules/.bun/<name with "/" as "+">@<version>[+peer hash]/node_modules/<name>`); undefined when it is not installed.
 */
function installedLicense(name: string, version: string): unknown {
	const store = join("node_modules", ".bun");
	const prefix = `${name.replace("/", "+")}@${version}`;
	if (existsSync(store)) {
		const dir = readdirSync(store).find((d) => d === prefix || d.startsWith(`${prefix}+`));
		const file = dir && join(store, dir, "node_modules", name, "package.json");
		if (file && existsSync(file)) return licenseFrom(file);
	}
	const flat = join("node_modules", name, "package.json");
	if (existsSync(flat)) {
		const text = readFileSync(flat, "utf8");
		if ((JSON.parse(text) as { version?: string }).version === version) return licenseFrom(flat);
	}
	return undefined;
}

function licenseFrom(file: string): unknown {
	const pkg = JSON.parse(readFileSync(file, "utf8")) as { license?: unknown; licenses?: unknown };
	return pkg.license ?? pkg.licenses;
}

/** Usage: bun tools/sbom/index.ts [--out dir] [extra files to checksum...] */
function main(argv: string[]): number {
	const outDir = flagValue(argv, "--out") ?? ".";
	const extras = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--out");
	const root = parseDirectDeps(readFileSync("package.json", "utf8"));
	const sbom = `${JSON.stringify(buildSbom(root, parseBunLock(readFileSync("bun.lock", "utf8")), installedLicense), null, "\t")}\n`;

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
