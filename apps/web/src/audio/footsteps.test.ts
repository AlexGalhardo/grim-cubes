import { expect, test } from "vitest";
import { createFootsteps, surfaceFor } from "./footsteps";

test("the surface follows the biome track", () => {
	expect(surfaceFor("mus_biome_swamp")).toBe("mud");
	expect(surfaceFor("mus_biome_nest")).toBe("mud");
	expect(surfaceFor("mus_biome_cemetery")).toBe("stone");
	expect(surfaceFor(null)).toBe("stone");
});

test("one step per stride walked, none standing still or after a jump", () => {
	const played: string[] = [];
	const steps = createFootsteps({ play: (ids) => !!played.push(String(ids)) }, 2);
	steps.update(0, 0, "mus_biome_forge");
	steps.update(1, 0, "mus_biome_forge");
	expect(played).toHaveLength(0);
	steps.update(2.1, 0, "mus_biome_forge");
	steps.update(2.1, 0, "mus_biome_forge");
	expect(played).toEqual(["sfx_step_stone"]);
	steps.update(100, 0, "mus_biome_swamp");
	expect(played).toHaveLength(1);
	steps.update(102, 0, "mus_biome_swamp");
	expect(played).toEqual(["sfx_step_stone", "sfx_step_mud"]);
	steps.reset();
	steps.update(0, 0, null);
	steps.update(1, 0, null);
	expect(played).toHaveLength(2);
});
