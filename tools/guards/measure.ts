import { fileURLToPath } from "node:url";
import { countTestCases } from "./guards";

const root = fileURLToPath(new URL("../../", import.meta.url));
const folders = [
	"packages/core",
	"packages/game",
	"packages/platform",
	"packages/render",
	"packages/ui",
	"apps",
	"tools",
];
console.log(JSON.stringify(Object.fromEntries(folders.map((f) => [f, countTestCases(root, f)])), null, "\t"));
