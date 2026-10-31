export type { PlatformInfo, PlatformScope, Runtime } from "./detect";
export { detectPlatform } from "./detect";
export type {
	GamepadLike,
	InputSources,
	InputSourcesOptions,
	KeyBindings,
	KeyboardSource,
	PadBindings,
} from "./input";
export {
	applyDeadZone,
	createInputSources,
	createKeyboardSource,
	DEAD_ZONE,
	DEFAULT_BINDINGS,
	readGamepad,
} from "./input";
export type { ElectronStorage, ElectronStorageBridge } from "./storage/electron";
export { createElectronStorage } from "./storage/electron";
export { migrateStorage } from "./storage/migrate";
export { createCapacitorStorage } from "./storage/stubs";
export type { PlatformStorage, StorageKey } from "./storage/types";
export { MAX_VALUE_BYTES, NotImplementedError, STORAGE_KEYS } from "./storage/types";
export { createWebStorage } from "./storage/web";
