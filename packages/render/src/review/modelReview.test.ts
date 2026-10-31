import { expect, it } from "vitest";
import { reviewAtlasId } from "./modelReview";

it("picks the atlas the manifest names, so a tile is not drawn with the characters atlas", () => {
	expect(reviewAtlasId({ atlas: "atlas_props" })).toBe("atlas_props");
	expect(reviewAtlasId({ atlas: "atlas_characters" })).toBe("atlas_characters");
	expect(reviewAtlasId({})).toBe("atlas_characters");
});
