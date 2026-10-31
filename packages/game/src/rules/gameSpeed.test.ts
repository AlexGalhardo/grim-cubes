import { expect, test } from "vitest";
import { nextSpeed } from "./gameSpeed";

test("the speed cycles 1x, 2x, 3x and back", () => {
	expect(nextSpeed(1)).toBe(2);
	expect(nextSpeed(2)).toBe(3);
	expect(nextSpeed(3)).toBe(1);
	expect(nextSpeed(7)).toBe(1);
});
