# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **android:** Debug APK for sideloading (`bun run build:android`, Capacitor 8.6.0), attached to the v0.5.0 GitHub Release. Not a Play build (B-04-04)

## [0.5.0] - 2026-11-01

### Added

- **tools:** `bun run release major --rc` (and `rc --major`) opens the next major's release candidate (`0.9.0` → `1.0.0-rc.1`); on a `release/*` branch commitlint accepts only `fix:`, `docs:` and `chore:`, and CI passes the branch name (R-01-01 tooling; no tag is cut)
- **audio:** Twelve SFX from the GDD §22.1 minimum list, bringing the catalog to 82 SFX, 10 music and 40 voice lines, each with measured loudness; the ElevenLabs credit total is in `docs/audio/credits.md` (A-05-02, B-03-03)
- **fix:** The first Esc after choosing a level-up card opens the pause menu (it looked at the dialog still in the page for a moment; it now reads the game state)
- **tests:** `?bench=soak` in debug builds: the greedy bot plays whole runs on an immortal hero in the browser, one page load per run, and a downloadable report records fps, frame-time percentiles, JS heap and errors (R-01-02)
- **game:** The simulator's bot (`createBot`, the greedy and tank policies) now lives in `packages/game/src/bot` so the browser soak can play with it too; it can sidestep a prop it is stuck against (`unstick`, on in the soak only, so the balance reports are unchanged)
- **ui:** "Sair do jogo" at the end of the title menu on the desktop build (confirmed, closes the app through a sender-checked IPC channel), and a confirmed "Voltar ao menu" in Options during a run, on the results and on the demo end, next to the one in the pause menu; the run stays saved at the start of its round and Continue resumes it
- **tools:** `assets:build` refuses audio whose `meta.json` says the free ElevenLabs plan or has no plan, listing the files (A-05-02)
- **audio:** The engine can loop a sound (`playLoop`/`stop`, with a hold that ends it a moment after the last call): the SMG and MG loops while they fire and the biome ambience under the hero; the first rage of a boss is shouted (`voice_<boss>_enrage`, captioned in both languages)
- **ui:** Embedded fonts: Pixelify Sans (display) and Inter (text), self-hosted `.woff2` in `public/fonts` (latin and latin-ext, `font-display: swap`, latin preloaded) under the SIL OFL, registered in `docs/legal/third-party.md`; the UI no longer falls back to system fonts
- **tests:** A virtual gamepad for debug builds (`?gamepad=1`, `gc.debug.gamepad`) and an e2e spec that walks menu, slots, difficulty and pause with it (B-04-02)
- **ui:** Five rarities in the UI: Normal (bone), Rare (blue), Epic (purple), Legendary (orange) and Mythic (yellow) with `rarity-1..5` tokens and a distinct shape for each in colour-blind mode (Art Bible 3.3, GDD 15.1)
- **game:** The `pull_fragments` item effect (XP magnet): every N seconds of fighting the fragments on the floor fly to the hero, more often with more copies
- **game:** Five automatic spells bought as tier-4 items (Ossuary Bolt, Bone Circle, Soul Lightning, Grave Mines, Ash Pulse) fire on their own during a round, each with a `SpellCast` VFX
- **tests:** Playwright baselines for the key-art menu, save slots, Options, pause, Ossuary and shop at the four viewports (A-07-03). The e2e job stays out of required CI
- **fix:** A save that finishes after a newer Ossuary edit no longer overwrites those souls; the write keeps the revision it started with
- **ui:** The English name of `grim_pact` is Grim Bargain, so it does not read as the Grim difficulty
- **ci:** The perf bench runs only on `workflow_dispatch` or on a pull request labeled `perf`, and fails when draw calls, active meshes, or the median frame time grow past the baseline (A-01-03)
- **docs:** KTX2 stays out of the 1.0 CI (ADR-0027). The Windows build stays unsigned in 1.0 (ADR-0008). Capacitor dependencies are approved for the BETA opening and are not installed in this release (ADR-0028)

### Fixed

- **game:** Soul Lightning hits at most `jumps` enemies, counting the first. Two Bone Circle copies share one spin instead of turning the ring twice as fast

## [0.4.0] - 2026-10-31

### Added

