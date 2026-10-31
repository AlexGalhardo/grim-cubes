export interface TuneOptions {
	/** Multiplies every enemy `damageBase`. */
	damageBase: number;
	/** Multiplies every enemy `damagePerRound`. */
	damageGrowth: number;
	/** Multiplies every enemy `hpPerRound`. */
	hpGrowth: number;
	/** `hpBaseRound10` per boss, in bosses.json order; missing entries keep the file value. */
	bossHp: number[];
	/** Multiplies `rounds.boss.contactDamageBase` and `contactDamagePerRound`. */
	bossContact: number;
	/** `contactDamageMult` per boss, in bosses.json order. */
	bossMult: number[];
	runs: number;
	rounds: number;
	seed: number;
	/** `pattern.param=value` overrides on boss patterns, e.g. `mud_pool.damageMult=2`. */
	patterns: { pattern: string; param: string; value: number }[];
	/** Deep-assigned onto rounds.json groups, e.g. `{"xp":{"base":8}}`. */
	rounds_data: Record<string, Record<string, number>>;
}

export const TUNE_DEFAULTS: TuneOptions = {
	damageBase: 1,
	damageGrowth: 1,
	hpGrowth: 1,
	bossHp: [],
	bossContact: 1,
	bossMult: [],
	runs: 16,
	rounds: 35,
	seed: 1,
	patterns: [],
	rounds_data: {},
};

const numbers = (text: string): number[] => text.split(",").map(Number);

function numberOf(name: string, text: string | undefined): number {
	const value = Number(text);
	if (text === undefined || !Number.isFinite(value))
		throw new Error(`${name} needs a number, got "${text}"`);
	return value;
}

/** Parses the flags of `tools/sim/tune.ts`; unknown flags and bad numbers throw so a typo never tunes nothing. */
export function parseTuneArgs(argv: readonly string[]): TuneOptions {
	const out: TuneOptions = { ...TUNE_DEFAULTS, patterns: [], rounds_data: {} };
	for (let i = 0; i < argv.length; i += 2) {
		const flag = argv[i];
		const value = argv[i + 1];
		switch (flag) {
			case "--damage-base":
				out.damageBase = numberOf(flag, value);
				break;
			case "--damage-growth":
				out.damageGrowth = numberOf(flag, value);
				break;
			case "--hp-growth":
				out.hpGrowth = numberOf(flag, value);
				break;
			case "--boss-hp":
				out.bossHp = numbers(value ?? "");
				break;
			case "--boss-contact":
				out.bossContact = numberOf(flag, value);
				break;
			case "--boss-mult":
				out.bossMult = numbers(value ?? "");
				break;
			case "--runs":
				out.runs = numberOf(flag, value);
				break;
			case "--rounds":
				out.rounds = numberOf(flag, value);
				break;
			case "--seed":
				out.seed = numberOf(flag, value);
				break;
			case "--pattern": {
				const match = /^([a-z_]+)\.([A-Za-z]+)=(-?[0-9.]+)$/.exec(value ?? "");
				if (!match) throw new Error(`--pattern needs pattern.param=value, got "${value}"`);
				out.patterns.push({
					pattern: match[1] ?? "",
					param: match[2] ?? "",
					value: Number(match[3]),
				});
				break;
			}
			case "--rounds-data":
				out.rounds_data = JSON.parse(value ?? "{}") as Record<string, Record<string, number>>;
				break;
			default:
				throw new Error(`unknown option ${flag}`);
		}
		if (value === undefined) throw new Error(`${flag} needs a value`);
	}
	if (out.bossHp.some(Number.isNaN) || out.bossMult.some(Number.isNaN)) throw new Error("bad number list");
	return out;
}
