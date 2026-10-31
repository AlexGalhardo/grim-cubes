---
name: blockbench-art
description: Refine a Grim Cubes model (hero, weapon, enemy, boss, NPC, prop, tile) in the running Blockbench through the blockbench MCP server, then save it back as the versioned .bbmodel and validate it with the asset pipeline. Use for any visual asset improvement in this repository.
---

# Blockbench art workflow (Grim Cubes)

Full reference: `docs/blockbench.md`. Art rules: `docs/art-bible.md` §5, §6, §7, §8 and the §14 checklist.

## 0. Preflight

- `/mcp` (or a `mcp__blockbench__*` tool call) must reach `blockbench` at `http://localhost:3000/bb-mcp`.
- No connection: do not hand-edit `.bbmodel` JSON as a substitute. Report to the Orq and do the offline queue
  (`docs/blockbench.md` §7).

## 1. Pick and open

1. Take the next item of `docs/art/blockbench-backlog.md` (create it from an audit if it does not exist).
2. If the model is not in `assets/src/models/authored.json`, start from the current generated file.
3. Open it in Blockbench; capture "before" from an offscreen view (front and 3/4) into
   `docs/art/review/<name>/before-*.png`.

## 2. Refine (order matters)

1. Silhouette in big blocks; check it in solid black at 64 px.
2. Texture: one `<name>_d.png`, side a multiple of 32, at most 12 colours, palette tokens only
   (`tools/assets-gen/palette.ts`), no pure white or black, painted wear and AO, hue-shifted shadows.
3. Animation: keep every required clip name (`tools/assets-build/rules.ts` `REQUIRED_CLIPS`), no foot sliding.
4. Never rename or drop groups and sockets: `root`, `body`, `head`, `arm_l`, `arm_r`, `leg_l`, `leg_r`,
   `weapon_socket` (hero, merchant), `hit_socket` (enemies, bosses). Only cubes and quads, rotations in 22.5° steps.
5. Stay inside the element budget (Art Bible §5.1/§5.4) and the height range of §5.1.

## 3. Save back

1. Read the live model from the resource `blockbench://project/{id}.bbmodel`.
2. Write it to `assets/src/models/<category>/<name>.bbmodel` and the decoded texture to `<name>_d.png`
   (the converter expects exactly one texture named after the model).
3. Add `<category>/<name>` to `assets/src/models/authored.json` so `bun run assets:gen` never overwrites it.

## 4. Validate (all must pass)

```sh
bun run assets:build
bunx vitest run tools/assets-gen tools/assets-build tools/bake-vat
bun run data:check
```

Then capture in game through the review route `?art=<id>` (build with `GC_DEBUG_API=1`) into
`docs/art/review/<name>/after-*.png`.

## 5. Handoff

Send the Orq: the asset, the Art Bible §14 checklist ticked, before/after paths, gate output, and the visual
baselines the change affects. Do not commit, push, or regenerate linux baselines; the Orq does that.
