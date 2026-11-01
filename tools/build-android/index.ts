/**
 * `bun run build:android` (B-04-04): a debug APK for sideloading on a phone.
 * Not a Play build: no upload key, no AAB, no billing. The WebView loads the
 * full game (`vite --mode android`), and the save stays in IndexedDB.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function readVersion(): string {
	const raw: unknown = JSON.parse(readFileSync("package.json", "utf8"));
	if (typeof raw !== "object" || raw === null || !("version" in raw) || typeof raw.version !== "string") {
		throw new Error("package.json has no version");
	}
	return raw.version;
}

const androidDir = join("apps", "android", "android");

function writeSdkPath(): void {
	const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
	if (sdk === undefined || sdk.length === 0) {
		console.error("build-android: set ANDROID_HOME to the Android SDK");
		process.exit(1);
	}
	writeFileSync(join(androidDir, "local.properties"), `sdk.dir=${sdk.replaceAll("\\", "/")}\n`);
}

const version = readVersion();
const steps: { label: string; cmd: string[]; cwd?: string }[] = [
	{ label: "data check", cmd: ["bun", "run", "data:check"] },
	{ label: "assets", cmd: ["bun", "run", "assets:build"] },
	{
		label: "game (vite --mode android)",
		cmd: ["bunx", "vite", "build", "--config", "apps/web/vite.config.ts", "--mode", "android"],
	},
	{ label: "cap sync", cmd: ["bunx", "cap", "sync", "android"], cwd: join("apps", "android") },
];

for (const step of steps) {
	console.log(`build-android: ${step.label}`);
	const proc = Bun.spawn(step.cmd, {
		stdout: "inherit",
		stderr: "inherit",
		...(step.cwd !== undefined && { cwd: step.cwd }),
	});
	const code = await proc.exited;
	if (code !== 0) {
		console.error(`build-android: "${step.label}" failed with exit code ${code}`);
		process.exit(code);
	}
}

writeSdkPath();
console.log("build-android: assembleDebug");
const gradle =
	process.platform === "win32"
		? ["cmd", "/c", "gradlew.bat", "assembleDebug", `-PgcVersion=${version}`]
		: ["./gradlew", "assembleDebug", `-PgcVersion=${version}`];
const assembled = Bun.spawn(gradle, {
	stdout: "inherit",
	stderr: "inherit",
	cwd: androidDir,
});
const gradleCode = await assembled.exited;
if (gradleCode !== 0) {
	console.error(`build-android: assembleDebug failed with exit code ${gradleCode}`);
	process.exit(gradleCode);
}

const apkName = `grim-cubes_${version}_android.apk`;
mkdirSync("release", { recursive: true });
copyFileSync(
	join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
	join("release", apkName),
);
console.log(`build-android: wrote release/${apkName}`);
