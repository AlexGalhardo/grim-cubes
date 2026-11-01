export type Bump = "patch" | "minor" | "major" | "rc" | "rc-major";

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/;
const UNRELEASED_HEADER = "## [Unreleased]";
const FOOTER_UNRELEASED_RE = /^\[Unreleased\]: (.+)\/compare\/(.+)\.\.\.HEAD\s*$/;

interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	rc: number | undefined;
}

export function parseVersion(version: string): ParsedVersion {
	const match = VERSION_RE.exec(version);
	if (!match) throw new Error(`invalid version "${version}" (expected X.Y.Z or X.Y.Z-rc.N)`);
	const [, major, minor, patch, rc] = match;
	return {
		major: Number(major),
		minor: Number(minor),
		patch: Number(patch),
		rc: rc === undefined ? undefined : Number(rc),
	};
}

/**
 * From an rc, patch/minor/major finalize it (1.0.0-rc.2 -> 1.0.0). From a stable version `rc` starts the next
 * patch's rc line (0.9.0 -> 0.9.1-rc.1) and `rc-major` the next major's (0.9.0 -> 1.0.0-rc.1); from an rc both
 * just count the next candidate.
 */
/**
 * `major --rc` and `rc --major` are the same bump as `rc-major`: the next major's first candidate
 * (0.9.0 -> 1.0.0-rc.1). A plain `major` from an rc still finalizes it.
 */
export function parseBump(command: string, argv: readonly string[]): Bump {
	if (command === "major" && argv.includes("--rc")) return "rc-major";
	if (command === "rc" && argv.includes("--major")) return "rc-major";
	return command as Bump;
}

export function nextVersion(current: string, bump: Bump): string {
	const v = parseVersion(current);
	if (bump === "rc-major" && v.rc === undefined) return `${v.major + 1}.0.0-rc.1`;
	if (bump === "rc" || bump === "rc-major") {
		return v.rc === undefined
			? `${v.major}.${v.minor}.${v.patch + 1}-rc.1`
			: `${v.major}.${v.minor}.${v.patch}-rc.${v.rc + 1}`;
	}
	if (v.rc !== undefined) return `${v.major}.${v.minor}.${v.patch}`;
	if (bump === "major") return `${v.major + 1}.0.0`;
	if (bump === "minor") return `${v.major}.${v.minor + 1}.0`;
	return `${v.major}.${v.minor}.${v.patch + 1}`;
}

function isSectionEnd(line: string): boolean {
	return line.startsWith("## [") || /^\[[^\]]+\]: /.test(line);
}

/** Returns [start, end) line indexes of the body under `header`, excluding the header itself. */
function sectionBounds(lines: string[], header: string): [number, number] {
	const start = lines.findIndex((l) => l.startsWith(header));
	if (start < 0) throw new Error(`CHANGELOG has no "${header}" section`);
	let end = start + 1;
	while (end < lines.length && !isSectionEnd(lines[end] ?? "")) end++;
	return [start + 1, end];
}

export function extractNotes(changelog: string, version: string): string {
	const lines = changelog.split("\n");
	const [from, to] = sectionBounds(lines, `## [${version}]`);
	return `${lines.slice(from, to).join("\n").trim()}\n`;
}

export function transformChangelog(changelog: string, version: string, date: string): string {
	const lines = changelog.split("\n");
	const [from, to] = sectionBounds(lines, UNRELEASED_HEADER);
	const body = lines.slice(from, to).join("\n").trim();
	if (!/^- /m.test(body)) throw new Error("[Unreleased] has no entries; nothing to release");

	const footerIndex = lines.findIndex((l) => FOOTER_UNRELEASED_RE.test(l));
	const footer = footerIndex < 0 ? null : FOOTER_UNRELEASED_RE.exec(lines[footerIndex] ?? "");
	if (footerIndex < 0 || !footer) throw new Error("CHANGELOG footer has no [Unreleased] compare link");
	const [, repoUrl, base] = footer;

	const head = lines.slice(0, from - 1);
	const tail = lines.slice(to);
	const tailFooterIndex = footerIndex - to;
	tail.splice(
		tailFooterIndex,
		1,
		`[Unreleased]: ${repoUrl}/compare/v${version}...HEAD`,
		`[${version}]: ${repoUrl}/compare/${base}...v${version}`,
	);

	return [...head, UNRELEASED_HEADER, "", `## [${version}] - ${date}`, "", body, "", ...tail].join("\n");
}

