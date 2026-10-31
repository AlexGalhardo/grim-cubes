import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAssets, checkRules } from "./rules";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };
type Schema = JsonObject;

export type DataSet = Record<string, Json>;
export type SchemaSet = Record<string, Schema>;

const DEFAULT_DATA_DIR = fileURLToPath(new URL("../../data", import.meta.url));

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeOf(value: Json): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

function matchesType(value: Json, type: string): boolean {
	if (type === "integer") return typeof value === "number" && Number.isInteger(value);
	return typeOf(value) === type;
}

/**
 * Minimal JSON Schema subset: the keywords the files in data/schema use
 * (type, enum, const, required, properties, additionalProperties:false, items,
 * minItems, maxItems, minimum, maximum, minLength, pattern, $ref to "#/$defs/x"
 * or "file.schema.json#/$defs/x"). Any other keyword is ignored.
 */
function resolveRef(ref: string, schemas: SchemaSet, current: string): Schema {
	const [file = "", pointer = ""] = ref.split("#");
	const root = schemas[file === "" ? current : file];
	if (root === undefined) throw new Error(`unknown schema file in $ref: ${ref}`);
	let node: Json = root;
	for (const part of pointer.split("/").filter((p) => p !== "")) {
		if (!isObject(node) || !(part in node)) throw new Error(`unresolved $ref: ${ref}`);
		node = node[part] as Json;
	}
	if (!isObject(node)) throw new Error(`$ref does not point to a schema: ${ref}`);
	return node;
}

function validate(
	value: Json,
	schema: Schema,
	schemas: SchemaSet,
	file: string,
	path: string,
	errors: string[],
): void {
	const ref = schema.$ref;
	if (typeof ref === "string") {
		const target = resolveRef(ref, schemas, file);
		const targetFile =
			ref.includes("#") && ref.split("#")[0] !== "" ? (ref.split("#")[0] as string) : file;
		validate(value, target, schemas, targetFile, path, errors);
		return;
	}

	const type = schema.type;
	if (type !== undefined) {
		const types = Array.isArray(type) ? type : [type];
		if (!types.some((t) => typeof t === "string" && matchesType(value, t))) {
			errors.push(`${path}: expected ${types.join("|")}, got ${typeOf(value)}`);
			return;
		}
	}
	if (Array.isArray(schema.enum) && !schema.enum.some((e) => e === value)) {
		errors.push(`${path}: ${JSON.stringify(value)} not in enum [${schema.enum.join(", ")}]`);
	}
	if ("const" in schema && schema.const !== value)
		errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);

	if (typeof value === "number") {
		if (typeof schema.minimum === "number" && value < schema.minimum)
			errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
		if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum)
			errors.push(`${path}: ${value} <= exclusiveMinimum ${schema.exclusiveMinimum}`);
		if (typeof schema.maximum === "number" && value > schema.maximum)
			errors.push(`${path}: ${value} > maximum ${schema.maximum}`);
	}
	if (typeof value === "string") {
		if (typeof schema.minLength === "number" && value.length < schema.minLength)
			errors.push(`${path}: string shorter than ${schema.minLength}`);
		if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value))
			errors.push(`${path}: "${value}" does not match ${schema.pattern}`);
	}
	if (Array.isArray(value)) {
		if (typeof schema.minItems === "number" && value.length < schema.minItems)
			errors.push(`${path}: fewer than ${schema.minItems} items`);
		if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
			errors.push(`${path}: more than ${schema.maxItems} items`);
		if (isObject(schema.items)) {
			const itemSchema = schema.items;
			for (const [i, item] of value.entries())
				validate(item, itemSchema, schemas, file, `${path}[${i}]`, errors);
		}
	}
	if (isObject(value)) {
		const properties = isObject(schema.properties) ? schema.properties : {};
		if (Array.isArray(schema.required)) {
			for (const key of schema.required) {
				if (typeof key === "string" && !(key in value))
					errors.push(`${path}: missing required "${key}"`);
			}
		}
		for (const [key, child] of Object.entries(value)) {
			const childSchema = properties[key];
			if (isObject(childSchema)) validate(child, childSchema, schemas, file, `${path}.${key}`, errors);
			else if (schema.additionalProperties === false)
				errors.push(`${path}: unexpected property "${key}"`);
		}
	}
}