- **ui:** Options toggles for the hero and enemy health bars, on by default and saved with the global settings (save schema 12); the render switch is still to be wired
- **fix:** Clicking Options, speed or pause before the game finished loading no longer throws `Cannot access 'optionsOpen' before initialization`
- **game:** An Easy difficulty (enemy HP and damage x0.75, souls x0.75) with its own best round (save schema 11); Easy, Normal and Hard (`grim`) are open from the start and Nightmare unlocks at round 20 on Hard
- **ui:** Main menu over the painted key art (`public/menu/menu-1.webp`), with the buttons on its dark left side
- **ui:** ARPG shop from the PO mockup: hero panel (painted portrait, level, XP, HP, round, gold, souls), weapon, an inventory grid of owned items with counts, all stats in two columns with a before → after preview of the hovered offer, and the Merchant's portrait and a line above four offers in two columns
- **ui:** Options from the PO mockup in three columns that fit without scrolling: segmented buttons, iron switches, sliders, key caps and room for the health bar toggles
- **docs:** Image prompts for the menu key art, the shop, Options, Ossuary and the two portraits (`prompt-*.md`)
- **ui:** A pause menu (Esc, Start on the pad, or a pause button next to the speed one on touch screens) with Continue, Options and Quit to menu (confirmed; the run stays saved at the start of its round)
- **save:** Three save slots, each a complete profile (souls, Ossuary, records, stats, milestones, skins); settings and keys stay global. Save schema 10 moves the old single save into slot 1 with its checksum verified; per-slot storage keys and backups on web and Electron
- **ui:** The slot screen opens from New game (overwrite and erase need a confirmation; keyboard, D-pad and axe covered), and the title menu shows Continue when a slot was used before
- **game:** The run is saved into the slot at the start of every round (round, gold, XP, HP, items, weapon, upgrades, stats, rerolls, difficulty, seed and RNG state; no enemies) and Continue resumes it; dying or finishing the run deletes the checkpoint
- **ui:** Gamepad dash and pause buttons can be remapped in Options (save schema 7)
- **ui:** Boss voice lines are subtitled, with an Options toggle that is on by default (save schema 8)
- **tests:** The effect id enum in the data schema is tied to the implemented handlers, so `data:check` refuses an id without one
- **perf:** Debug hook to toggle the enemy variants and the SDD 14 bench with them (+2 draw calls, no frame cost)
- **game:** The Merchant waits for the hero after each round at a fixed spot (6 u away, opposite the horde): the shop opens on contact, with Enter or the dash button, or after 20 s; an arrow and a countdown show where he is; the simulator and the demo end skip the walk (A-05-01)
- **render:** The Merchant stands at his fixed spot on the map with an interaction ring
- **ui:** Gamepad reroll (X) and game speed (Back), both remappable (save schema 9), and button hints named for the controller: Xbox letters or PlayStation symbols from `Gamepad.id` (B-04-02)
- **ui:** A D-pad focus test for every screen: menu, difficulty, Ossuary, Options, shop, level-up, chest, results and demo end
- **desktop:** The Electron save is a set of files in `%APPDATA%\grim-cubes\saves` (atomic writes over IPC, one-time move from IndexedDB, folder pinned so a rename never loses it), and the build also produces `win-unpacked` for the Steam upload
- **audio:** An LRU budget for the decoded rarely heard sounds; frequent effects stay loaded
- **art:** Hand-drawn item, card and Ossuary icons with tier marks that read in greyscale; in-game captures of all 78 models; distinct silhouettes for the Alpha Hunter, SMG and MG, a grimmer Wail and a segmented Leech; bone and ember accents, darker swamp and nest floors and a darker dead wood so the biomes contrast
- **tools:** A local UX capture of the HUD, level-up, shop and Merchant at 100% and 150% UI scale, and an in-game art capture mode

### Changed

- **assets:** Each atlas is sized to its sprites: 80 MB of atlas GPU memory down to 5 MB
- **ui:** On short screens (800x360) the level-up cards share one row and the shop shows four offers with its buttons beside the gold; the HUD buttons, version and DEMO seal are not drawn under a dialog; the UI scale is capped at 125% on screens 414 px tall or less

## [0.3.0] - 2026-10-31

### Added

- **ui:** Key remapping in Options (save schema 6), rarity shapes in the colour-blind theme and an axe-core check of the main screens
- **ui:** Accessibility options: brightness, contrast, colour-blind modes, flash and shake reduction, UI scale and gore (save schema 5)
- **desktop:** App icon for the Windows executables and the web favicon; Electron fuses and stricter shell permissions; executable checksums in the release
- **render:** Emissive glow from `_e.png` masks, near-white enemy damage numbers, per-boss executions, bleed and thorns VFX, stealth shimmer, egg cracks, decal fade, biome prop dust, merged damage numbers, consumable rings
- **art:** Second passes on the Alpha Hunter and the Nest Queen, longer Wail and Leech legs, foot-locked walk cycles, attack anticipation, ember eyes for the hero
- **tools:** Emissive mask and B-03-01 checklist generators in `assets-gen`
- **art:** Cosmetic Husk and Wail variants (iron pot helmet, blood-crusted Wail) on about 30% of each horde type, picked by entity id without touching the simulation
- **render:** Thorns VFX driven by the `ThornsHit` event, preset particle and decal pools applied live, emissive atlases skipped on the low presets

### Changed

- **balance:** Regeneration lowered after regen started working (Black Bandage, Abyss Heart and Ossuary Mantle to +0.5, the regen card to +0.25) and the Reaper's Hourglass slows enemies by 5% instead of 20%; the simulator check passes on 64x35 and 500x30
- **tools:** The simulator report lists the items each run bought
- **i18n:** pt-BR and English copy reviewed against the GDD
- **docs:** ADRs 0021 to 0024 (Electron, audio engine, telemetry, e2e out of CI) and a refreshed README

### Fixed

- **art:** Animation tracks mirrored by re-saving Blockbench 5.0 files (death, Husk arms, Breeder, Hunter, Leech and Watcher walks) restored
- **render:** The model review route picks the atlas from the manifest, so tiles are no longer black
- **game:** `knockback` and `enemy_speed` now take effect; regeneration is continuous for fractional points
- **ui:** A held gamepad button or direction no longer triggers the first control of a screen that opens
- **render:** The hero portrait light, the white quad under the hero and a per-frame allocation in the character sync

## [0.2.0] - 2026-10-31

### Added

