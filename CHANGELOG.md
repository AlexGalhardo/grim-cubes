# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **docs:** Add web research, brainstorming decisions (D01–D33), GDD, Art Bible with design system, 14 SDDs and 20 ADRs ([2775e6e](https://github.com/AlexGalhardo/grim-cubes/commit/2775e6ee07d913f912d80bf5367bf5b7d867a5bb))
- **docs:** Add ROADMAP with 5 phases and 125 micro-tasks with verifiable asserts, plus the 1.1 Android appendix ([2775e6e](https://github.com/AlexGalhardo/grim-cubes/commit/2775e6ee07d913f912d80bf5367bf5b7d867a5bb))
- **docs:** Add `prompt-workers.md` (agent protocol) and `prompt-concept-arts.md` (concept art prompts) ([2775e6e](https://github.com/AlexGalhardo/grim-cubes/commit/2775e6ee07d913f912d80bf5367bf5b7d867a5bb))
- **repo:** Add `.editorconfig` (tab 4), `.markdownlint-cli2.jsonc`, `.gitignore`, `CLAUDE.md`, `AGENTS.md`, `docs/PROGRESS.md`, proprietary `LICENSE` and `references/concept-arts/` index ([2775e6e](https://github.com/AlexGalhardo/grim-cubes/commit/2775e6ee07d913f912d80bf5367bf5b7d867a5bb))
- **repo:** Initialize git repository on `main` and connect to `AlexGalhardo/grim-cubes` ([2775e6e](https://github.com/AlexGalhardo/grim-cubes/commit/2775e6ee07d913f912d80bf5367bf5b7d867a5bb))
- **repo:** Add `.gitattributes` (LF, binary assets), `README.md` and extend `.gitignore` with release, Android and signing artifacts ([abe4492](https://github.com/AlexGalhardo/grim-cubes/commit/abe4492dc6bbffc143d9ab2668dd6bb5b83ff33d))
- **docs:** Align `CHANGELOG.md` with Keep a Changelog 1.1.0 and the vukem item format ([f14a65b](https://github.com/AlexGalhardo/grim-cubes/commit/f14a65b1190ab9e540e01daf8008bf31ee2be14b))
- **docs:** Add `docs/legal/third-party.md` referenced by `LICENSE`
- **build:** Add root `package.json` with workspaces, exact-pinned deps, SDD 10 scripts and tool stubs ([e154a99](https://github.com/AlexGalhardo/grim-cubes/commit/e154a993518cc134cc3d0e48bcc317b75ed400ac))
- **build:** Add base tsconfig, project references and `@gc/*` workspace packages ([d76a6d1](https://github.com/AlexGalhardo/grim-cubes/commit/d76a6d16acdfb94bb4cfc1187c1ef69d210a4232))
- **lint:** Add Biome config with layer import rules, Babylon barrel ban and `Math.random` ban in game ([9b5b11a](https://github.com/AlexGalhardo/grim-cubes/commit/9b5b11a5cbf33f45688636f9b8c7ef9d963313ef))
- **test:** Add Vitest config with node, jsdom and integration projects and istanbul coverage ([36f1f7d](https://github.com/AlexGalhardo/grim-cubes/commit/36f1f7d3e498b58a3b274684944ccba34f6f71b6))
- **core:** Add seeded rng (mulberry32, MurmurHash3-based `hash32`, streams), logger and store ([d8b8d08](https://github.com/AlexGalhardo/grim-cubes/commit/d8b8d088ea8f3f1b723c53abc695263b806d975e))
- **render:** Add WebGL2 engine factory, NullEngine for tests and minimal scene (camera, lights, ground, hero cube) ([d8b8d08](https://github.com/AlexGalhardo/grim-cubes/commit/d8b8d088ea8f3f1b723c53abc695263b806d975e))

### Changed

- **roadmap:** Apply phase 1 review fixes: add E-03-06 (ECS base), break the E-03-02/E-02-06 cycle, pin `@babylonjs/inspector` and approved dev deps in E-02-01, async WebGL2 `createEngine` with golden-value asserts in E-03-01
- **docs:** Add command table to `AGENTS.md` (E-01-05)
- **build:** Use `bun check -b` for typecheck, raise node engine floor to 22.12 and fix stub roadmap ids ([89ae8e4](https://github.com/AlexGalhardo/grim-cubes/commit/89ae8e4354db80ae348b94a38c0067991936c1c2))
- **docs:** Amend SDD 10/11 for `bun check`, Vitest projects, Biome preset and GritQL plugin

[Unreleased]: https://github.com/AlexGalhardo/grim-cubes/compare/2775e6e...HEAD
