import { expect, test } from "vitest";
import { findSecretLines } from "./scan";

const KEY = "ELEVENLABS_API_KEY";
const HDR = ["xi", "api", "key"].join("-");

test("flags key assignments and ignores empty placeholders", () => {
	expect(findSecretLines(`${KEY}=sk_${"test"}`)).toEqual([1]);
	expect(
		findSecretLines(`a
${HDR}: abc123`),
	).toEqual([2]);
	expect(findSecretLines(`${KEY}=`)).toEqual([]);
	expect(findSecretLines("nothing here")).toEqual([]);
});
