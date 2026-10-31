declare const __APP_VERSION__: string;
declare const __BUILD_TARGET__: "web" | "electron" | "android";
declare const __IS_DEMO__: boolean;
declare const __DEBUG_API__: boolean;

interface Window {
	/** Set by the Electron preload only: the platform and the save files (ADR-0009). */
	gcDesktop?: {
		platform: string;
		steam: boolean;
		storage: import("@gc/platform").ElectronStorageBridge;
	};
}
