import { expect, it } from "vitest";
import { biomeIdFor } from "./modelReview";

it("finds the biome of a prop or an enemy and falls back to the first", () => {
	expect(biomeIdFor("prop_furnace_01")).toBe("infernal_forge");
	expect(biomeIdFor("prop_swamp_stump_01")).toBe("bone_swamp");
	expect(biomeIdFor("forged")).toBe("infernal_forge");
	expect(biomeIdFor("forgemaster")).toBe("infernal_forge");
	expect(biomeIdFor("nest_queen")).toBe("biomech_nest");
	expect(biomeIdFor("tile_forge_03")).toBe("infernal_forge");
	expect(biomeIdFor("tile_nest_02")).toBe("biomech_nest");
	expect(biomeIdFor("hero")).toBe("sunken_cemetery");
});
