# B-03-01: checklist do Art Bible §14

Gerado em 2026-10-31 por `tools/assets-gen/checklist.ts` sobre os 78 modelos de `assets/src/models/`. Uma linha por modelo; ✔ cumpre, ✘ não cumpre, n/a não se aplica (grupos e clipes de modelos estáticos; áudio).

## Itens

1. Nome de arquivo segue §10.2 (snake_case ASCII, prefixo `prop_`/`tile_`/`weapon_`, sufixo `_d`; a categoria dos demais vem da pasta)
2. Só cubos/quads; rotações em múltiplos de 22,5°
3. Elementos dentro do orçamento (§5.1; classe de tamanho de `data/` para inimigos e props)
4. Textura múltipla de 32 px, 4 a 12 cores, sem `#FFFFFF`/`#000000`, com desgaste e AO pintados
5. Sombra com matiz (`shadow`, `mist` ou `night` presentes) e luz do topo
6. Silhueta em preto sólido a 64 px (`docs/art/review/silhouettes/<categoria>-side.png`)
7. Grupos e sockets conforme §6
8. Clipes obrigatórios de §8 presentes
9. Emissivos em `_e.png` separado
10. `bun run assets:build` passa
11. Captura in-game com câmera padrão
12. Áudio `meta.json` (não se aplica a modelos 3D)

## Resultado

| Modelo | Elem. | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hero/hero` | 24/24 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/breeder` | 18/20 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/drowned` | 16/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/forged` | 19/20 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/hunter` | 16/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/husk` | 14/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/leech` | 10/10 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/wail` | 10/10 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `enemies/watcher` | 12/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `bosses/alpha_hunter` | 42/48 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `bosses/forgemaster` | 26/48 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `bosses/gravedigger` | 29/48 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `bosses/nest_queen` | 46/48 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `bosses/swamp_matriarch` | 31/48 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `npc/bone_merchant` | 23/28 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `props/prop_antenna_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_anvil_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_barrel_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_bone_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_bonepile_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_cable_01` | 3/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_canister_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_chain_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_chimney_01` | 10/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_circuit_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_crate_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_cross_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_crypt_01` | 12/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_dead_tree_01` | 10/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_egg_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_eggcluster_01` | 10/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_emberrock_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_fence_01` | 7/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_furnace_01` | 10/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_gearpile_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_grass_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_mesh_01` | 7/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_mushroom_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_pipe_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_pod_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_reeds_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_slag_01` | 3/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_spire_01` | 11/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_bonearch_01` | 8/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_hut_01` | 12/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_jar_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_log_01` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_nest_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_skull_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_stump_01` | 7/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_swamp_tree_01` | 10/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_tank_01` | 9/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_tombstone_01` | 5/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_tombstone_02` | 6/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `props/prop_urn_01` | 4/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_cemetery_01` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_cemetery_02` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_cemetery_03` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_cemetery_04` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_forge_01` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_forge_02` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_forge_03` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_forge_04` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_nest_01` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_nest_02` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_nest_03` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_nest_04` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_swamp_01` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_swamp_02` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_swamp_03` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `tiles/tile_swamp_04` | 1/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `weapons/weapon_bazooka` | 5/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `weapons/weapon_mg` | 6/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `weapons/weapon_pistol` | 5/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `weapons/weapon_smg` | 6/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `weapons/weapon_sword` | 5/8 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | n/a | ✔ | ✔ | ✔ | n/a |
| `variants/husk_02` | 15/16 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |
| `variants/wail_02` | 10/10 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a |

## Total de ✘ por item

item 1: 0, item 2: 0, item 3: 0, item 4: 0, item 5: 0, item 6: 0, item 7: 0, item 8: 0, item 9: 0, item 10: 0, item 11: 0, item 12: 0
