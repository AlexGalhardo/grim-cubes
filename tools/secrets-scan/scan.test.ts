import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import { findSecretLines } from "./scan";

const KEY = "ELEVENLABS_API_KEY";
const HDR = ["xi", "api", "key"].join("-");
// Fake secrets are built at runtime so this file never contains a literal the scanner would flag.
const SK = `sk_${"a1b2".repeat(10)}`;

test("flags real-looking secrets", () => {
	expect(findSecretLines(`${KEY}=${SK}`)).toEqual([1]);
	expect(findSecretLines(`a\n${HDR}: "${"ab12".repeat(6)}"`)).toEqual([2]);
	expect(findSecretLines(`token = "${SK}"`)).toEqual([1]);
	expect(findSecretLines(`gh${"p"}_${"A".repeat(36)}`)).toEqual([1]);
	expect(findSecretLines(`AK${"IA"}${"ABCDEFGH12345678"}`)).toEqual([1]);
	expect(findSecretLines(`-----BEGIN RSA ${"PRIVATE"} KEY-----`)).toEqual([1]);
});

test("ignores placeholders and legitimate code", () => {
	expect(findSecretLines(`${KEY}=`)).toEqual([]);
	expect(findSecretLines(`${KEY}=<sua chave>`)).toEqual([]);
	expect(findSecretLines(`if (process.env.${KEY} === undefined) return;`)).toEqual([]);
	expect(findSecretLines(`headers: { "${HDR}": apiKey }`)).toEqual([]);
	expect(findSecretLines("nothing here")).toEqual([]);
});

const cli = (...args: string[]): number | null =>
	spawnSync("bun", ["tools/secrets-scan/index.ts", ...args], { encoding: "utf8" }).status;

test("the CLI rejects unknown flags and missing paths instead of passing", () => {
	expect(cli("--all")).toBe(2);
	expect(cli("tools/secrets-scan/does-not-exist.txt")).toBe(2);
	expect(cli("tools/secrets-scan/scan.ts")).toBe(0);
	expect(cli()).toBe(0);
}, 30_000); // four bun start-ups
