import { expect, test } from "vitest";
import {
	checksumOf,
	createMetaState,
	createSettings,
	MAX_SAVE_BYTES,
	parseSave,
	SAVE_SCHEMA_VERSION,
	SaveError,
	serializeSave,
	validateMeta,
} from "./save";

const meta = () => {
	const m = createMetaState();
	m.souls = 285;
	m.records.normal = 12;
	m.stats = { kills: 340, runs: 3, bossKills: 1, elitesKilled: 1 };
	m.ossuary = { flesh_1: true };
	m.unlocks = ["grim"];
	return m;
};

test("a save round-trips and uses schemaVersion 2", async () => {
	const text = await serializeSave(meta(), "0.1.0", new Date("2026-10-31T12:00:00Z"));
	const envelope = JSON.parse(text) as { schemaVersion: number; app: string; savedAt: string };
	expect(envelope.schemaVersion).toBe(2);
	expect(SAVE_SCHEMA_VERSION).toBe(2);
	expect(envelope.app).toBe("grim-cubes");
	expect(envelope.savedAt).toBe("2026-10-31T12:00:00.000Z");
	expect(await parseSave(text)).toEqual(meta());
});

test("a tampered or corrupted save is rejected", async () => {
	const text = await serializeSave(meta(), "0.1.0");
	const edited = text.replace('"souls":285', '"souls":999999');
	await expect(parseSave(edited)).rejects.toThrow("checksum mismatch");
	await expect(parseSave(text.slice(0, 40))).rejects.toBeInstanceOf(SaveError);
	await expect(parseSave("")).rejects.toBeInstanceOf(SaveError);
	await expect(parseSave("[]")).rejects.toBeInstanceOf(SaveError);
});

test("untrusted fields are validated", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown> & {
		data: Record<string, unknown>;
	};
	const bad = async (patch: (d: Record<string, unknown>) => void): Promise<void> => {
		const copy = structuredClone(base);
		patch(copy.data);
		await expect(parseSave(JSON.stringify(copy))).rejects.toBeInstanceOf(SaveError);
	};
	await bad((d) => {
		d.souls = -1;
	});
	await bad((d) => {
		d.souls = 1.5;
	});
	await bad((d) => {
		d.souls = 1e12;
	});
	await bad((d) => {
		d.souls = "9";
	});
	await bad((d) => {
		d.unlocks = [1];
	});
	await bad((d) => {
		d.records = null;
	});
});

test("a save from another app or a newer schema is refused", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown>;
	await expect(parseSave(JSON.stringify({ ...base, app: "other" }))).rejects.toBeInstanceOf(SaveError);
	await expect(parseSave(JSON.stringify({ ...base, schemaVersion: 3 }))).rejects.toThrow("newer version");
});

test("size, list and key limits protect the parser", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown> & {
		data: Record<string, unknown>;
	};
	const reject = async (patch: (d: Record<string, unknown>) => void): Promise<void> => {
		const copy = structuredClone(base);
		patch(copy.data);
		await expect(parseSave(JSON.stringify(copy))).rejects.toBeInstanceOf(SaveError);
	};
	await reject((d) => {
		d.unlocks = Array.from({ length: 257 }, (_, i) => `u${i}`);
	});
	await reject((d) => {
		d.ossuary = Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`n${i}`, true]));
	});
	for (const key of ["__proto__", "constructor", "prototype"]) {
		const text = (await serializeSave(meta(), "0.1.0")).replace('"flesh_1":true', `"${key}":true`);
		await expect(parseSave(text)).rejects.toBeInstanceOf(SaveError);
	}
	await expect(parseSave(`{"pad":"${"x".repeat(MAX_SAVE_BYTES)}"}`)).rejects.toThrow("too large");
	const edge = structuredClone(base);
	edge.data.unlocks = Array.from({ length: 256 }, (_, i) => `u${i}`);
	edge.checksum = await checksumOf(validateMeta(edge.data));
	expect((await parseSave(JSON.stringify(edge))).unlocks).toHaveLength(256);
});

test("a newer schema is reported with the newer code", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown>;
	await expect(parseSave(JSON.stringify({ ...base, schemaVersion: 9 }))).rejects.toMatchObject({
		code: "newer",
	});
	await expect(parseSave("nope")).rejects.toMatchObject({ code: "invalid" });
});

test("a schema 1 save loads with default settings and a settings block must be valid", async () => {
	const current = JSON.parse(await serializeSave(meta(), "0.1.0")) as {
		schemaVersion: number;
		checksum: string;
		data: Record<string, unknown>;
	};
	const { settings: _settings, ...legacyData } = current.data;
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(JSON.stringify(legacyData)),
	);
	const checksum = `sha256-${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
	const legacy = JSON.stringify({ ...current, schemaVersion: 1, checksum, data: legacyData });
	expect((await parseSave(legacy)).settings).toEqual(createSettings());
	expect(() =>
		validateMeta({ ...current.data, settings: { ...createSettings(), preset: "Bad Id" } }),
	).toThrow(SaveError);
	expect(() => validateMeta({ ...current.data, settings: { ...createSettings(), locale: "fr" } })).toThrow(
		SaveError,
	);
	expect(() =>
		validateMeta({
			...current.data,
			settings: { ...createSettings(), volume: { master: 101, music: 0, sfx: 0 } },
		}),
	).toThrow(SaveError);
});
