import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, Menu, net, protocol, session } from "electron";
import { registerStorageIpc } from "./ipc";
import { resolveAppPath, userDataDir } from "./paths";

/**
 * Electron shell (P-07-02, SDD 10 section 2): loads the Vite build from `dist` through an `app://` scheme (the game
 * asks for absolute `/assets/...` URLs, which `file://` cannot serve), with the same CSP as the Vercel deploy, no
 * Node in the page and no navigation away from the game. No Steam yet: there is no App ID.
 */
const ORIGIN = "app://game";

const CSP =
	"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; manifest-src 'self'";

protocol.registerSchemesAsPrivileged([
	{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// Before anything reads it: the save lives in `%APPDATA%\grim-cubes\saves` for good (ADR-0009, Steam Auto-Cloud).
app.setPath("userData", userDataDir(app.getPath("appData")));
app.enableSandbox();
// The first input unlocks audio, but a fullscreen game window should not wait for a gesture to start music.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const distDir = join(app.getAppPath(), "dist");

function serveDist(): void {
	protocol.handle("app", async (request) => {
		const file = resolveAppPath(new URL(request.url).pathname, distDir);
		if (!file) return new Response("forbidden", { status: 403 });
		const response = await net.fetch(pathToFileURL(file).href).catch(() => null);
		if (!response?.ok) return new Response("not found", { status: 404 });
		const headers = new Headers(response.headers);
		headers.set("Content-Security-Policy", CSP);
		headers.set("X-Content-Type-Options", "nosniff");
		return new Response(response.body, { status: response.status, headers });
	});
}

function openWindow(): void {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		fullscreen: true,
		backgroundColor: "#14121C",
		title: "Grim Cubes",
		autoHideMenuBar: true,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			preload: join(app.getAppPath(), "apps", "electron", "dist", "preload.cjs"),
			devTools: !app.isPackaged,
		},
	});

	win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
	const keepInside = (event: { preventDefault(): void }, url: string): void => {
		if (!url.startsWith(`${ORIGIN}/`)) event.preventDefault();
	};
	win.webContents.on("will-navigate", keepInside);
	win.webContents.on("will-redirect", keepInside);
	// F11 and Alt+Enter toggle fullscreen; Esc is left to the game.
	win.webContents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown") return;
		if (input.key === "F11" || (input.alt && input.key === "Enter")) {
			event.preventDefault();
			win.setFullScreen(!win.isFullScreen());
		}
	});

	void win.loadURL(`${ORIGIN}/`);
}

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.on("second-instance", () => {
		const [win] = BrowserWindow.getAllWindows();
		if (win) {
			if (win.isMinimized()) win.restore();
			win.focus();
		}
	});
	void app.whenReady().then(() => {
		Menu.setApplicationMenu(null);
		// The game needs no browser permission (the Gamepad API is not gated): refuse everything.
		session.defaultSession.setPermissionRequestHandler((_contents, _permission, done) => done(false));
		session.defaultSession.setPermissionCheckHandler(() => false);
		registerStorageIpc(join(app.getPath("userData"), "saves"));
		serveDist();
		openWindow();
	});
	app.on("window-all-closed", () => app.quit());
}
