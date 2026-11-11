declare const __APP_VERSION__: string;
declare const __BUILD_TARGET__: "web" | "electron" | "android";
declare const __IS_DEMO__: boolean;
declare const __DEBUG_API__: boolean;
/** Steam store page for the "Wishlist na Steam" button; empty hides the button (`GC_WISHLIST_URL` at build time). */
declare const __WISHLIST_URL__: string;

interface Window {
	/** Set by the Electron preload only: the platform and the save files (ADR-0009). */
	gcDesktop?: {
		platform: string;
		steam: boolean;
		/** Closes the app (the main process checks the sender). */
		quit(): Promise<void>;
		/** Opens the Steam store page in the system browser (the main process allows only that URL). */
		openExternal(url: string): Promise<void>;
		storage: import("@gc/platform").ElectronStorageBridge;
	};
}