function asArray(value: Json | undefined): JsonObject[] {
	return Array.isArray(value) ? value.filter(isObject) : [];
}

function idOf(entry: JsonObject): string | undefined {
	return typeof entry.id === "string" ? entry.id : undefined;
}

function checkUniqueIds(label: string, entries: JsonObject[], errors: string[]): Set<string> {
	const seen = new Set<string>();
	for (const entry of entries) {
		const id = idOf(entry);
		if (id === undefined) continue;
		if (seen.has(id)) errors.push(`${label}: duplicate id "${id}"`);
		seen.add(id);
	}
	return seen;
}

function paramString(entry: JsonObject, key: string): string | undefined {
	const params = entry.params;
	if (!isObject(params)) return undefined;
	const value = params[key];
	return typeof value === "string" ? value : undefined;
}

/** Duplicate ids and cross references. Assumes nothing about schema validity: skips malformed entries. */
export function checkIntegrity(data: DataSet): string[] {
	const errors: string[] = [];

	const enemyIds = checkUniqueIds("enemies.json", asArray(data["enemies.json"]), errors);
	const itemIds = checkUniqueIds("items.json", asArray(data["items.json"]), errors);
	const weaponIds = checkUniqueIds("weapons.json", asArray(data["weapons.json"]), errors);
	checkUniqueIds("bosses.json", asArray(data["bosses.json"]), errors);

	const propIds = checkUniqueIds("props.json", asArray(data["props.json"]), errors);
	const biomes = asArray(data["biomes.json"]);
	checkUniqueIds("biomes.json", biomes, errors);
	for (const biome of biomes) {
		const lists = isObject(biome.props) ? Object.values(biome.props) : [];
		for (const list of lists) {
			for (const prop of Array.isArray(list) ? list : []) {
				if (typeof prop === "string" && !propIds.has(prop)) {
					errors.push(`biomes.json: ${idOf(biome)}.props references unknown prop "${prop}"`);
				}
			}
		}
	}
	const rings = new Set(biomes.map((b) => b.ring).filter((r): r is number => typeof r === "number"));
	for (const biome of biomes) {
		const pool = Array.isArray(biome.enemyPool) ? biome.enemyPool : [];
		for (const enemy of pool) {
			if (typeof enemy === "string" && !enemyIds.has(enemy))
				errors.push(`biomes.json: ${idOf(biome)}.enemyPool references unknown enemy "${enemy}"`);
		}
	}
	for (const enemy of asArray(data["enemies.json"])) {
		if (typeof enemy.biomeRing === "number" && !rings.has(enemy.biomeRing))
			errors.push(`enemies.json: ${idOf(enemy)}.biomeRing ${enemy.biomeRing} has no biome`);
		const params = enemy.behaviorParams;
		if (isObject(params) && typeof params.spawnEnemy === "string" && !enemyIds.has(params.spawnEnemy)) {
			errors.push(
				`enemies.json: ${idOf(enemy)}.behaviorParams.spawnEnemy references unknown enemy "${params.spawnEnemy}"`,
			);
		}
	}

	for (const boss of asArray(data["bosses.json"])) {
		for (const pattern of asArray(boss.patterns)) {
			const target = paramString(pattern, "enemy");
			if (target !== undefined && !enemyIds.has(target))
				errors.push(
					`bosses.json: ${idOf(boss)}.${idOf(pattern)} references unknown enemy "${target}"`,
				);
		}
	}

	const hero = data["hero.json"];
	if (isObject(hero) && typeof hero.startingWeapon === "string" && !weaponIds.has(hero.startingWeapon)) {
		errors.push(`hero.json: startingWeapon references unknown weapon "${hero.startingWeapon}"`);
	}

	const cards = data["cards.json"];
	if (isObject(cards)) checkUniqueIds("cards.json", asArray(cards.cards), errors);

	const elites = data["elites.json"];
	if (isObject(elites)) checkUniqueIds("elites.json", asArray(elites.modifiers), errors);

	const ossuary = data["ossuary.json"];
	if (isObject(ossuary)) {
		const branches = asArray(ossuary.branches);
		checkUniqueIds("ossuary.json branches", branches, errors);
		const nodes = branches.flatMap((b) => asArray(b.nodes));
		const nodeIds = checkUniqueIds("ossuary.json nodes", nodes, errors);
		for (const node of nodes) {
			if (typeof node.requires === "string" && !nodeIds.has(node.requires))
				errors.push(`ossuary.json: ${idOf(node)}.requires unknown node "${node.requires}"`);
			for (const effect of asArray(node.effects)) {
				const item = paramString(effect, "onlyWithoutItem");
				if (item !== undefined && !itemIds.has(item))
					errors.push(`ossuary.json: ${idOf(node)} references unknown item "${item}"`);
			}
		}
	}

	return errors;
}

