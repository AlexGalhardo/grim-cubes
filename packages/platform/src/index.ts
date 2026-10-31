export type { PlatformInfo, PlatformScope, Runtime } from "./detect";
export { detectPlatform } from "./detect";
export { createCapacitorStorage, createElectronStorage } from "./storage/stubs";
export type { PlatformStorage, StorageKey } from "./storage/types";
export { MAX_VALUE_BYTES, NotImplementedError, STORAGE_KEYS } from "./storage/types";
export { createWebStorage } from "./storage/web";
