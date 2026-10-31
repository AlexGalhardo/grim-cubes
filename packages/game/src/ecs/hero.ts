import { addComponent } from "bitecs";
import { Health, PlayerFaction, Radius, Speed, Velocity } from "./components";
import { type GameWorld, spawnBody } from "./world";

export interface HeroSpec {
	speed: number;
	maxHp: number;
	radius: number;
}

/** The hero: a body tagged PlayerFaction with the components the per-step systems read. */
export function spawnHero(world: GameWorld, spec: HeroSpec): number {
	const eid = spawnBody(world, 0, 0);
	for (const c of [PlayerFaction, Velocity, Speed, Health, Radius]) addComponent(world, eid, c);
	Speed.value[eid] = spec.speed;
	Health.hp[eid] = Health.max[eid] = spec.maxHp;
	Radius.r[eid] = spec.radius;
	return eid;
}
