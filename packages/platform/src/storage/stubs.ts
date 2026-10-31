import { NotImplementedError, type PlatformStorage } from "./types";

function stub(name: string): PlatformStorage {
	const fail = async (): Promise<never> => {
		throw new NotImplementedError(`${name} storage`);
	};
	return { read: fail, write: fail };
}

export const createElectronStorage = (): PlatformStorage => stub("electron");
export const createCapacitorStorage = (): PlatformStorage => stub("capacitor");
