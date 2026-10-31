import type { AssetEntry } from "./gameAssets";

export type AtlasFormat = "ktx2" | "png";

/** The slice of `engine.getCaps()` that decides the atlas format. */
export interface TextureCaps {
	/** ETC2 compressed textures (ETC1S transcodes to ETC2 on Android and most mobile GPUs). */
	etc2?: unknown;
	astc?: unknown;
	bptc?: unknown;
}

/**
 * KTX2 only when the manifest lists it, the GPU samples a transcode target of ETC1S and the transcoder files are
 * served from `/assets/` (the CSP blocks the Babylon CDN); otherwise the PNG every build ships.
 */
export function pickAtlasFormat(
	entry: AssetEntry,
	caps: TextureCaps,
	decoderAvailable: boolean,
): AtlasFormat {
	if (!entry.ktx2 || !decoderAvailable) return "png";
	return caps.etc2 || caps.astc || caps.bptc ? "ktx2" : "png";
}
