export interface GcGlobal {
	ready: boolean;
	/** Cheats and probes; only present in non-production builds (SDD 11 §2). */
	debug?: Record<string, unknown>;
}

declare global {
	interface Window {
		gc: GcGlobal;
	}
}
