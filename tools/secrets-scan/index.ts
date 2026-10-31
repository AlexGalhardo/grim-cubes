import { findSecretLines } from "./scan";

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith("-"));
if (flags.length > 0) {
	console.error(
		`secrets-scan: unknown option ${flags[0]}. Usage: git ls-files -z | xargs -0 bun tools/secrets-scan`,
	);
	process.exit(2);
}

let failed = false;
let missing = false;
for (const path of args) {
	const file = Bun.file(path);
	// A path that cannot be read is an error, never a pass: silently skipping it made `--all` scan nothing.
	if (!(await file.exists())) {
		console.error(`secrets-scan: no such file ${path}`);
		missing = true;
		continue;
	}
	const text = await file.text().catch(() => "");
	for (const line of findSecretLines(text)) {
		console.error(`secrets-scan: possible secret at ${path}:${line}`);
		failed = true;
	}
}
process.exit(missing ? 2 : failed ? 1 : 0);
