import { lintCommitMessage } from "./lint";

/** `--branch name` wins; otherwise COMMITLINT_BRANCH (set by CI from github.ref_name). */
function branchFrom(argv: readonly string[]): string | undefined {
	const flag = argv.indexOf("--branch");
	if (flag >= 0) {
		const name = argv[flag + 1];
		if (name === undefined || name.startsWith("-")) {
			console.error("commitlint: --branch needs a branch name");
			process.exit(2);
		}
		return name;
	}
	const fromEnv = process.env.COMMITLINT_BRANCH;
	return fromEnv === undefined || fromEnv === "" ? undefined : fromEnv;
}

const argv = process.argv.slice(2);
const file = argv.find((arg, index) => arg !== "--branch" && argv[index - 1] !== "--branch");
if (!file) {
	console.error("commitlint: missing commit message file argument");
	process.exit(2);
}

const error = lintCommitMessage(await Bun.file(file).text(), branchFrom(argv));
if (error) {
	console.error(`commitlint: ${error}`);
	process.exit(1);
}
