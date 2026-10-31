import { createHash } from "node:crypto";

export interface LockPackage {
	name: string;
	version: string;
	integrity: string | undefined;
}

export interface DirectDeps {
	name: string;
	version: string;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringRecord(value: unknown): Record<string, string> {
	if (!isRecord(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter((e): e is [string, string] => typeof e[1] === "string"),
	);
}

/** bun.lock is JSONC: only trailing commas need stripping to make it JSON. */
export function parseBunLock(text: string): LockPackage[] {
	const parsed: unknown = JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
	if (!isRecord(parsed) || !isRecord(parsed.packages)) throw new Error("bun.lock has no packages section");
	const out: LockPackage[] = [];
	for (const entry of Object.values(parsed.packages)) {
		if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
		const spec = entry[0];
		const at = spec.lastIndexOf("@");
		if (at <= 0) continue;
		const name = spec.slice(0, at);
		const version = spec.slice(at + 1);
		if (version.startsWith("workspace:")) continue;
		const integrity = entry.find(
			(item): item is string => typeof item === "string" && item.startsWith("sha512-"),
		);
		out.push({ name, version, integrity });
	}
	return out.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

export function parseDirectDeps(packageJson: string): DirectDeps {
	const parsed: unknown = JSON.parse(packageJson);
	if (!isRecord(parsed) || typeof parsed.name !== "string" || typeof parsed.version !== "string")
		throw new Error("package.json needs name and version");
	return {
		name: parsed.name,
		version: parsed.version,
		dependencies: stringRecord(parsed.dependencies),
		devDependencies: stringRecord(parsed.devDependencies),
	};
}

export function purl(name: string, version: string): string {
	return `pkg:npm/${name.replace("@", "%40")}@${version}`;
}

/** Deterministic: no timestamp or serial number, so the same lock yields the same bytes. */
export function buildSbom(root: DirectDeps, packages: LockPackage[]): Record<string, unknown> {
	const directKind = (name: string): "prod" | "dev" | undefined =>
		name in root.dependencies ? "prod" : name in root.devDependencies ? "dev" : undefined;
	const components = packages.map((p) => {
		const kind = directKind(p.name);
		return {
			type: "library",
			"bom-ref": purl(p.name, p.version),
			name: p.name,
			version: p.version,
			purl: purl(p.name, p.version),
			...(p.integrity !== undefined && {
				hashes: [
					{
						alg: "SHA-512",
						content: Buffer.from(p.integrity.slice("sha512-".length), "base64").toString("hex"),
					},
				],
			}),
			...(kind !== undefined && { properties: [{ name: "gc:direct", value: kind }] }),
		};
	});
	const rootRef = `pkg:npm/${root.name}@${root.version}`;
	const directRefs = packages
		.filter((p) => directKind(p.name) !== undefined)
		.map((p) => purl(p.name, p.version));
	return {
		bomFormat: "CycloneDX",
		specVersion: "1.6",
		version: 1,
		metadata: {
			component: { type: "application", "bom-ref": rootRef, name: root.name, version: root.version },
		},
		components,
		dependencies: [{ ref: rootRef, dependsOn: directRefs }],
	};
}

export function sha256(data: Uint8Array | string): string {
	return createHash("sha256").update(data).digest("hex");
}

/** `sha256sum`-compatible lines, sorted by file name. */
export function checksumsText(files: Array<{ name: string; data: Uint8Array | string }>): string {
	return `${files
		.map((f) => `${sha256(f.data)}  ${f.name}`)
		.sort((a, b) => a.slice(66).localeCompare(b.slice(66)))
		.join("\n")}\n`;
}
