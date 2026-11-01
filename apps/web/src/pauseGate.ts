export interface PauseGate {
	pauseOpen: boolean;
	/** The title menu is the screen. */
	menuOpen: boolean;
	/** `RunState` name. */
	runState: string;
	levelUpOffer: boolean;
	chestOffer: boolean;
	/** Options, difficulty, slots or the Ossuary is open. */
	screenOpen: boolean;
}

/**
 * Whether Esc, Start or the pause button may open the pause menu now. It reads the game's own state, not the DOM:
 * the dialog of a card just chosen stays in the page until the next HUD publish, and a DOM check made the first Esc
 * after a level-up fall on that stale dialog and do nothing.
 */
export function canOpenPause(gate: PauseGate): boolean {
	if (gate.pauseOpen || gate.menuOpen || gate.screenOpen || gate.levelUpOffer || gate.chestOffer)
		return false;
	// The shop is a screen of its own; the others have no pausing to do.
	return !["Idle", "Results", "Dying", "Shop", "Paused"].includes(gate.runState);
}
