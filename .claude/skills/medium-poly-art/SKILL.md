---
name: medium-poly-art
description: Make a Grim Cubes 3D asset (hero, enemy, boss, NPC, prop, scenery, weapon) in the medium-poly hand-painted style from a concept picture with AssetFurnace image-to-3D, finish, rig and animate it in Blender, and bring it into the game as a GLB. Use for any 3D asset work of ROADMAP track S-18. Not valid before v0.6.0 is published.
---

# Medium-poly art workflow (Grim Cubes, ROADMAP S-18)

Decision and limits: `docs/adrs/0029-medium-poly-image-to-3d.md`. Art rules: `docs/art-bible.md` (palette §3,
lighting and contour §4 stay; §5 to §10 are rewritten in S-18). The voxel workflow (`blockbench-art`) is legacy and
lives on the `voxel-legacy` branch.

## 0. Preflight (stop if any fails)

- `v0.6.0` is published (ROADMAP S-17). No medium-poly asset enters `main` before that.
- AssetFurnace is installed at a pinned version and its MCP server answers (`claude mcp add assetfurnace -- <install dir>/lab mcp`),
  or the PO approved another route in `docs/PROGRESS.md`. Never install it, update it or download model weights
  without showing the PO the source, size and licence first and getting a yes.
- 3D engine: **Pixal3D**. Never Hunyuan3D (its weights are not licensed for the EU, the UK and South Korea).
  TRELLIS.2 only on Linux with NVIDIA.
- The PO's machine has an RTX 4060 with 8 GB of VRAM. If a run fails for memory, do not retry in a loop: report it.
  The cloud route costs money per model and needs the PO's approval each time the budget changes.
- Blender 4.2 or newer is installed (5.3 is). `bun run assets:build` has the GLB path (ROADMAP S-18-02); until it
  does, stop after step 5.

## 1. Source picture

1. Use the concept art in `references/concept-arts/` for that asset. If there is none, generate one inside AssetFurnace
   with FLUX.2 klein and save the prompt in the matching `prompt-*.md`.
2. One subject per picture, plain background, soft 3D-render look. Humanoids in A-pose with open hands
   (AssetFurnace `docs/prompt-guide.md`). Crop a group picture into one picture per character.
3. Keep the grimdark palette of Art Bible §3: iron, rust, bone, blood, ember. No pure white or black.

## 2. Generate

1. Run image-to-3D with Pixal3D through the MCP tools or the CLI. Keep the seed and the settings.
2. Open the `.provenance.json` of the run. The licence classification must be `commercial-clear`; anything else
   means the asset is not used.
3. Look at the result from the game camera angle (55 degrees of elevation) before going on. A model that only looks
   good from the front is rejected here, not after rigging.

## 3. Finish to the budget

Triangles: hero 3,000 to 6,000; common enemy 400 to 1,200; elite 1,500 to 2,500; boss 6,000 to 12,000; prop 100 to
800. Use the tool's Finish step (low-poly clean-up and Pixel Match) and its Blender helpers.

- One albedo texture per model with painted light and shadow; no PBR maps unless the ADR of that model says why.
- Texture side: 512 for common enemies and props, 1024 for the hero, elites and bosses.
- The silhouette must read in solid black at the on-screen size (hero about 100 px tall at 1080p, common enemy
  about 60 px).
- Origin at the feet, +Y up, facing the same way as the current models, 1 unit = 1 metre at the sizes of Art Bible §5.1.

## 4. Rig and animate

- Humanoids: the tool's auto-rig, then one clip per required name of `tools/assets-build/rules.ts` `REQUIRED_CLIPS`
  (hero: idle, run, attack_melee, attack_ranged, hit, dash, death, victory; enemies: idle, walk, attack, hit, death;
  bosses: idle, walk, enrage, phase_change, death_execution; npc: emerge, idle, talk, hand_over, submerge). Map the
  tool's presets where they fit and animate the rest in Blender. No foot sliding.
- Non-humanoids (leech, watcher, some bosses): rig by hand with the Blender helpers or the tool's quadruped
  pipeline. Record the skeleton in the hand-off.
- Sockets the game reads stay as named bones or empties: `weapon_socket` (hero, merchant), `hit_socket` (enemies,
  bosses).

## 5. Save in the repository

1. `assets/src/models/<category>/<name>.glb`, plus `<name>.provenance.json` beside it and the source picture path
   in the hand-off.
2. Optimise with glTF Transform (quantisation, texture resize, optional LOD). Record the file size before and after.
3. Register the tool version and the licences of that run in `docs/legal/third-party.md` the first time a new
   engine or version is used.

## 6. Build and validate (all must pass)

- `bun run assets:build`, `bunx vitest run tools/assets-build tools/bake-vat`, `bun run data:check`.
- Captures on the four screen targets (1920x1080, 2560x1440, 896x414, 800x360) in combat, with the contour light on.
- `bun run ux:legibility`: hero over ground at least 3:1, enemy over ground at least 2.5:1.
- `bun run test:perf`: `frameP99` inside the tolerance of `tools/perf/compare.ts` with 100 enemies on desktop.

## 7. Hand-off

Before and after captures, triangle count, texture size, GLB size, the provenance classification, what was rigged by
hand, and anything not verified. The hero proof (S-18-03) stops for the PO's approval before any other model.

## Never

- Mix voxel and medium-poly models in a public build.
- Commit a GLB without its `.provenance.json`.
- Hand-edit a `.bbmodel` or revive the voxel generator on `main`.
- Spend money (cloud generation, rented GPU) without the PO's yes in `docs/PROGRESS.md`.
