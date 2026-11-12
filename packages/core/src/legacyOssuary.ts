/**
 * Cost in souls of every node of the Ossuary tree of schemas 1 to 14 (stat branches: flesh, steel, shadow, gold, ruin).
 * Schema 15 replaced that tree with the spell tree, and `migrateOssuary` gives back these souls for each node a
 * profile owned. The tree no longer exists in `data/ossuary.json`, so the numbers live here, frozen.
 */
export const LEGACY_OSSUARY_COSTS: Readonly<Record<string, number>> = {
	flesh_1: 50,
	flesh_2: 100,
	flesh_3: 200,
	flesh_4: 350,
	flesh_5: 550,
	flesh_6: 800,
	steel_1: 50,
	steel_2: 100,
	steel_3: 200,
	steel_4: 350,
	steel_5: 550,
	steel_6: 800,
	shadow_1: 50,
	shadow_2: 100,
	shadow_3: 200,
	shadow_4: 350,
	shadow_5: 550,
	shadow_6: 800,
	gold_1: 50,
	gold_2: 100,
	gold_3: 200,
	gold_4: 350,
	gold_5: 550,
	gold_6: 800,
	ruin_1: 50,
	ruin_2: 100,
	ruin_3: 200,
	ruin_4: 350,
	ruin_5: 550,
	ruin_6: 800,
};
