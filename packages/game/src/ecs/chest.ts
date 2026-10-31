import { addComponent } from "bitecs";
import { Chest, Position, PrevPosition } from "./components";
import { type GameWorld, spawn } from "./world";

export function dropChest(world: GameWorld, x: number, z: number, tier: number): number {
	const e = spawn(world);
	addComponent(world, e, Chest);
	addComponent(world, e, Position);
	addComponent(world, e, PrevPosition);
	Position.x[e] = PrevPosition.x[e] = x;
	Position.z[e] = PrevPosition.z[e] = z;
	Chest.tier[e] = tier;
	return e;
}
