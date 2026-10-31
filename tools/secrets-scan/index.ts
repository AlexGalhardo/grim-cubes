import { findSecretLines } from "./scan";

let failed = false;
for (const path of process.argv.slice(2)) {
	const file = Bun.file(path);
	if (!(await file.exists())) continue;
	const text = await file.text().catch(() => "");
	for (const line of findSecretLines(text)) {
		console.error(`secrets-scan: possible secret at ${path}:${line}`);
		failed = true;
	}
}
process.exit(failed ? 1 : 0);