export function checkAll(data: DataSet, schemas: SchemaSet, assetsDir?: string): string[] {
	const errors: string[] = [];
	for (const [file, value] of Object.entries(data)) {
		const schemaName = file.replace(/\.json$/, ".schema.json");
		const schema = schemas[schemaName];
		if (schema === undefined) {
			errors.push(`${file}: no schema ${schemaName}`);
			continue;
		}
		const fileErrors: string[] = [];
		validate(value, schema, schemas, schemaName, "$", fileErrors);
		errors.push(...fileErrors.map((e) => `${file}: ${e}`));
	}
	errors.push(...checkIntegrity(data), ...checkRules(data));
	if (assetsDir !== undefined) errors.push(...checkAssets(data, assetsDir));
	return errors;
}

function readJson(path: string): Json {
	return JSON.parse(readFileSync(path, "utf8")) as Json;
}

export function loadDir(dataDir: string): { data: DataSet; schemas: SchemaSet } {
	const data: DataSet = {};
	for (const file of readdirSync(dataDir).filter((f) => f.endsWith(".json")))
		data[file] = readJson(join(dataDir, file));
	const schemas: SchemaSet = {};
	const schemaDir = join(dataDir, "schema");
	if (existsSync(schemaDir)) {
		for (const file of readdirSync(schemaDir).filter((f) => f.endsWith(".schema.json"))) {
			const schema = readJson(join(schemaDir, file));
			if (isObject(schema)) schemas[file] = schema;
		}
	}
	return { data, schemas };
}

const EXPECTED_FILES = [
	"world",
	"enemies",
	"elites",
	"bosses",
	"weapons",
	"items",
	"cards",
	"ossuary",
	"rounds",
	"biomes",
	"hero",
	"props",
	"render",
].map((n) => `${n}.json`);

/** `assets/src` next to the data dir, if it exists (fixtures without assets skip the data -> assets check). */
export function defaultAssetsDir(dataDir: string): string | undefined {
	const dir = resolve(dirname(dataDir), "assets", "src");
	return existsSync(dir) ? dir : undefined;
}

export function checkDir(
	dataDir: string,
	assetsDir: string | undefined = defaultAssetsDir(dataDir),
): string[] {
	const { data, schemas } = loadDir(dataDir);
	const missing = EXPECTED_FILES.filter((f) => !(f in data)).map((f) => `${f}: file missing`);
	return [...missing, ...checkAll(data, schemas, assetsDir)];
}

