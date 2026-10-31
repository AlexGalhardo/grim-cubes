import { contextBridge, ipcRenderer } from "electron";

/**
 * The page's whole view of the shell: the platform, no Steam yet (B-04-01) and the save files (ADR-0009). The keys are
 * validated again in the main process; the page never names a path.
 */
contextBridge.exposeInMainWorld("gcDesktop", {
	platform: process.platform,
	steam: false,
	storage: {
		read: (key: string): Promise<string | null> => ipcRenderer.invoke("storage:read", key),
		write: (key: string, value: string): Promise<void> => ipcRenderer.invoke("storage:write", key, value),
		backup: (key: string): Promise<void> => ipcRenderer.invoke("storage:backup", key),
	},
});
