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
- **data:** Add game data JSON files (enemies, weapons, rounds, biomes, elites, 40 items, cards, ossuary, bosses, hero) with JSON Schemas and `tools/data-check` ([15b6038](https://github.com/AlexGalhardo/grim-cubes/commit/15b6038702b778ca63e28ae209b1432444577527))
- **assets:** Add `tools/assets-build` with glTF validation rules, MaxRects atlas (2 px extrusion, NEAREST) and deterministic hashed manifest ([278d2ec](https://github.com/AlexGalhardo/grim-cubes/commit/278d2ec2d586670c7d7eb0571e501ce5e33b032f))
- **world:** Add chunk streaming system with load/unload hysteresis, fixed 81-slot pool and `data/world.json` ([00d1dc2](https://github.com/AlexGalhardo/grim-cubes/commit/00d1dc2b311d3a492f4358c37e47f170ae887c52))
- **tooling:** Add `lefthook.yml` and `tools/commitlint`, `tools/secrets-scan`, `tools/lint-extra` with tests ([8add02b](https://github.com/AlexGalhardo/grim-cubes/commit/8add02bbed09e3539ac0cb43d2163d5e1a6f8ab0))
- **assets:** Bake bone-matrix VAT (RGBA32F `.bin`, 12 fps, 5 clips) in `assets:build` and add render VAT loader ([217051d](https://github.com/AlexGalhardo/grim-cubes/commit/217051d714b36bb5a58d5f916fff28d126cc5eab))
- **audio:** Add `tools/audio-generate` (ElevenLabs batch with dry-run, paid-plan check, credit limit and hash-based skip) ([b616425](https://github.com/AlexGalhardo/grim-cubes/commit/b6164255f845a4b43731aed2ba022c4dc8be4aba))
- **game:** Add fixed-timestep loop with slow frame guard ([0309abc](https://github.com/AlexGalhardo/grim-cubes/commit/0309abce557acd7e1ede6216584e8d5ff2c28e81))
- **platform:** Add runtime and touch detection ([46d9f88](https://github.com/AlexGalhardo/grim-cubes/commit/46d9f886e893d27db7daf8e2e8ffa1e5fb0fad5d))
- **game:** Add bitecs world, components, event ring buffer and render port contract ([dbbe953](https://github.com/AlexGalhardo/grim-cubes/commit/dbbe95305eb5b868f48f150f52035440ab93a9c4))
- **data:** Require `world.json` and its schema in data-check ([0a97079](https://github.com/AlexGalhardo/grim-cubes/commit/0a97079f053c64319b7c9f623f0054e7644f491a))
- **world:** Add origin shifting (positions relative to a f64 origin, shift at 1024 u) and minimal render port ([91cce83](https://github.com/AlexGalhardo/grim-cubes/commit/91cce83324e77cff27ce975a3b613d720a71db3b))
- **platform:** Add IndexedDB storage adapter with boundary validation and electron/capacitor stubs ([35830b8](https://github.com/AlexGalhardo/grim-cubes/commit/35830b816969270c17c65c4608ba6a9abe65e45b))
- **game:** Add damage rules, damage queue and damageSystem (crit, armor, dodge, life steal cap, knockback, i-frames) ([e6e247d](https://github.com/AlexGalhardo/grim-cubes/commit/e6e247d5e998af8ae8d97f357feba978f3d04aae))
- **web:** Add Vite config (babylon/react chunks, `rolldownOptions`) and minimal boot with canvas, engine, scene and HUD ([f4ac22b](https://github.com/AlexGalhardo/grim-cubes/commit/f4ac22b62d08f604b24b1f19ba3f2d1acb62b3f3))
- **game:** Add dynamic spatial hash (core) and separationSystem ([d044e09](https://github.com/AlexGalhardo/grim-cubes/commit/d044e096edddd1a49cbf41096f36e5670f554acd))
- **game:** Add spawnSystem with ring placement, bias and round scaling ([1af4aba](https://github.com/AlexGalhardo/grim-cubes/commit/1af4abaaa362985d2ed5f1be14cdd56ca885f1ba))
- **game:** Add behaviorSystem (chase, zigzag) with contact damage ([060d01b](https://github.com/AlexGalhardo/grim-cubes/commit/060d01b2cb933aad1ebc989c80bc33df251c9385))
- **game:** Add roundSystem, run state machine and fragment bag ([5466579](https://github.com/AlexGalhardo/grim-cubes/commit/5466579e4fb7b21f2163798523ac83ed73b015f9))
- **game:** Cull farthest common enemy at the spawn cap; allocation guards for per-step systems ([2bb2dda](https://github.com/AlexGalhardo/grim-cubes/commit/2bb2dda0e6b28eaa0701484208abd8876935e990))
- **build:** Point build at the web Vite config and add `vercel.json` (frozen install, SPA rewrite, immutable assets cache) ([3721471](https://github.com/AlexGalhardo/grim-cubes/commit/3721471b0eb3e3b06e8e50856057d3b9005eb1f8))

### Changed

- **roadmap:** Apply phase 1 review fixes: add E-03-06 (ECS base), break the E-03-02/E-02-06 cycle, pin `@babylonjs/inspector` and approved dev deps in E-02-01, async WebGL2 `createEngine` with golden-value asserts in E-03-01
- **docs:** Add command table to `AGENTS.md` (E-01-05)
- **build:** Use `bun check -b` for typecheck, raise node engine floor to 22.12 and fix stub roadmap ids ([89ae8e4](https://github.com/AlexGalhardo/grim-cubes/commit/89ae8e4354db80ae348b94a38c0067991936c1c2))
- **docs:** Amend SDD 10/11 for `bun check`, Vitest projects, Biome preset and GritQL plugin
- **lint:** Close layer import gaps (Babylon subpaths, relative cross-package imports, render override), drop `vitest/globals` types and add SMHasher verification test ([0ab5190](https://github.com/AlexGalhardo/grim-cubes/commit/0ab51906e7fc74d659395c8aa4ebcb2ad5c32251))
- **docs:** Amend SDD 01 §2: `ui` imports only `core`; Biome layer patterns documented
- **docs:** Apply phase 2 review fixes to ROADMAP (new P-03-06, P-06-06, P-06-07) and SDD 02/03/09/10/11/14; add `.env.example` variable names
- **tooling:** Tighten `secrets-scan` patterns (no false positives on docs/code; adds GitHub PAT and AWS keys)
- **docs:** Define bounded negative-armor formula in GDD §8.2 and fix P-04-01 assert; rename SDD 06 storage interface to `PlatformStorage`
- **docs:** Apply PO decisions D1 (55° camera elevation, beta 0.611 rad), D3 (4–8 blocking props per chunk) and D5 (`.bbmodel` generated by script, converted by `assets-build`) to GDD, ADR-0017, Art Bible, SDD 03 and ROADMAP
- **render:** Set camera beta to π/2 − 55° (D1)
- **docs:** Clarify spawn bias in GDD §6.4 (60% biased + 40% uniform) and floor/prop budget in P-01-03
- **docs:** Record trademark screening (keep "Grim Cubes") and PO decisions on blockers; keep new concept art PNGs out of the public repository

[Unreleased]: https://github.com/AlexGalhardo/grim-cubes/compare/2775e6e...HEAD
