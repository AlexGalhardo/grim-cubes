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
- **game:** Keep one registered query per world in `createQueryCache` ([fe43442](https://github.com/AlexGalhardo/grim-cubes/commit/fe434425c38977570c85d8f501cbfbf3dac2fc45))
- **release:** Add `tools/release` (SemVer bump, CHANGELOG rewrite, notes; `--publish` gated) and `tools/sbom` (CycloneDX 1.6, checksums) ([897a05c](https://github.com/AlexGalhardo/grim-cubes/commit/897a05c4f3fcaaa0c314efe1335c3033d084aeff))
- **ci:** Add release workflow for `v*` tags; pin `setup-bun` by commit SHA in the write-scoped job ([5f2f2eb](https://github.com/AlexGalhardo/grim-cubes/commit/5f2f2ebb44b08fc2ff81e6e077d4802870f8befa))
- **audio:** Refine audio-generate: exit 2 on refused plan, per-character voice cost, no 4xx retries, prompts in `assets/src/audio` ([f0030ee](https://github.com/AlexGalhardo/grim-cubes/commit/f0030ee712ae8d48ab7a9abd5cf51f8e869afcc0))
- **game:** Add targetingSystem and weaponSystem for sword (arc) and pistol (projectile) ([8db77cb](https://github.com/AlexGalhardo/grim-cubes/commit/8db77cb13301f24b4f7a0d79d0ff953777375639))
- **ui:** Add Tailwind v4 theme tokens (Art Bible §16) and Panel, Button, Bar components ([cb14fb7](https://github.com/AlexGalhardo/grim-cubes/commit/cb14fb7a72972015987e80dc089256045a010034))
- **assets:** Bake VAT relative to the skeleton base (parent of the skeleton root) and verify against the Babylon skeleton ([8cd9909](https://github.com/AlexGalhardo/grim-cubes/commit/8cd9909b8aa798b2eaaf8379a708367518afba27))
- **render:** Draw the floor as one quad per cube (32 px/u) and instance only props within Chebyshev 3 ([a2afa48](https://github.com/AlexGalhardo/grim-cubes/commit/a2afa4832cfe0da078a5836e2ff2da6049eb6ba4))
- **game:** Use registered queries in origin shifting; render port independent of event/sync order ([5dd486f](https://github.com/AlexGalhardo/grim-cubes/commit/5dd486fcca6cac51eb19ad166548ec5d283f8bac))
- **render:** Render the horde with thin instances, per-instance VAT settings and death ghosts ([6d07ec4](https://github.com/AlexGalhardo/grim-cubes/commit/6d07ec416fbb45efac13f0d8930191a17df432d9))
- **world:** Add deterministic chunk generator (two 4×4 grids, D3 prop counts, corridor rule, spawn exclusion, biome fallback) ([ba3ad64](https://github.com/AlexGalhardo/grim-cubes/commit/ba3ad647c12d01dd3ebbbc1ee574cfe60fd92422))
- **input:** Add unified input (keyboard with remap, gamepad dead zone, floating virtual joystick), input/movement systems and web boot with hero, fixed loop and 12 Hz HUD ([797f3a5](https://github.com/AlexGalhardo/grim-cubes/commit/797f3a5ab9bf34a26bfbb5563fbc56da777adfed))
- **game:** Add `Facing` and `Attacking` components for horde animation ([b9eb949](https://github.com/AlexGalhardo/grim-cubes/commit/b9eb94977992cfa252ad5059d8e2d5020c8e16aa))
- **render:** Drive the horde from `EnemyType`, `Attacking` and `Facing` (attack clip, per-instance yaw) ([28771cc](https://github.com/AlexGalhardo/grim-cubes/commit/28771cc638332a7fadf9d4642b2c78ce78116bf4))
- **game:** Add 512-slot projectile pool and projectileSystem (pierce, anti double-hit); fractional weapon cooldown and radial knockback ([b89ec09](https://github.com/AlexGalhardo/grim-cubes/commit/b89ec094e67e3129ed24ccab5cb2c08cbae772ac))
- **e2e:** Add Playwright config (4 viewports, SwiftShader) and boot spec with visual baselines ([f2eee30](https://github.com/AlexGalhardo/grim-cubes/commit/f2eee30c40e49ca43e3985e63134eb7f67601476))
- **ci:** Install Bun via npm in the Playwright e2e container ([526c00a](https://github.com/AlexGalhardo/grim-cubes/commit/526c00ae66808908fbcb6893964f970376130abd))
- **release:** Dedupe SBOM components, binary sort, green-CI gate and local date in release tooling ([cc9f93d](https://github.com/AlexGalhardo/grim-cubes/commit/cc9f93de48916160d3b1095f6065bca5d323dffc))
- **lint:** Ignore nested `node_modules` and `dist` in markdownlint (workspace packages install nested dependencies)
- **ui:** Give Button a 48 px touch target on coarse pointers and a colour transition ([6ffba51](https://github.com/AlexGalhardo/grim-cubes/commit/6ffba51779c6d614a68c1e4e8100e8e453691070))
- **game:** Add drops, pickup magnet, XP curve and round-end harvest ([7a8d2fd](https://github.com/AlexGalhardo/grim-cubes/commit/7a8d2fd5dc1bc9732f2ecede08f8c700c9c40e5a))
- **e2e:** Regenerate boot baselines with the themed HUD ([3b678a8](https://github.com/AlexGalhardo/grim-cubes/commit/3b678a819754bb36dfb2ce89e50aba2ee848507d))
- **smoke:** Add Playwright post-deploy smoke test (gc.ready, screenshot, console errors, same-origin Vercel bypass) and deploy-web workflow ([ac4f5a9](https://github.com/AlexGalhardo/grim-cubes/commit/ac4f5a94f4c45af6a798c3bde27aa1c03630235c))
- **render:** Conjugate horde instances for the glTF loader mirror (x and yaw); one-shot hit, attack and death clips; walk speed follows velocity ([aee88a3](https://github.com/AlexGalhardo/grim-cubes/commit/aee88a318e06378588967daf60507a5ef2cf53c0))
- **assets:** Write atlas PNGs with filterType 0 (10× faster, still deterministic) ([daedd28](https://github.com/AlexGalhardo/grim-cubes/commit/daedd28033bcf113a39052fe5b66e2f754860805))
- **world:** Enforce the corridor limit on the final state; floor variants from the biome; `hash32x3` in core ([709866d](https://github.com/AlexGalhardo/grim-cubes/commit/709866d0a7b8420cd02b29103762a43c6cccd3c4))
- **web:** Gate `window.gc.debug` behind compile-time `__DEBUG_API__` (`GC_DEBUG_API=1`) ([caa7143](https://github.com/AlexGalhardo/grim-cubes/commit/caa7143192f59cd9b772e668259b9f867111fdcf))
- **input:** Poll input once per frame and drop the per-call gamepad closure ([08a586c](https://github.com/AlexGalhardo/grim-cubes/commit/08a586cc6f31ab9a65e37ba569a32e0b5f4f8833))
- **game:** Add typed data loaders in `packages/game/src/data` ([7d9e747](https://github.com/AlexGalhardo/grim-cubes/commit/7d9e747a547f92aea1769cf1549dea68d95e91ea))
- **assets:** Convert validated `.bbmodel` files to rigid-skin glTF in `assets-build` (D5) ([0c6a918](https://github.com/AlexGalhardo/grim-cubes/commit/0c6a918143c7ff2ceb362ec2cfb4aab731d73314))
- **assets:** Reject unsupported `.bbmodel` features (Molang, interpolation, face rotation, box UV) and budget elements by size class; add `data/props.json` ([f4b4a64](https://github.com/AlexGalhardo/grim-cubes/commit/f4b4a6417e78b398a2ef1431c5f1d17b35857958))
- **game:** Add stats composition, card draws and level-up flow ([2a9abc8](https://github.com/AlexGalhardo/grim-cubes/commit/2a9abc89d4cab2e78941f63e2361f3bf4b512ba0))
- **ui:** Add LevelUp screen and XP, level and gold in the HUD ([611b1d5](https://github.com/AlexGalhardo/grim-cubes/commit/611b1d5ee89ed35f4511fd51ae0ec21fa2b00c39))
- **web:** Wire the full run loop (combat, spawn, drops, XP, level-up, chunks, origin shift) into the web app ([2d5d8dd](https://github.com/AlexGalhardo/grim-cubes/commit/2d5d8dd7ea2c8708e9f63b41033dbc547143aced))
- **e2e:** Add level-up e2e and deterministic boot seed ([2a9abc8](https://github.com/AlexGalhardo/grim-cubes/commit/2a9abc89d4cab2e78941f63e2361f3bf4b512ba0))
- **assets:** Add `tools/assets-gen` generating the 24 PROTÓTIPO placeholder `.bbmodel` models and textures ([fc91a7c](https://github.com/AlexGalhardo/grim-cubes/commit/fc91a7c75bd29a5c3a705e70c91f6cf4678f6125))
- **e2e:** Run Playwright with a single worker under SwiftShader ([8945c1d](https://github.com/AlexGalhardo/grim-cubes/commit/8945c1d5377f469ae10bb2c3fd8ba076e9f3c44c))
- **game:** Add weapon tiers and upgrades, SMG burst, MG continuous fire with speed penalty and bazooka explosions with self-damage (projectile speeds for SMG/MG/bazooka are provisional Orq values) ([e2d8065](https://github.com/AlexGalhardo/grim-cubes/commit/e2d80659243158218972b95286d88e832994bd70))
- **web:** Load the asset manifest (glb, atlas, VAT) and render the animated horde and glb props in the web app ([4c953bb](https://github.com/AlexGalhardo/grim-cubes/commit/4c953bb51e1b5eb85be6a19e18b8563141aeef92))
- **assets:** Require a size class for enemy and prop `.bbmodel` files ([3902244](https://github.com/AlexGalhardo/grim-cubes/commit/3902244a85ba82deffb775f5e7971887600dfddb))
- **assets:** Bring hero, merchant and wail widths into the Art Bible range ([2582d65](https://github.com/AlexGalhardo/grim-cubes/commit/2582d651357200cd60a60408b39eb115d5a0113a))
- **web:** Add the model review route and silhouette captures (`docs/art/review`); freeze the horde while paused ([c7dc306](https://github.com/AlexGalhardo/grim-cubes/commit/c7dc3063682cb968a6572fc96cc3a1cb8e1ae8eb))
- **e2e:** Add Cemetery world captures and refresh baselines with the horde, glb props and cube floor ([c8904fa](https://github.com/AlexGalhardo/grim-cubes/commit/c8904fa967b85b3f96db6cff91c0790708bf9308))
- **docs:** Amend SDD 02/04/05 to match the implemented ECS, combat, spawn and data loaders
- **ci:** Add CI (lint, typecheck, unit, integration, build-web, e2e gated) and CodeQL workflows (#1) ([da8923e](https://github.com/AlexGalhardo/grim-cubes/commit/da8923ee65069ec95a017f53a20937718c27413b))

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
