import { readFileSync } from "node:fs";
import { buildAssets } from "./build";
import { RuleError } from "./rules";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

try {
	const manifest = await buildAssets({
		srcDir: "assets/src",
		outDir: "public/assets",
		version: pkg.version,
	});
	console.log(`assets-build: ${Object.keys(manifest.entries).length} entries`);
} catch (error) {
	if (error instanceof RuleError) {
		console.error(`assets-build: ${error.message}`);
		process.exit(1);
	}
	throw error;
}
