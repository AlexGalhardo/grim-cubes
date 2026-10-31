import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Obj = Record<string, unknown>;
export type Data = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const objs = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Cross-field and cross-file rules that JSON Schema cannot express. Skips malformed entries (the schema reports them). */
export function checkRules(data: Data): string[] {
	const errors: string[] = [];
	const push = (message: string): void => void errors.push(message);

	// props.json x biomes.json: a prop listed under a biome list must have that kind.
	const kindOf = new Map<string, string>();
	for (const prop of objs(data["props.json"])) {
		const id = str(prop.id);
		const kind = str(prop.kind);
		if (id && kind) kindOf.set(id, kind);
	}
	for (const biome of objs(data["biomes.json"])) {
		if (!isObj(biome.props)) continue;
		for (const [list, ids] of Object.entries(biome.props)) {
			for (const id of Array.isArray(ids) ? ids : []) {
				const kind = typeof id === "string" ? kindOf.get(id) : undefined;
				if (kind !== undefined && kind !== list)
					push(
						`biomes.json: ${str(biome.id)}.props.${list} lists "${String(id)}" but props.json kind is "${kind}"`,
					);
			}
		}
	}

	// world.json
	const world = data["world.json"];
	if (isObj(world)) {
		const load = num(world.loadRadius);
		const unload = num(world.unloadRadius);
		const pool = num(world.poolSize);
		if (load !== undefined && unload !== undefined && unload <= load)
			push(`world.json: unloadRadius ${unload} must be greater than loadRadius ${load}`);
		if (unload !== undefined && pool !== undefined && pool < (2 * (unload - 1) + 1) ** 2)
			push(
				`world.json: poolSize ${pool} is below (2 * (unloadRadius - 1) + 1)^2 = ${(2 * (unload - 1) + 1) ** 2}`,
			);
	}

	// weapons.json
	for (const weapon of objs(data["weapons.json"])) {
		const id = str(weapon.id);
		const mult = Array.isArray(weapon.damageMult) ? weapon.damageMult.length : undefined;
		const prices = Array.isArray(weapon.upgradePrices) ? weapon.upgradePrices.length : undefined;
		if (mult !== undefined && prices !== undefined && mult !== prices + 1)
			push(
				`weapons.json: ${id} damageMult has ${mult} tiers but upgradePrices has ${prices} (expected tiers - 1)`,
			);
		const unlock = num(weapon.unlockRound);
		if (unlock !== undefined && unlock < 1) push(`weapons.json: ${id} unlockRound must be >= 1`);
		if (str(weapon.kind) !== "melee") {
			const speed = isObj(weapon.projectile) ? num(weapon.projectile.speed) : undefined;
			if (speed === undefined || speed <= 0)
				push(`weapons.json: ${id} (${str(weapon.kind)}) needs projectile.speed > 0`);
		}
	}

	// rounds.json
	const rounds = data["rounds.json"];
	if (isObj(rounds)) {
		const tiers = objs(rounds.tierChance).map((t) => t.tier);
		if (new Set(tiers).size !== tiers.length) push("rounds.json: tierChance has duplicate tiers");
		const difficulties = objs(rounds.difficulties);
		const ids = new Set(difficulties.map((d) => str(d.id)));
		for (const d of difficulties) {
			const needs = isObj(d.unlockedBy) ? str(d.unlockedBy.difficulty) : undefined;
			if (needs !== undefined && !ids.has(needs))
				push(`rounds.json: difficulty ${str(d.id)} unlockedBy unknown difficulty "${needs}"`);
		}
		const mult = isObj(rounds.boss) ? num(rounds.boss.hordeIntervalMult) : undefined;
		if (mult === undefined || mult <= 0) push("rounds.json: boss.hordeIntervalMult must be > 0");
	}

	// ossuary.json
	const ossuary = data["ossuary.json"];
	if (isObj(ossuary)) {
		const demo = num(ossuary.demoMaxNodeIndex);
		for (const branch of objs(ossuary.branches)) {
			const nodes = objs(branch.nodes);
			const name = str(branch.id);
			nodes.forEach((node, i) => {
				const expected = i === 0 ? null : (str(nodes[i - 1]?.id) ?? null);
				if ((node.requires ?? null) !== expected)
					push(
						`ossuary.json: ${name} node ${str(node.id)} requires ${JSON.stringify(node.requires)}, expected ${JSON.stringify(expected)} (linear chain)`,
					);
				const prev = num(nodes[i - 1]?.cost);
				const cost = num(node.cost);
				if (i > 0 && prev !== undefined && cost !== undefined && cost <= prev)
					push(
						`ossuary.json: ${name} node ${str(node.id)} cost ${cost} must exceed the previous ${prev}`,
					);
			});
			if (demo !== undefined && demo >= nodes.length)
				push(
					`ossuary.json: demoMaxNodeIndex ${demo} is not below the ${nodes.length} nodes of ${name}`,
				);
		}
	}

	// cards.json
	const cards = data["cards.json"];
	if (isObj(cards)) {
		const bonuses = isObj(cards.doubleCard) ? num(cards.doubleCard.bonuses) : undefined;
		const count = Array.isArray(cards.cards) ? cards.cards.length : 0;
		if (bonuses !== undefined && bonuses > count)
			push(`cards.json: doubleCard.bonuses ${bonuses} exceeds the ${count} cards`);
	}

	// bosses.json
	const seen = new Set<number>();
	for (const boss of objs(data["bosses.json"])) {
		const round = num(boss.round);
		if (round === undefined) continue;
		if (seen.has(round)) push(`bosses.json: round ${round} used by more than one boss`);
		seen.add(round);
		if (round % 10 !== 0) push(`bosses.json: ${str(boss.id)} round ${round} is not a multiple of 10`);
	}

	return errors;
}

