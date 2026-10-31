import { describe, expect, it } from "vitest";
import { pickAtlasFormat } from "./atlasFormat";
import type { AssetEntry } from "./gameAssets";

const png: AssetEntry = { url: "a.png", hash: "h", bytes: 1, kind: "atlas", group: "core", ktx2: false };
const both: AssetEntry = { ...png, ktx2: { url: "a.ktx2", hash: "h", bytes: 1 } };

describe("pickAtlasFormat", () => {
	it("keeps the PNG when the manifest has no KTX2, the decoder is missing or the GPU cannot sample it", () => {
		expect(pickAtlasFormat(png, { etc2: {} }, true)).toBe("png");
		expect(pickAtlasFormat(both, { etc2: {} }, false)).toBe("png");
		expect(pickAtlasFormat(both, {}, true)).toBe("png");
	});

	it("picks KTX2 when the manifest lists it, a transcode target exists and the decoder is local", () => {
		expect(pickAtlasFormat(both, { etc2: {} }, true)).toBe("ktx2");
		expect(pickAtlasFormat(both, { astc: {} }, true)).toBe("ktx2");
		expect(pickAtlasFormat(both, { bptc: {} }, true)).toBe("ktx2");
	});
});
