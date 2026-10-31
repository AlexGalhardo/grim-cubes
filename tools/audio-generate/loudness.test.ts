import { expect, test } from "vitest";
import { AMBIENCE_LUFS, gainFor, MAX_GAIN_DB, needsFix, parseMeasured, targetFor } from "./loudness";

const json = (i: string, tp: string): string =>
	`{\n\t"input_i" : "${i}",\n\t"input_tp" : "${tp}",\n\t"input_lra" : "1.00"\n}`;

test("reads the integrated loudness and the true peak, and refuses silence", () => {
	expect(parseMeasured(json("-23.40", "-4.10"))).toEqual({ lufs: -23.4, peak: -4.1 });
	expect(parseMeasured(json("-inf", "-inf"))).toBeNull();
	expect(parseMeasured(json("-70.00", "-60.00"))).toBeNull();
	expect(parseMeasured("no json here")).toBeNull();
});

test("the gain reaches the target unless the peak ceiling or the cap stops it", () => {
	expect(gainFor(-16, { lufs: -22, peak: -10 })).toBe(6);
	expect(gainFor(-16, { lufs: -22, peak: -3 })).toBe(2);
	expect(gainFor(-16, { lufs: -50, peak: -40 })).toBe(MAX_GAIN_DB);
	expect(gainFor(-16, { lufs: -4, peak: 0 })).toBe(-12);
	expect(gainFor(-14, { lufs: -10, peak: -0.5 })).toBe(-4);
});

test("a file within one LU of its target needs nothing, and ambience has its own target", () => {
	expect(needsFix(-16, { lufs: -16.8, peak: -3 })).toBe(false);
	expect(needsFix(-16, { lufs: -19, peak: -9 })).toBe(true);
	expect(targetFor("sfx_ambience_swamp", "sfx")).toBe(AMBIENCE_LUFS);
	expect(targetFor("mus_boss", "music")).toBe(-14);
	expect(targetFor("voice_x", "voice")).toBe(-16);
});
