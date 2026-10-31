import { contextBridge } from "electron";

/** The only thing the page learns about the shell. Steam arrives with its own bridge (P-07-02 follow-up, B-04-01). */
contextBridge.exposeInMainWorld("gcDesktop", { platform: process.platform, steam: false });