/** Data -> assets (SDD 09): every implemented id has a model, the biome music has a prompt entry. */
export function checkAssets(data: Data, assetsDir: string): string[] {
	const errors: string[] = [];
	const model = (category: string, id: string, owner: string): void => {
		if (!existsSync(join(assetsDir, "models", category, `${id}.bbmodel`)))
			errors.push(`${owner} references missing model models/${category}/${id}.bbmodel`);
	};

	for (const prop of objs(data["props.json"])) {
		const id = str(prop.id);
		if (id) model("props", id, `props.json ${id}`);
	}
	// Only biomes that define floor tiles are playable so far; the others still list enemies without a model.
	for (const biome of objs(data["biomes.json"])) {
		const name = str(biome.id) ?? "?";
		const tiles = Array.isArray(biome.floorTiles) ? biome.floorTiles : [];
		if (tiles.length === 0) continue;
		for (const tile of tiles)
			if (typeof tile === "string") model("tiles", tile, `biomes.json ${name} floorTiles`);
		for (const enemy of Array.isArray(biome.enemyPool) ? biome.enemyPool : [])
			if (typeof enemy === "string") model("enemies", enemy, `biomes.json ${name} enemyPool`);
		const music = str(biome.music);
		if (music !== undefined) {
			const promptsPath = join(assetsDir, "audio", "prompts.json");
			let files = new Set<string>();
			try {
				const parsed: unknown = JSON.parse(readFileSync(promptsPath, "utf8"));
				files = new Set(objs(parsed).map((p) => str(p.file) ?? ""));
			} catch {
				errors.push(
					`biomes.json ${name} music "${music}" references missing audio (no readable audio/prompts.json)`,
				);
				continue;
			}
			if (!files.has(music))
				errors.push(
					`biomes.json ${name} music "${music}" references missing audio entry in audio/prompts.json`,
				);
		}
	}
	for (const boss of objs(data["bosses.json"])) {
		if (str(boss.id) === "gravedigger") model("bosses", "gravedigger", "bosses.json gravedigger");
	}
	return errors;
}
