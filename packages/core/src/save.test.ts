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

test("a save round-trips and uses schemaVersion 5", async () => {
	const text = await serializeSave(meta(), "0.1.0", new Date("2026-10-31T12:00:00Z"));
	const envelope = JSON.parse(text) as { schemaVersion: number; app: string; savedAt: string };
	expect(envelope.schemaVersion).toBe(5);
	expect(SAVE_SCHEMA_VERSION).toBe(5);
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
	await expect(parseSave(JSON.stringify({ ...base, schemaVersion: 6 }))).rejects.toThrow("newer version");
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

const SETTINGS_BY_VERSION: Record<number, string[] | null> = {
	1: null,
	2: ["preset", "volume", "screenShake", "locale"],
	3: ["preset", "volume", "screenShake", "locale", "gameSpeed"],
	4: ["preset", "volume", "screenShake", "locale", "gameSpeed", "telemetry"],
};

/** A save as the given older schema wrote it: only the settings keys it knew, with its own checksum. */
async function legacySave(version: number): Promise<string> {
	const current = JSON.parse(await serializeSave(meta(), "0.1.0")) as {
		data: { settings: Record<string, unknown> } & Record<string, unknown>;
	};
	const keys = SETTINGS_BY_VERSION[version] ?? null;
	const { settings, ...rest } = current.data;
	const data: Record<string, unknown> = keys
		? { ...rest, settings: Object.fromEntries(keys.map((k) => [k, settings[k]])) }
		: rest;
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
	const checksum = `sha256-${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
	return JSON.stringify({ ...current, schemaVersion: version, checksum, data });
}

test("saves from schemas 1 to 4 load with the defaults of every setting they lacked", async () => {
	for (const version of [1, 2, 3, 4]) {
		const loaded = await parseSave(await legacySave(version));
		expect(loaded.settings.gameSpeed, `v${version}`).toBe(1);
		expect(loaded.settings.telemetry, `v${version}`).toBe(false);
		expect(loaded.settings.brightness, `v${version}`).toBe(0);
		expect(loaded.settings.contrast, `v${version}`).toBe(100);
		expect(loaded.settings.colorblind, `v${version}`).toBe("off");
		expect(loaded.settings.flashReduction, `v${version}`).toBe(false);
		expect(loaded.settings.uiScale, `v${version}`).toBe(100);
		expect(loaded.settings.gore, `v${version}`).toBe(true);
	}
	expect((await parseSave(await legacySave(1))).settings).toEqual(createSettings());
});

test("a legacy save with a tampered checksum is still refused", async () => {
	const legacy = JSON.parse(await legacySave(3)) as { data: { souls: number } };
	legacy.data.souls += 1;
	await expect(parseSave(JSON.stringify(legacy))).rejects.toThrow("checksum mismatch");
});

test("visual and other settings are validated: ranges, modes, scales and types", () => {
	const ok = createSettings();
	const bad = (patch: Record<string, unknown>) => () =>
		validateMeta({ ...createMetaState(), settings: { ...ok, ...patch } });
	expect(bad({ preset: "Bad Id" })).toThrow(SaveError);
	expect(bad({ locale: "fr" })).toThrow(SaveError);
	expect(bad({ volume: { master: 101, music: 0, sfx: 0 } })).toThrow(SaveError);
	expect(bad({ gameSpeed: 4 })).toThrow(SaveError);
	expect(bad({ telemetry: "yes" })).toThrow(SaveError);
	expect(bad({ brightness: 51 })).toThrow(SaveError);
	expect(bad({ brightness: 0.5 })).toThrow(SaveError);
	expect(bad({ contrast: 49 })).toThrow(SaveError);
	expect(bad({ colorblind: "achromatopsia" })).toThrow(SaveError);
	expect(bad({ uiScale: 110 })).toThrow(SaveError);
	expect(bad({ flashReduction: 1 })).toThrow(SaveError);
	expect(bad({ gore: "full" })).toThrow(SaveError);
	const edge = validateMeta({
		...createMetaState(),
		settings: {
			...ok,
			brightness: -50,
			contrast: 150,
			colorblind: "tritanopia",
			uiScale: 150,
			gore: false,
		},
	});
	expect(edge.settings).toMatchObject({
		brightness: -50,
		contrast: 150,
		colorblind: "tritanopia",
		uiScale: 150,
		gore: false,
	});
});
