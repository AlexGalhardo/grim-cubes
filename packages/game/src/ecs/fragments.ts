import { addComponent } from "bitecs";
import { Fragment, Position, PrevPosition } from "./components";
import { type GameWorld, spawn } from "./world";

export function dropFragment(world: GameWorld, x: number, z: number, value: number): number {
	const e = spawn(world);
	addComponent(world, e, Fragment);
	addComponent(world, e, Position);
	addComponent(world, e, PrevPosition);
	Position.x[e] = PrevPosition.x[e] = x;
	Position.z[e] = PrevPosition.z[e] = z;
	Fragment.value[e] = value;
	return e;
}
