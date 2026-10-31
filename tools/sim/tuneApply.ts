import { bossesData, enemiesData, roundsData } from "../../packages/game/src/index";
import type { TuneOptions } from "./tuneArgs";

/** Applies the overrides to the data loaded in this thread (each worker applies them to its own copy). */
export function applyTuning(options: TuneOptions): void {
	for (const enemy of enemiesData as unknown as {
		damageBase: number;
		damagePerRound: number;
		hpPerRound: number;
	}[]) {
		enemy.damageBase *= options.damageBase;
		enemy.damagePerRound *= options.damageGrowth;
		enemy.hpPerRound *= options.hpGrowth;
	}
	roundsData.boss.contactDamageBase *= options.bossContact;
	roundsData.boss.contactDamagePerRound *= options.bossContact;
	for (const [i, boss] of bossesData.entries()) {
		const mutable = boss as unknown as { hpBaseRound10: number; contactDamageMult?: number };
		mutable.hpBaseRound10 = options.bossHp[i] ?? mutable.hpBaseRound10;
		mutable.contactDamageMult = options.bossMult[i] ?? mutable.contactDamageMult ?? 1;
	}
	for (const { pattern, param, value } of options.patterns) {
		let found = false;
		for (const boss of bossesData) {
			for (const p of boss.patterns) {
				if (p.id !== pattern) continue;
				p.params = { ...p.params, [param]: value };
				found = true;
			}
		}
		if (!found) throw new Error(`no boss pattern "${pattern}"`);
	}
	for (const [group, values] of Object.entries(options.rounds_data)) {
		const target = (roundsData as unknown as Record<string, Record<string, number>>)[group];
		if (!target) throw new Error(`rounds.json has no group "${group}"`);
		Object.assign(target, values);
	}
}