- **desktop:** Windows build with Electron 45 and electron-builder (NSIS installer and portable `.exe`), sandboxed and served from `app://game/`; the release attaches both executables (P-07-02)
- **ui:** Title menu, keyboard and gamepad navigation on every screen, opt-in telemetry interface (A-07-02, A-06-04)
- **art:** Biome props and the sixteen seamless floor tiles refined in Blockbench (B-03-01)

- **render:** The hero faces the enemy it is attacking while moving, with a smoothed shortest-path turn

- **game:** Game speed 1x/2x/3x for testing: Options selector, TAB cycles it, a HUD button on every screen size; save schema 3 (`settings.gameSpeed`)
- **audio:** Web Audio engine (buses, unlock, crossfaded music by state, event sounds) and 39 ElevenLabs assets documented in `docs/audio.md` (P-06-04, A-05-02)
- **ui:** Options screen (video preset, volumes, screen shake, language) saved with the meta (A-01-01)
- **ui:** Animated Merchant portrait in the Shop (A-05-01)
- **art:** Every character refined in Blockbench: hero, weapons, the eight enemies, the five bosses and the Merchant (B-03-01)

- **render:** Pick the video preset from the hardware on boot (cores, memory, renderer) (R-01-03)
- **assets:** Base models for the Alpha Hunter and the Nest Queen (B-01-01, B-01-02)
- **art:** Hero refined in Blockbench with armour plates, mask and painted wear (B-03-01)
- **test:** UI test of the Notice and boss names in English (A-07-01)
- **ci:** `tools/changelog-check` job that fails a PR with feat/fix commits and no new `[Unreleased]` entry, skippable with the `skip-changelog` label (E-04-06)
- **ui:** Optional 20 s tutorial (move, kill, collect), picked on the difficulty screen (A-07-01) ([c3e908f](https://github.com/AlexGalhardo/grim-cubes/commit/c3e908f1f8702c0cc87c49101c1e6a8fea5f80c7))
- **i18n:** Review the English names that came from ids (B-05-01) ([1167186](https://github.com/AlexGalhardo/grim-cubes/commit/116718666d753ec89fbcefbf3ea6c76569fe1f16))
- **render:** Hide broken props, throw dust and draw the blood vial and bone magnet consumables (A-02-04) ([1805558](https://github.com/AlexGalhardo/grim-cubes/commit/1805558a905526e3d4b8adf1f1d4a65338054e1e))
- **web:** Apply the video preset, the dynamic resolution scaler and the render hooks for broken props (A-01-01, A-02-04) ([233fcb7](https://github.com/AlexGalhardo/grim-cubes/commit/233fcb741a03f2b5271a0dc9f85efadb5d589ed4))
- **web:** `debug.toBossFrame` steps to the first boss frame and freezes it, used by the Gravedigger capture (P-06-01) ([06f1e25](https://github.com/AlexGalhardo/grim-cubes/commit/06f1e254afaa121a1384ebbfab6dc5b65aa6cfc3))
- **render:** Warn along every direction of the Forgemaster chain shot (A-03-02) ([c6de4dd](https://github.com/AlexGalhardo/grim-cubes/commit/c6de4dd2625f50bca1d1aacf88aafa64b44b7b75))
- **render:** The Merchant stands 4 u from the hero while the shop is open (A-05-01) ([ab57279](https://github.com/AlexGalhardo/grim-cubes/commit/ab57279795a31ef32513c82052fbd3239b8d15a9))
- **ui:** Atlas icons on shop items, level-up cards, chest offers and ossuary nodes (B-03-05) ([e67c3c9](https://github.com/AlexGalhardo/grim-cubes/commit/e67c3c9fa1e4bca545ce15bf827cdea889295308))
- **game:** Alpha Hunter (round 40: `stealth`, `leap`, `thermal_vision`) and Nest Queen (round 50: `eggs`, `sweep`, `fly_bomb`) simulation, with the `Stealth`, `IgnoresProps` and `Egg` components and events 34–40; provisional HP 60,000 and 65,000; the roster draws from round 60 (B-01-01, B-01-02) ([5aeaf3d](https://github.com/AlexGalhardo/grim-cubes/commit/5aeaf3df09849e1866ea2e72c525078cd8558814))
- **game:** Elites drop consumables with the chance in `data/consumables.json` (A-02-04) ([c1252b2](https://github.com/AlexGalhardo/grim-cubes/commit/c1252b29b66feb627bf9d990315e3e1bdd59108d))

### Changed

- **docs:** GDD counts the 40 items plus the 2 Ossuary exclusives (`ruin_chalice`, `ossuary_mantle`) and states both IQR limits (10 for players, 25 provisional for the greedy bot); Art Bible lists `iron-black`, `mud` and the biome fog colours (B-05-02)
- **data:** Rebalance after breakables and consumables: enemy HP and damage per round, Matriarch 12,500 HP, Forgemaster 15,000 HP, item price `base × 0.15 × N`; 64-run deterministic sim check in CI (A-02-03) ([159e9f3](https://github.com/AlexGalhardo/grim-cubes/commit/159e9f34c1b11064585626029a10062f7d52276a))

### Fixed

- **game:** `hp_regen` now heals the hero every step with the GDD formula
- **render:** The Merchant portrait no longer shrinks the game canvas after the Shop (render target instead of `registerView`)

- **web:** Stop the camera follow and the prop fade while the run is paused (P-06-01) ([89c9f04](https://github.com/AlexGalhardo/grim-cubes/commit/89c9f041445d49ae3487e4ef15c6c019ad0d30e7))

## [0.1.0] - 2026-10-31

### Added

- **game:** Shared `createGameSession` used by the game and the simulator; enemy pool by biome ring (60/30/10) (P-07-05, A-02-01)
- **game:** Breakable props as entities with `PropBroken`, per-chunk memory and consumable drops (blood vial, bone magnet) (A-02-04)
- **game:** Boss roster with seeded draws from round 40 and elite modifiers on bosses from rounds 60 and 100 (A-03-03)
- **render:** Boss modifier auras, the eight enemy types in a debug lineup, the biome border capture, video presets with a dynamic resolution scaler and an optional KTX2 atlas path (A-03-03, A-02-02b, A-01-01, A-01-02)
- **assets:** 84 generated UI icons packed into `atlas_vfx_ui`; reshaped Drowned and Hunter placeholders with painted AO (B-03-05, B-03-01)
- **i18n:** `t()` with en and pt-BR catalogs, game text moved to keys, the three round 1 tips and a lint rule against hard-coded UI text (A-07-01)
- **release:** `release rc --major` (R-01-01); per-package coverage thresholds (A-07-03)

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
- **game:** Add shop rules (price inflation, reroll, tiers, guarantees, lock, sell) and shop system ([7bbb801](https://github.com/AlexGalhardo/grim-cubes/commit/7bbb801a0b0d62875d4aacab78f986731abe7b9e))
- **ui:** Add the Shop screen and open it between rounds ([8122209](https://github.com/AlexGalhardo/grim-cubes/commit/8122209b75c93288876a65715e5186ef7dbc38dd))
- **e2e:** Add shop e2e and per-worktree preview port (`GC_E2E_PORT`) ([9098583](https://github.com/AlexGalhardo/grim-cubes/commit/9098583f73f7580f5f4153805a7e0061b2c2f856))
- **game:** Fix pickup range as a percentage, add `free_rerolls`, reject unknown stats, cap hero speed ([bf05c9c](https://github.com/AlexGalhardo/grim-cubes/commit/bf05c9c89a78607ecb486112d7e28aa5123696f1))
- **web:** Pause the loop while the tab is hidden ([470dffc](https://github.com/AlexGalhardo/grim-cubes/commit/470dffc712d96565c443dcde5c8f6165327fa00e))
- **perf:** Add the bench recorder, `horde100`/`round20` scenarios and Playwright bench harness (`test:perf`) ([2ec32bf](https://github.com/AlexGalhardo/grim-cubes/commit/2ec32bf8208bc35610034fd47f5aa8fb2bcfd289))
- **game:** Add item special effects (8 of 13 implemented, 5 marked alpha) ([363ad89](https://github.com/AlexGalhardo/grim-cubes/commit/363ad89d013065ca8b2d277e63592eaf9730db67))
- **world:** Add blocking-prop collision (static grid per chunk, push-out, avoidance steering) for hero and enemies ([cbbdaef](https://github.com/AlexGalhardo/grim-cubes/commit/cbbdaef263102506c897641ea23ee7b87e7a2c52))
- **render:** Camera from `data/render.json` with exponential follow (8/s) preserving alpha/beta/radius; trapezoid test against GDD §5 ([a0c44b5](https://github.com/AlexGalhardo/grim-cubes/commit/a0c44b5866472288e6a377bb30235a58234bfb21))
- **core:** Add validated save format with SHA-256 checksum and `MetaState` ([7bb9e63](https://github.com/AlexGalhardo/grim-cubes/commit/7bb9e6337dab46e8a707a489335c8fbb1229a9f4))
- **game:** Add souls formula, run tallies and `soul_gain` ([6741882](https://github.com/AlexGalhardo/grim-cubes/commit/674188215dc9d9f87156ad62a89329b3189c99ff))
- **ui:** Add Results screen with souls count-up ([e129165](https://github.com/AlexGalhardo/grim-cubes/commit/e1291658064ac8b1b32cdc07e1519a69d6449e33))
- **web:** Settle runs into the account, persist the save in IndexedDB and show Results ([ee5c32c](https://github.com/AlexGalhardo/grim-cubes/commit/ee5c32c460326f794430784af84e19e336894462))
- **e2e:** Add results e2e covering souls, record and persistence across reload ([b3c0267](https://github.com/AlexGalhardo/grim-cubes/commit/b3c0267ac9cc542277981e8932b320bf49b643b8))
- **render:** Fade tall props between camera and hero (per-instance colour alpha, `data/render.json` `propFade`) with fade e2e capture ([b242dfc](https://github.com/AlexGalhardo/grim-cubes/commit/b242dfcbed7b9c5ff03e0808503032434f4022a2))
- **game:** Add elites (20% roll with pity 5, 4 modifiers, ×1.6 scale, entry warning) and the legendary chest ([2bf5f88](https://github.com/AlexGalhardo/grim-cubes/commit/2bf5f8847c91341e8d2ed6ec23abc20efe105d10))
- **web:** Wire elites and the legendary chest into the loop and HUD ([73d028b](https://github.com/AlexGalhardo/grim-cubes/commit/73d028b62594f5d916cef382d401668520bd29c5))
- **core:** Load saves with `save.bak` fallback, keep unreadable saves in `save.corrupt` and never overwrite newer or unreadable saves ([54d281a](https://github.com/AlexGalhardo/grim-cubes/commit/54d281ae6846db17d3fbac511202ef058a7b92fa))
- **core:** Bound the save parser (64 KB, list lengths, reserved keys) ([2f2d3cd](https://github.com/AlexGalhardo/grim-cubes/commit/2f2d3cd24c170ce2db07ab4cdb34086fbc1c8684))
- **game:** Shop upgrades priced by the round formula, free starting weapon, no repeated or alpha items ([6ca102d](https://github.com/AlexGalhardo/grim-cubes/commit/6ca102d77cd6307920300858ca0e9085bac94f7e))
- **game:** Reject unimplemented effect ids ([c7401d0](https://github.com/AlexGalhardo/grim-cubes/commit/c7401d0a009032415377e2aefbca53e3fab9d6ce))
- **e2e:** Add elite chest and save-safety e2e ([8c356ff](https://github.com/AlexGalhardo/grim-cubes/commit/8c356ffc40d66b5e1b8e5f01d61bfb34d90b2475))
- **render:** Combat VFX: blood and explosion particles, FIFO decals, damage numbers, hit-stop and hit flash (`data/render.json` `vfx`) ([8fd0b64](https://github.com/AlexGalhardo/grim-cubes/commit/8fd0b64adcb7ca2653803a132a6bd547b5150bee))
- **render:** Draw projectiles and fragment piles with thin instances; combat e2e captures ([e10d4c6](https://github.com/AlexGalhardo/grim-cubes/commit/e10d4c66466415c6a9245e33b79e96eaddf947f8))
- **perf:** Bench round20 holds 100 enemies and ~200 projectiles and reports their means ([9cf486e](https://github.com/AlexGalhardo/grim-cubes/commit/9cf486ebe1347c07b7cf8ea84f2785329323a97d))
- **web:** Start the run again outside the bench scenarios ([053485e](https://github.com/AlexGalhardo/grim-cubes/commit/053485effecc059d463f4a8431d1a23e11f82680))
- **docs:** SDD 14 §4 bench metrics as implemented; GDD §18.2 souls use the round where the run ended
- **docs:** Amend SDD 03/06/07/09/14 to the implemented world, save, UI, asset pipeline and performance code; add P-04-06 (projectile and fragment rendering)
- **roadmap:** Fix phase 3 (ALPHA) deps and asserts; split A-02-02 into A-02-02a (behaviors) and A-02-02b (models/VAT) ([d0be5ec](https://github.com/AlexGalhardo/grim-cubes/commit/d0be5ecc6269cbb85d24f89556549f1377729ad5))
- **roadmap:** Fix phase 4 (BETA) deps and asserts; add A-03-00 (boss pattern dispatcher), A-02-04 (destructible props) and B-03-05 (UI icons) ([68a3384](https://github.com/AlexGalhardo/grim-cubes/commit/68a3384b05fd32de146b3bc5b6b921f90c43eb58))
- **roadmap:** Fix phase 5 (1.0 RC) and Android appendix deps, asserts and risks; add M-01-02b (runtime demo flag) ([529a8b8](https://github.com/AlexGalhardo/grim-cubes/commit/529a8b8129bc631d38553cae8aeebe7a2af4952c))
- **docs:** Amend SDD 08/10/11/12/13 to the implemented audio tooling, build, tests, CI and release; add E-04-06 (changelog check) ([b256a64](https://github.com/AlexGalhardo/grim-cubes/commit/b256a64319162579738b9ce9b5f824b5781b2f49))
- **docs:** Fix the GDD §18.2 souls example to match the formula
- **ci:** Add CI (lint, typecheck, unit, integration, build-web, e2e gated) and CodeQL workflows (#1) ([da8923e](https://github.com/AlexGalhardo/grim-cubes/commit/da8923ee65069ec95a017f53a20937718c27413b))
- **game:** Add the Gravedigger boss system (line charge, shovel arc, summon, enrage, rewards) and a debug jump to any round (P-05-07) ([e20ae57](https://github.com/AlexGalhardo/grim-cubes/commit/e20ae571fe27c01960495a71c5debebd9c51d5c4), [5858b5c](https://github.com/AlexGalhardo/grim-cubes/commit/5858b5c3bb94be5b5324272ec9e076482684f8f7))
- **ui:** Add the boss HP bar and the boss intro banner (P-05-07) ([b1bd7f1](https://github.com/AlexGalhardo/grim-cubes/commit/b1bd7f10a1f423f5963d283b78aefbed1adaba45))
- **web:** Wire the boss fight and merge each run into the stored save (P-05-07, P-05-08) ([fabaee5](https://github.com/AlexGalhardo/grim-cubes/commit/fabaee59da2d8c69c373759d7f375ec3e7f62a48))
- **game:** Add the push, latch_drain, ranged_static, charge and spawner behaviors from the data and wire them with enemy shots (A-02-02a) ([3224aa4](https://github.com/AlexGalhardo/grim-cubes/commit/3224aa455971d96cbe7700f1ec366fb6ef8296bc), [b899d7b](https://github.com/AlexGalhardo/grim-cubes/commit/b899d7be8e7cd57169d017a9f6ba599d185c3d34))
- **sim:** Add the headless sim harness with fixed seed and flee policy; ignore generated reports (P-07-04) ([c4b0ea3](https://github.com/AlexGalhardo/grim-cubes/commit/c4b0ea3c02a9bafd902425a6a24a0fca969109fc), [6a2731f](https://github.com/AlexGalhardo/grim-cubes/commit/6a2731f8271b50df3b267d2af6d8ab5aa7efb00f))
- **game:** Add the Ossuary rules, run bonuses stacked with item effects, the Ossuary screen and save-locked purchases (A-04-01) ([01ee926](https://github.com/AlexGalhardo/grim-cubes/commit/01ee92625e48bd27cd7e25bb25d9539ca0d0ff6b), [62d04a8](https://github.com/AlexGalhardo/grim-cubes/commit/62d04a81f895b4a21450dbbf49ab5cc17bdeda87), [470018d](https://github.com/AlexGalhardo/grim-cubes/commit/470018d8b35503ba206e6a41d941b82d8cbe6f2d))
- **game:** Wire the Ruin bonuses: card rerolls, a guaranteed Uncommon in the opening shop offer and the exclusive Legendary items checked against `extra_legendary_pool` (A-04-01) ([bf90035](https://github.com/AlexGalhardo/grim-cubes/commit/bf900358584c24fa23480574bf12ee2cc160aa84), [5cce96f](https://github.com/AlexGalhardo/grim-cubes/commit/5cce96fa209529af9579c60805b74962c37c33d6), [460a352](https://github.com/AlexGalhardo/grim-cubes/commit/460a3525ccd614df7fb49db2a2c7b615714bd63c), [03da7b4](https://github.com/AlexGalhardo/grim-cubes/commit/03da7b43374355ea5ea5e463d446c8496d795ca8))
- **game:** Add difficulties, the difficulty and seed screen and per-difficulty records (A-04-03) ([3b7ac70](https://github.com/AlexGalhardo/grim-cubes/commit/3b7ac70da2cd04229d5fa1ed517cbf91e8103744))
- **data:** Add cross-reference rules, the effect id enum, hero bounds and the data-to-assets check (E-03-04) ([be2740b](https://github.com/AlexGalhardo/grim-cubes/commit/be2740bdbdf88dccf807db0e7f6b6ce130ba991c))
- **game:** Add the Ossuary dash with charges, i-frames and a touch button (A-04-02) ([2ceb682](https://github.com/AlexGalhardo/grim-cubes/commit/2ceb6828c3a3057f733b4eb188cd8e162b39e7cb))
- **render:** Draw elites larger and tinted, elite chests and the incoming edge marker (P-05-06b) ([bc552ee](https://github.com/AlexGalhardo/grim-cubes/commit/bc552eebbc2013c71891e522347175692222eb6f))
- **render:** Draw boss and Hunter telegraphs, the boss execution, the enrage tint and enemy shots (P-05-07) ([f77de29](https://github.com/AlexGalhardo/grim-cubes/commit/f77de29acb493aaac5aa8a8dd8c377a03531227d))
- **game:** Gate items and the round 50 skin behind milestones (A-04-04) ([bf72b31](https://github.com/AlexGalhardo/grim-cubes/commit/bf72b3196d2a8eb6ca1924be0e7e1a1abe6faf76))
- **data:** Add the VFX pools, gore ranges and hit-stop timings to `render.json` (P-04-05) ([c3592c8](https://github.com/AlexGalhardo/grim-cubes/commit/c3592c8d329f408443ecb07de9a6e09bfe62f17e))
- **render:** Add the hit vignette, camera shake, hit squash and the gore comparison capture (P-04-05) ([b52e8e5](https://github.com/AlexGalhardo/grim-cubes/commit/b52e8e5da2201a55fd521ef5926ce1688a168f4a))
- **game:** Remove enemies beyond 40 u without a drop and cull far instances from the horde render (P-03-05) ([ac44b46](https://github.com/AlexGalhardo/grim-cubes/commit/ac44b46c9d4fc753b12c363828762fa9a7863933))
- **render:** Add the skeleton character rig with 0.1 s blends, sockets and speed-scaled locomotion (P-06-06) ([ccf21d7](https://github.com/AlexGalhardo/grim-cubes/commit/ccf21d7137defcd09506674bd165bec55e4023e7))
- **game:** Implement the bleed, thorns, kill explosion and shockwave item effects (B-02-01) ([210ffea](https://github.com/AlexGalhardo/grim-cubes/commit/210ffea66e626b1d69e483e7c04e2b760fdbd728))
- **game:** Add the Swamp Matriarch patterns, hero slow and push, and the boss roster (A-03-01) ([70f931c](https://github.com/AlexGalhardo/grim-cubes/commit/70f931c49a73c24d27e0fbdd17f9564bf2868477))
- **e2e:** Add the boss spec (intro, HP bar, death, chest, shop) and the input spec (keyboard and virtual joystick) (P-05-07, P-02-02) ([ce55e26](https://github.com/AlexGalhardo/grim-cubes/commit/ce55e26d06c76ff884e53ce7e0e5264a268a591b), [f12d257](https://github.com/AlexGalhardo/grim-cubes/commit/f12d257193d504c36b672fc589bca95f7abc1c13))
- **test:** Add the determinism test hashing the world for seed 42 (P-07-03) ([947f5b7](https://github.com/AlexGalhardo/grim-cubes/commit/947f5b78a0cae0fbf19960e3720aba6a799e1771))

- **ui:** Build version label (`vX.Y.Z`) at the bottom-left of the menu and the HUD; hidden in visual captures through `tests/e2e/screenshot.css`

- **art:** Blockbench MCP integration (`.mcp.json`, plugin pinned to v1.10.1 by SHA-256), `docs/blockbench.md`, the `blockbench-art` skill and the `blockbench-artist` agent (Art role)
- **tools:** `assets:gen` skips models listed in `assets/src/models/authored.json`

### Changed

- **balance:** Enemy and boss data tuned with the simulator (bosses 4,800 / 11,000 / 10,000 HP); the GDD 25 death-round spread uses right-censored runs and IQR <= 25 for the greedy bot, and `balance.yml` runs `sim --check` (A-02-03)
- **ci:** The e2e job no longer runs on push, PRs or releases (kept behind `if: false`); run `bun run test:e2e` locally
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
- **game:** Dispatch boss attacks to registered pattern handlers (A-03-00) ([9138346](https://github.com/AlexGalhardo/grim-cubes/commit/9138346451d200fb5715289ed0d1981072b51c16))
- **core:** Publish to store listeners without copying the set (E-03-01) ([d57699e](https://github.com/AlexGalhardo/grim-cubes/commit/d57699ec17654f1c545b82a6d2df489d6d977cf9))
- **ci:** Wait for the ci workflow of the tagged commit before releasing (E-04-03) ([4cdd35a](https://github.com/AlexGalhardo/grim-cubes/commit/4cdd35a50e030f7083abf1a0dd592de8800f7cd9))
- **ci:** Pin every action by commit SHA, add Dependabot (bun and GitHub Actions) and fail the smoke on a live debug API (E-01-06, E-04-04, R-01-05) ([ff185d9](https://github.com/AlexGalhardo/grim-cubes/commit/ff185d975671a7c9cdbe94096f7696fa65364550))
- **e2e:** Per-platform baselines (win32 and linux), UI-only capture, a shared frozen-clock helper, tighter tolerance and an own preview port; regenerate the baselines (E-02-06) ([fea93ae](https://github.com/AlexGalhardo/grim-cubes/commit/fea93aef8a0239ef82b3600dd86360508cbd9278), [7f0a6eb](https://github.com/AlexGalhardo/grim-cubes/commit/7f0a6eb1e3d0c30e8cfc378c992ae1e9a03c49ae), [45af824](https://github.com/AlexGalhardo/grim-cubes/commit/45af8247cb512642ce658f465b7565612805e271), [8560d34](https://github.com/AlexGalhardo/grim-cubes/commit/8560d34b56dda78845fac1184f8608cc6f57e678), [db5fded](https://github.com/AlexGalhardo/grim-cubes/commit/db5fdedb72add10f574295e20c0094b1abd51d59), [53ff412](https://github.com/AlexGalhardo/grim-cubes/commit/53ff41268c455dd37ba173c1fba18ee84ee7be51), [13c0635](https://github.com/AlexGalhardo/grim-cubes/commit/13c063535e83227b53af9bc121aa83247bc0f414))
- **perf:** Record the bench with VFX, projectiles and fragments (P-04-05) ([5519f27](https://github.com/AlexGalhardo/grim-cubes/commit/5519f274d58694c3f22c23549cacacb75c5b5fb8))
- **sim:** Guard the horde simulation with a CPU-time budget and allow 20 s for full-length simulation tests (P-03-06) ([45399e2](https://github.com/AlexGalhardo/grim-cubes/commit/45399e2d2170ce32b7f4fa39013ef857b5227f6d), [a2cdbad](https://github.com/AlexGalhardo/grim-cubes/commit/a2cdbad908a783ad2ce3ce223086f7cadeead3f2))
- **docs:** Mark the six enemy behaviors in SDD 04 §5, add the dash system to SDD 02 §2.3 and update the SDD 14 prototype state (VFX, projectile render, culling) ([4a7e405](https://github.com/AlexGalhardo/grim-cubes/commit/4a7e405be66dbe0583cff70fbc694845834038ba), [84bb276](https://github.com/AlexGalhardo/grim-cubes/commit/84bb27612874bdc3b856dbb693a6d747ac3b2028), [3be4925](https://github.com/AlexGalhardo/grim-cubes/commit/3be49258f1ee9e4780e17a6fb89bbe84d0680c35))
- **roadmap:** Split the elite render into P-05-06b, keep P-04-05 open until vignette, shake and gore capture land, and align the P-03-05 assert with the frustum render cull ([2eccb9d](https://github.com/AlexGalhardo/grim-cubes/commit/2eccb9da41916a35ef04d1fe717d9af404511587), [4748bef](https://github.com/AlexGalhardo/grim-cubes/commit/4748bef63b0fafb70faab54da5ef68f789e53f08), [2a2102a](https://github.com/AlexGalhardo/grim-cubes/commit/2a2102ac615fe925e18ad3969ff7d51a353d0e02))

- **ci:** CI jobs run in parallel after `gate`, and the e2e job is split into 4 Playwright shards on separate runners

### Fixed

- **game:** Move prop steering constants to `world.json`, widen the candidate scratch and add overlaps (P-01-05) ([227d00b](https://github.com/AlexGalhardo/grim-cubes/commit/227d00be90756eb48e86fd9afdbcc1c1155d1eca))
- **render:** Unfreeze faded prop materials, reset recycled slot opacity and use model heights (P-02-03) ([ab76b1d](https://github.com/AlexGalhardo/grim-cubes/commit/ab76b1d3d07108d6b9beff79e803ad34bf49900f))
- **core:** Merge runs into the stored save under a lock and keep two corrupt copies; cover the backup and corrupt storage keys (P-05-08) ([98cef15](https://github.com/AlexGalhardo/grim-cubes/commit/98cef151fa097cc8a0760644b780e955b0d8fa04), [e9be7bc](https://github.com/AlexGalhardo/grim-cubes/commit/e9be7bc8ea82ded055ed7c0d3f32191ba44da7e9))
- **game:** Skip alpha items in chests, report escaped elites and read the warning lead from data (P-05-06) ([5640a2d](https://github.com/AlexGalhardo/grim-cubes/commit/5640a2d68850cf5b12c99add06f255fa4fd50901))
- **sim:** Pass hero and events to the projectile system after the API change (P-07-04) ([279deed](https://github.com/AlexGalhardo/grim-cubes/commit/279deed495193f9ef32acce6c1beb471fe52fb71))
- **e2e:** Keep combat piles out of the pickup magnet, freeze the loop and add win32 baselines (P-04-06) ([affd535](https://github.com/AlexGalhardo/grim-cubes/commit/affd5351993e71eff7f07929acdaf4ceb92407cb))
- **game:** Keep enemy spawns out of blocking props (P-03-02) ([d5c9fcc](https://github.com/AlexGalhardo/grim-cubes/commit/d5c9fcca23aed6ae42e1239c58562eb82b136322))
- **game:** Count breeder spawns within a step, route the leech drain through damage events with its killer and mark the drain PlayerHit as a leak (A-02-02a) ([8f123f7](https://github.com/AlexGalhardo/grim-cubes/commit/8f123f7d3b26c27d22ccb09eb15e640fbbadd23b), [f53bc0b](https://github.com/AlexGalhardo/grim-cubes/commit/f53bc0bff84f221a1170f5c0d269f63518ab1cf7), [e14abcf](https://github.com/AlexGalhardo/grim-cubes/commit/e14abcffa95643feb89b27ac4ff0b29b907d984d))
- **game:** Widen the Gravedigger radius to 1.65, stop the boss chest from healing and announce the boss chest and the started pattern to the render (P-05-07) ([1df5e06](https://github.com/AlexGalhardo/grim-cubes/commit/1df5e066d39f506723e0b60682d291544a97ae08), [d3476d7](https://github.com/AlexGalhardo/grim-cubes/commit/d3476d7311a049517b4cf2314d85863329c29993))
- **game:** Carry the chest position in `ChestOpened` (P-05-06) ([44f9cd7](https://github.com/AlexGalhardo/grim-cubes/commit/44f9cd788a965c7b6bf40cabf9807c7d81211151))
- **render:** Reuse blood colour constants and give elite kills the long hit-stop (P-04-05) ([11661e5](https://github.com/AlexGalhardo/grim-cubes/commit/11661e543bff28f9e5de7b72ef07ad97f5884da9))
- **render:** Pulse and shake on `PlayerHit`, skip the leech drain and honour reduced motion (P-04-05) ([430b8e0](https://github.com/AlexGalhardo/grim-cubes/commit/430b8e0eefe4dc353b9395751abeff8fe3d54f50))
- **render:** Release telegraphs on death, remove chests by position and rename `ironLight` (P-05-06b) ([4b791fc](https://github.com/AlexGalhardo/grim-cubes/commit/4b791fc27c59d275cef29a4582d7a2db1988d708))
- **render:** Cull the horde with the real camera frustum instead of a disc (P-03-05) ([a514770](https://github.com/AlexGalhardo/grim-cubes/commit/a5147707038f082b91086059b7199df766c3a2d8))
- **sim:** Cull distant enemies like the game does and re-anchor the determinism hash (P-03-05) ([7d89669](https://github.com/AlexGalhardo/grim-cubes/commit/7d8966926c2d0d1332f88431455b86fb9e1ea4ba))
- **data:** Name the skin tint by theme token and add the `iron-black` colour (A-04-04) ([bb39c4f](https://github.com/AlexGalhardo/grim-cubes/commit/bb39c4f33e679eba7f5edc6ca88a19b297afdd8e), [f73aa8f](https://github.com/AlexGalhardo/grim-cubes/commit/f73aa8f798153c48833b7a9b8f3d2c4db9a953af))
- **tools:** Make `secrets-scan` fail on unknown flags and missing paths (E-02-07) ([92f6135](https://github.com/AlexGalhardo/grim-cubes/commit/92f6135126264f7a06bc885a0465059be3bf5301))
- **web:** Revalidate the asset manifest and add CSP and security headers (E-04-02, R-01-05) ([6370507](https://github.com/AlexGalhardo/grim-cubes/commit/6370507dfbdc4e29579e4313f87ad1912991b616))
- **game:** Apply the knockback the damage system writes to enemy movement (P-04-01) ([6180a55](https://github.com/AlexGalhardo/grim-cubes/commit/6180a55c4e18195196f35427b91548263d1e654a))

[Unreleased]: https://github.com/AlexGalhardo/grim-cubes/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/AlexGalhardo/grim-cubes/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/AlexGalhardo/grim-cubes/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/AlexGalhardo/grim-cubes/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/AlexGalhardo/grim-cubes/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/AlexGalhardo/grim-cubes/compare/2775e6e...v0.1.0
