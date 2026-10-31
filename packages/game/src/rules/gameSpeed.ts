export const GAME_SPEEDS = [1, 2, 3] as const;
export type GameSpeed = (typeof GAME_SPEEDS)[number];

/** The TAB / button cycle: 1x, 2x, 3x, back to 1x. */
export function nextSpeed(speed: number): GameSpeed {
	return speed === 1 ? 2 : speed === 2 ? 3 : 1;
}
