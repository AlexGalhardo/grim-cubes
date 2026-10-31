/**
 * `bun run build:electron` (P-07-02, SDD 10 section 2): the game build for the desktop, then the shell, then the
 * Windows x64 installer (NSIS) and portable executable in `release/`. Not code-signed: the certificate is the PO's
 * (B-04-01), so Windows SmartScreen warns on first run.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { buildIco } from "./ico";

/** The app icon the Art draws (`assets/src/icons/app/app_<size>.png`) becomes `build/icon.ico`, which electron-builder picks up. */
async function makeIcon(): Promise<void> {
	const files = [16, 32, 48, 256].map((size) => `assets/src/icons/app/app_${size}.png`);
	if (!files.every((file) => existsSync(file))) {
		console.warn("build-electron: no app icon PNGs yet, the executable keeps the default Electron icon");
		return;
	}
	const pngs = await Promise.all(
		files.map(async (file) => new Uint8Array(await Bun.file(file).arrayBuffer())),
	);
	await mkdir("build", { recursive: true });
	await Bun.write("build/icon.ico", buildIco(pngs));
	console.log("build-electron: wrote build/icon.ico");
}

const steps: { label: string; cmd: string[]; env?: Record<string, string> }[] = [
	{ label: "data check", cmd: ["bun", "run", "data:check"] },
	{ label: "assets", cmd: ["bun", "run", "assets:build"] },
	{
		label: "game (vite --mode electron)",
		cmd: ["bunx", "vite", "build", "--config", "apps/web/vite.config.ts", "--mode", "electron"],
	},
	{
		label: "main process",
		cmd: [
			"bun",
			"build",
			"apps/electron/src/main.ts",
			"--target=node",
			"--format=cjs",
			"--external=electron",
			"--outfile=apps/electron/dist/main.cjs",
		],
	},
	{
		label: "preload",
		cmd: [
			"bun",
			"build",
			"apps/electron/src/preload.ts",
			"--target=node",
			"--format=cjs",
			"--external=electron",
			"--outfile=apps/electron/dist/preload.cjs",
		],
	},
	{
		label: "installer and portable",
		cmd: ["bunx", "electron-builder", "--win", "nsis", "portable", "--x64", "--publish", "never"],
		env: { CSC_IDENTITY_AUTO_DISCOVERY: "false" },
	},
];

await makeIcon();

for (const step of steps) {
	console.log(`build-electron: ${step.label}`);
	const proc = Bun.spawn(step.cmd, {
		stdout: "inherit",
		stderr: "inherit",
		env: { ...process.env, ...step.env },
	});
	const code = await proc.exited;
	if (code !== 0) {
		console.error(`build-electron: "${step.label}" failed with exit code ${code}`);
		process.exit(code);
	}
}
console.log("build-electron: done, see release/");