export function setPackageVersion(packageJson: string, version: string): string {
	const next = packageJson.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
	if (next === packageJson && !packageJson.includes(`"version": "${version}"`))
		throw new Error("package.json has no version field");
	return next;
}

export function readPackageVersion(packageJson: string): string {
	const parsed: unknown = JSON.parse(packageJson);
	if (
		typeof parsed === "object" &&
		parsed !== null &&
		"version" in parsed &&
		typeof parsed.version === "string"
	)
		return parsed.version;
	throw new Error("package.json has no version field");
}

/** Line diff via LCS: enough for the small, localized edits the release makes. */
export function lineDiff(before: string, after: string, label: string): string {
	const a = before.split("\n");
	const b = after.split("\n");
	const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
		new Array<number>(b.length + 1).fill(0),
	);
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			const row = lcs[i] as number[];
			row[j] =
				a[i] === b[j]
					? ((lcs[i + 1] as number[])[j + 1] as number) + 1
					: Math.max((lcs[i + 1] as number[])[j] as number, row[j + 1] as number);
		}
	}
	const out: string[] = [`--- ${label}`, `+++ ${label}`];
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && a[i] === b[j]) {
			i++;
			j++;
		} else if (
			j >= b.length ||
			(i < a.length &&
				((lcs[i + 1] as number[])[j] as number) >= ((lcs[i] as number[])[j + 1] as number))
		) {
			out.push(`-${a[i]}`);
			i++;
		} else {
			out.push(`+${b[j]}`);
			j++;
		}
	}
	return out.length === 2 ? "" : out.join("\n");
}

export interface ReleaseIo {
	read(path: string): string;
	write(path: string, content: string): void;
	log(line: string): void;
	/** Runs a command and returns trimmed stdout; throws on non-zero exit. */
	exec(command: string, args: string[]): string;
}

export interface ReleaseOptions {
	bump: Bump;
	versionOverride?: string;
	dryRun: boolean;
	publish: boolean;
	date: string;
}

export function runRelease(options: ReleaseOptions, io: ReleaseIo): number {
	const pkg = io.read("package.json");
	const changelog = io.read("CHANGELOG.md");
	const current = readPackageVersion(pkg);
	const version = options.versionOverride ?? nextVersion(current, options.bump);
	parseVersion(version);

	const nextChangelog = transformChangelog(changelog, version, options.date);
	const nextPkg = setPackageVersion(pkg, version);
	const notes = extractNotes(nextChangelog, version);

	io.log(`version: ${current} -> ${version}`);
	if (options.dryRun) {
		const diffs = [
			lineDiff(changelog, nextChangelog, "CHANGELOG.md"),
			lineDiff(pkg, nextPkg, "package.json"),
		].filter((d) => d !== "");
		io.log(diffs.join("\n"));
		io.log("--- release notes ---");
		io.log(notes.trimEnd());
		io.log("dry-run: nothing written");
		return 0;
	}

	if (options.publish) {
		const branch = io.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
		if (branch !== "main") throw new Error(`--publish requires branch main (on "${branch}")`);
		if (io.exec("git", ["status", "--porcelain"]) !== "")
			throw new Error("--publish requires a clean working tree");
		const sha = io.exec("git", ["rev-parse", "HEAD"]);
		const ci = io.exec("gh", [
			"run",
			"list",
			"--branch",
			"main",
			"--commit",
			sha,
			"--workflow",
			"ci.yml",
			"--limit",
			"1",
			"--json",
			"conclusion",
			"--jq",
			".[0].conclusion",
		]);
		if (ci !== "success")
			throw new Error(`--publish requires green CI on ${sha.slice(0, 7)} (got "${ci}")`);
	}

	io.write("CHANGELOG.md", nextChangelog);
	io.write("package.json", nextPkg);
	io.log("updated CHANGELOG.md and package.json");

	if (!options.publish) {
		io.log("not committed, tagged or pushed (pass --publish to do so)");
		return 0;
	}
	io.exec("git", ["add", "CHANGELOG.md", "package.json"]);
	io.exec("git", ["commit", "-m", `chore(release): v${version}`]);
	io.exec("git", ["tag", "-a", `v${version}`, "-m", `v${version}`]);
	io.exec("git", ["push", "--follow-tags"]);
	io.log(`published v${version}`);
	return 0;
}
