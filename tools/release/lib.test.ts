import { describe, expect, it } from "vitest";
import { extractNotes, nextVersion, parseBump, type ReleaseIo, runRelease, transformChangelog } from "./lib";

const CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **docs:** Add docs ([2775e6e](https://github.com/o/r/commit/2775e6e))

### Fixed

- **core:** Fix thing

[Unreleased]: https://github.com/o/r/compare/2775e6e...HEAD
`;
const PACKAGE = `{
	"name": "grim-cubes",
	"version": "0.0.0"
}
`;

function memoryIo(files: Record<string, string>): {
	io: ReleaseIo;
	writes: string[];
	logs: string[];
	commands: string[];
} {
	const writes: string[] = [];
	const logs: string[] = [];
	const commands: string[] = [];
	return {
		writes,
		logs,
		commands,
		io: {
			read: (path) => files[path] ?? "",
			write: (path, content) => {
				files[path] = content;
				writes.push(path);
			},
			log: (line) => logs.push(line),
			exec: (command, args) => {
				commands.push([command, ...args].join(" "));
				if (args[0] === "rev-parse" && args[1] === "--abbrev-ref") return "main";
				if (args[0] === "status") return "";
				if (args[0] === "rev-parse") return "abc1234def";
				if (command === "gh") return "success";
				return "";
			},
		},
	};
}

describe("parseBump", () => {
	it("treats major --rc and rc --major as the next major candidate", () => {
		expect(parseBump("major", ["major", "--rc"])).toBe("rc-major");
		expect(parseBump("rc", ["rc", "--major"])).toBe("rc-major");
		expect(nextVersion("0.9.0", parseBump("major", ["--rc"]))).toBe("1.0.0-rc.1");
		expect(nextVersion("0.9.0", parseBump("rc", ["--major"]))).toBe("1.0.0-rc.1");
		expect(nextVersion("1.0.0-rc.4", parseBump("major", []))).toBe("1.0.0");
	});
});

describe("nextVersion", () => {
	it("bumps stable versions", () => {
		expect(nextVersion("0.0.0", "minor")).toBe("0.1.0");
		expect(nextVersion("0.1.4", "patch")).toBe("0.1.5");
		expect(nextVersion("0.9.1", "major")).toBe("1.0.0");
	});

	it("handles release candidates", () => {
		expect(nextVersion("1.0.0-rc.1", "rc")).toBe("1.0.0-rc.2");
		expect(nextVersion("1.0.0-rc.2", "major")).toBe("1.0.0");
		expect(nextVersion("0.9.0", "rc")).toBe("0.9.1-rc.1");
		expect(nextVersion("0.9.0", "rc-major")).toBe("1.0.0-rc.1");
		expect(nextVersion("1.0.0-rc.1", "rc-major")).toBe("1.0.0-rc.2");
		expect(nextVersion("1.0.0-rc.3", "major")).toBe("1.0.0");
	});

	it("rejects invalid versions", () => {
		expect(() => nextVersion("1.0", "patch")).toThrow();
	});
});

describe("transformChangelog", () => {
	it("moves [Unreleased] into a dated section and rewrites the footer", () => {
		const out = transformChangelog(CHANGELOG, "0.1.0", "2026-11-01");
		expect(out).toContain("## [Unreleased]\n\n## [0.1.0] - 2026-11-01\n\n### Added");
		expect(out).toContain(
			"[Unreleased]: https://github.com/o/r/compare/v0.1.0...HEAD\n[0.1.0]: https://github.com/o/r/compare/2775e6e...v0.1.0",
		);
	});

	it("uses the previous tag as base from the second release on", () => {
		const first = transformChangelog(CHANGELOG, "0.1.0", "2026-11-01");
		const withEntry = first.replace("## [Unreleased]\n", "## [Unreleased]\n\n- **ui:** More\n");
		const second = transformChangelog(withEntry, "0.2.0", "2026-11-02");
		expect(second).toContain(
			"[Unreleased]: https://github.com/o/r/compare/v0.2.0...HEAD\n[0.2.0]: https://github.com/o/r/compare/v0.1.0...v0.2.0\n[0.1.0]:",
		);
	});

	it("refuses an empty [Unreleased]", () => {
		const empty = CHANGELOG.replace(/### Added[\s\S]*### Fixed\n\n- \*\*core:\*\* Fix thing\n/, "");
		expect(() => transformChangelog(empty, "0.1.0", "2026-11-01")).toThrow(/no entries/);
	});
});

describe("runRelease", () => {
	const base = { bump: "minor" as const, publish: false, date: "2026-11-01" };

	it("dry-run writes nothing and prints a diff", () => {
		const { io, writes, logs, commands } = memoryIo({
			"CHANGELOG.md": CHANGELOG,
			"package.json": PACKAGE,
		});
		expect(runRelease({ ...base, dryRun: true }, io)).toBe(0);
		expect(writes).toEqual([]);
		expect(commands).toEqual([]);
		expect(logs.join("\n")).toContain("+## [0.1.0] - 2026-11-01");
		expect(logs.join("\n")).toContain('+\t"version": "0.1.0"');
	});

	it("release notes are exactly the CHANGELOG section", () => {
		const files = { "CHANGELOG.md": CHANGELOG, "package.json": PACKAGE };
		const { io } = memoryIo(files);
		runRelease({ ...base, dryRun: false }, io);
		const notes = extractNotes(files["CHANGELOG.md"], "0.1.0");
		const section = files["CHANGELOG.md"]
			.split("## [0.1.0] - 2026-11-01\n")[1]
			?.split("\n[Unreleased]:")[0];
		expect(notes).toBe(`${section?.trim()}\n`);
		expect(notes).not.toContain("## [");
		expect(notes.startsWith("### Added")).toBe(true);
		expect(files["package.json"]).toContain('"version": "0.1.0"');
	});

	it("does not touch git without --publish", () => {
		const { io, commands } = memoryIo({ "CHANGELOG.md": CHANGELOG, "package.json": PACKAGE });
		runRelease({ ...base, dryRun: false }, io);
		expect(commands).toEqual([]);
	});

	it("--publish commits, tags and pushes after the safety checks", () => {
		const { io, commands } = memoryIo({ "CHANGELOG.md": CHANGELOG, "package.json": PACKAGE });
		runRelease({ ...base, dryRun: false, publish: true }, io);
		expect(commands.at(-3)).toBe("git commit -m chore(release): v0.1.0");
		expect(commands.at(-2)).toBe("git tag -a v0.1.0 -m v0.1.0");
		expect(commands.at(-1)).toBe("git push --follow-tags");
	});

	it("--dry-run beats --publish", () => {
		const { io, writes, commands } = memoryIo({ "CHANGELOG.md": CHANGELOG, "package.json": PACKAGE });
		runRelease({ ...base, dryRun: true, publish: true }, io);
		expect(writes).toEqual([]);
		expect(commands).toEqual([]);
	});
});
