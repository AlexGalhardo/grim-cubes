import { checkChangelog } from "./check";

const base = process.argv[2];
if (!base) {
	console.error("changelog-check: missing base ref argument (e.g. origin/main)");
	process.exit(2);
}

const git = async (...args: string[]): Promise<string> => {
	const proc = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "inherit" });
	const out = await new Response(proc.stdout).text();
	if ((await proc.exited) !== 0) {
		console.error(`changelog-check: git ${args.join(" ")} failed`);
		process.exit(2);
	}
	return out;
};

const error = checkChangelog({
	subjects: (await git("log", "--format=%s", `${base}..HEAD`)).split("\n").filter(Boolean),
	baseChangelog: await git("show", `${base}:CHANGELOG.md`),
	headChangelog: await Bun.file("CHANGELOG.md").text(),
	labels: (process.env.PR_LABELS ?? "").split(",").filter(Boolean),
});
if (error) {
	console.error(`changelog-check: ${error}`);
	process.exit(1);
}
