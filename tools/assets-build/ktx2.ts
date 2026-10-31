import { existsSync } from "node:fs";

export interface Ktx2Deps {
	/** Path of the `toktx` binary, or null when it is not installed. */
	locate(): string | null;
	/** Runs the binary; true when it exited 0. */
	run(binary: string, args: string[]): boolean;
}

export const systemKtx2Deps: Ktx2Deps = {
	locate: () => Bun.which("toktx"),
	run: (binary, args) => Bun.spawnSync([binary, ...args]).exitCode === 0,
};

/**
 * Encodes a PNG atlas to KTX2 ETC1S with KTX-Software's `toktx` (SDD 09 step 6). Returns false, writing nothing, when
 * the binary is missing or fails: the pipeline then marks the atlas `ktx2: false` and the game keeps the PNG.
 * No mipmaps: the atlases are sampled NEAREST (ADR-0014).
 */
export function encodeKtx2(png: string, out: string, deps: Ktx2Deps = systemKtx2Deps): boolean {
	const binary = deps.locate();
	if (!binary) return false;
	const ok = deps.run(binary, ["--t2", "--encode", "etc1s", "--clevel", "4", "--qlevel", "255", out, png]);
	return ok && existsSync(out);
}
