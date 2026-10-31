import { lintCommitMessage } from "./lint";

const file = process.argv[2];
if (!file) {
	console.error("commitlint: missing commit message file argument");
	process.exit(2);
}

const error = lintCommitMessage(await Bun.file(file).text());
if (error) {
	console.error(`commitlint: ${error}`);
	process.exit(1);
}