/** Negative cases: every mutation must be reported. Returns the cases that went undetected. */
export function selfTest(
	dataDir: string,
	assetsDir: string | undefined = defaultAssetsDir(dataDir),
): string[] {
	const { data, schemas } = loadDir(dataDir);
	const clone = (): DataSet => structuredClone(data);
	const cases: Array<[string, (d: DataSet) => void, boolean?]> = [
		[
			"duplicate item id",
			(d) => {
				const items = asArray(d["items.json"]);
				const first = items[0];
				const last = items[items.length - 1];
				if (first && last) last.id = first.id as string;
			},
		],
		[
			"unknown enemy in biome pool",
			(d) => {
				const b = asArray(d["biomes.json"])[0];
				if (b) b.enemyPool = ["ghost"];
			},
		],
		[
			"unknown ossuary requires",
			(d) => {
				const n = asArray(asArray((d["ossuary.json"] as JsonObject).branches)[0]?.nodes)[1];
				if (n) n.requires = "nope";
			},
		],
		[
			"schema: bad stat",
			(d) => {
				const m = asArray(asArray(d["items.json"])[0]?.modifiers)[0];
				if (m) m.stat = "mana";
			},
		],
		[
			"unknown hero weapon",
			(d) => {
				const h = d["hero.json"];
				if (isObject(h)) h.startingWeapon = "nope";
			},
		],
		[
			"world: missing poolSize",
			(d) => {
				const w = d["world.json"];
				if (isObject(w)) delete w.poolSize;
			},
		],
		[
			"effect id outside the enum",
			(d) => {
				const e = asArray(
					asArray(d["items.json"]).find((i) => asArray(i.effects).length > 0)?.effects,
				)[0];
				if (e) e.id = "not_an_effect";
			},
		],
		[
			"prop kind differs from the biome list",
			(d) => {
				const p = asArray(d["props.json"]).find((x) => x.kind === "decor");
				if (p) p.kind = "breakable";
			},
		],
		[
			"world: unloadRadius <= loadRadius",
			(d) => {
				const w = d["world.json"];
				if (isObject(w)) w.unloadRadius = w.loadRadius as number;
			},
		],
		[
			"world: pool too small",
			(d) => {
				const w = d["world.json"];
				if (isObject(w)) w.poolSize = 10;
			},
		],
		[
			"weapon: damageMult / upgradePrices mismatch",
			(d) => {
				const w = asArray(d["weapons.json"])[0];
				if (w) w.upgradePrices = [1];
			},
		],
		[
			"weapon: unlockRound 0",
			(d) => {
				const w = asArray(d["weapons.json"])[0];
				if (w) w.unlockRound = 0;
			},
		],
		[
			"weapon: ranged without projectile speed",
			(d) => {
				const w = asArray(d["weapons.json"]).find((x) => x.kind !== "melee");
				if (w && isObject(w.projectile)) w.projectile.speed = 0;
			},
		],
		[
			"rounds: duplicate tier",
			(d) => {
				const r = d["rounds.json"];
				if (isObject(r)) {
					const t = asArray(r.tierChance);
					if (t[1] && t[0]) t[1].tier = t[0].tier as number;
				}
			},
		],
		[
			"rounds: unlockedBy unknown difficulty",
			(d) => {
				const r = d["rounds.json"];
				if (isObject(r)) {
					const u = asArray(r.difficulties).find((x) => isObject(x.unlockedBy))?.unlockedBy;
					if (isObject(u)) u.difficulty = "nope";
				}
			},
		],
		[
			"rounds: hordeIntervalMult 0",
			(d) => {
				const r = d["rounds.json"];
				if (isObject(r) && isObject(r.boss)) r.boss.hordeIntervalMult = 0;
			},
		],
		[
			"ossuary: broken chain",
			(d) => {
				const o = d["ossuary.json"];
				if (isObject(o)) {
					const n = asArray(asArray(o.branches)[0]?.nodes)[2];
					if (n) n.requires = null;
				}
			},
		],
		[
			"ossuary: cost not increasing",
			(d) => {
				const o = d["ossuary.json"];
				if (isObject(o)) {
					const n = asArray(asArray(o.branches)[0]?.nodes)[2];
					if (n) n.cost = 1;
				}
			},
		],
		[
			"ossuary: demoMaxNodeIndex out of range",
			(d) => {
				const o = d["ossuary.json"];
				if (isObject(o)) o.demoMaxNodeIndex = 99;
			},
		],
		[
			"cards: doubleCard.bonuses > cards",
			(d) => {
				const c = d["cards.json"];
				if (isObject(c) && isObject(c.doubleCard)) c.doubleCard.bonuses = 999;
			},
		],
		[
			"bosses: duplicate round",
			(d) => {
				const b = asArray(d["bosses.json"]);
				if (b[1] && b[0]) b[1].round = b[0].round as number;
			},
		],
		[
			"bosses: round not a multiple of 10",
			(d) => {
				const b = asArray(d["bosses.json"])[0];
				if (b) b.round = 7;
			},
		],
		[
			"bosses: bad delivery",
			(d) => {
				const b = asArray(d["bosses.json"])[0];
				if (b) b.delivery = "SOON";
			},
		],
		[
			"hero: dodge above 1",
			(d) => {
				const h = d["hero.json"];
				if (isObject(h) && isObject(h.caps)) h.caps.dodge = 1.5;
			},
		],
		[
			"hero: radius 0",
			(d) => {
				const h = d["hero.json"];
				if (isObject(h) && isObject(h.base)) h.base.radius = 0;
			},
		],
		[
			"hero: speedMin above 0",
			(d) => {
				const h = d["hero.json"];
				if (isObject(h) && isObject(h.caps)) h.caps.speedMin = 0.5;
			},
		],
		[
			"assets: missing floor tile model",
			(d) => {
				const b = asArray(d["biomes.json"]).find((x) => Array.isArray(x.floorTiles));
				if (b && Array.isArray(b.floorTiles)) b.floorTiles[0] = "tile_missing_99";
			},
			true,
		],
		[
			"assets: missing biome music",
			(d) => {
				const b = asArray(d["biomes.json"]).find((x) => typeof x.music === "string");
				if (b) b.music = "mus_missing";
			},
			true,
		],
		[
			"schema: missing required",
			(d) => {
				const e = asArray(d["enemies.json"])[0];
				if (e) delete e.hpBase;
			},
		],
	];
	const baseline = checkAll(data, schemas, assetsDir);
	const undetected = baseline.length > 0 ? [`baseline data is invalid: ${baseline[0]}`] : [];
	for (const [label, mutate, needsAssets] of cases) {
		if (needsAssets && assetsDir === undefined) continue;
		const copy = clone();
		mutate(copy);
		if (checkAll(copy, schemas, assetsDir).length === 0) undetected.push(label);
	}
	return undetected;
}

function main(argv: string[]): number {
	const dirFlag = argv.indexOf("--data");
	const dataDir = dirFlag >= 0 ? (argv[dirFlag + 1] ?? DEFAULT_DATA_DIR) : DEFAULT_DATA_DIR;

	const assetsFlag = argv.indexOf("--assets");
	const assetsDir = argv.includes("--no-assets")
		? undefined
		: assetsFlag >= 0
			? resolve(argv[assetsFlag + 1] ?? "assets/src")
			: defaultAssetsDir(dataDir);

	if (argv.includes("--self-test")) {
		const undetected = selfTest(dataDir, assetsDir);
		for (const u of undetected) console.error(`self-test FAIL: not detected: ${u}`);
		if (undetected.length === 0) console.log("data-check self-test: all negative cases detected");
		return undetected.length === 0 ? 0 : 1;
	}

	const errors = checkDir(dataDir, assetsDir);
	for (const e of errors) console.error(e);
	console.log(
		errors.length === 0 ? `data-check: OK (${dataDir})` : `data-check: ${errors.length} error(s)`,
	);
	return errors.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
