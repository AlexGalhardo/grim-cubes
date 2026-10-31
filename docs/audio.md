# Áudio do Grim Cubes

Este documento descreve o áudio gerado para o jogo: direção sonora, desenho de som por categoria, tabela de todos os assets, créditos gastos e como regenerar. Fontes de verdade: `assets/src/audio/prompts.json` (entrada), `assets/src/audio/<tipo>/<id>.meta.json` (saída registrada), GDD §22, Art Bible §12 e SDD 08.

## 1. Estilo sonoro e direção

- Tom: metal pesado e coral grave, percussão de tambor de guerra, sem sintetizadores alegres. Mood de DOOM moderno e cantos gregorianos distorcidos, sem copiar melodias (Art Bible §12 e §13).
- SFX: impactos secos e graves, "crunch" de osso nas mortes, metal nas armaduras, nada de sons "cartoon" (pops, molas). Os prompts seguem o template `<objeto/ação>, <material>, <tom>, <distância>, no music, game sound effect`, com `prompt_influence` 0,5 e duração de 0,5 a 1,5 s nos hits e de 1,5 a 3 s em mortes e entradas de chefe.
- Música: BPM de 70 a 80 no menu e de 120 a 140 no combate (140 nos chefes). Sem melodias "pegajosas" nas ondas, para o combate não cansar. Transição por crossfade de 2 s (GDD §22.2).
- Voz: chefes em inglês (D24), vozes graves e roucas; efeito de caverna e pitch de −2 a −4 semitons são aplicados no build, não na API (SDD 08 §3, ainda não implementado).
- Mix: buses `master`, `sfx`, `music`, `voice`, `ui`; o hit do herói fica sempre acima da música (sidechain: música −3 dB por 200 ms).

## 2. Desenho de som por categoria

| Categoria | Prefixo | Intenção | Duração típica |
| --- | --- | --- | --- |
| Herói | `sfx_player_*`, `sfx_pickup_*` | armadura pesada de carrasco: impacto surdo, queda de placas, sino grave no level-up | 0,5 a 1,5 s |
| Armas | `sfx_sword_*`, `sfx_pistol_*` | ferro enferrujado cortando osso e carne; pistola velha com estalo seco | 0,5 a 0,6 s |
| Inimigos | `sfx_enemy_*` | osso quebrando, corpos desabando, lamento cortado por estalo | 0,5 a 1 s |
| Chefes | `sfx_boss_*` | entrada de 3 s com presença grave, ataques de 1,2 a 1,5 s com impacto | 1,2 a 3 s |
| UI | `sfx_ui_*` | placas de ferro, trinco, moedas e madeira oca | 0,5 a 0,8 s |
| Rounds | `sfx_round_*` | tambor de guerra no início, sino rachado no fim | 1,5 a 3 s |
| Música | `mus_*` | menu lento e ritual; ondas tensas e percussivas; chefe épico com coral e metal industrial; uma faixa por bioma e uma para cada um dos chefes 4 e 5 | 60 s (temas) e 150 s (biomas e chefes) |
| Voz | `vo_boss_*` | falas curtas de entrada, mudança de fase e morte dos chefes 4 e 5 | 1,6 a 2,6 s |

## 3. Assets

A duração é a medida com `ffprobe` nos arquivos gerados. Os prompts estão exatamente como no `prompts.json`.

| Id | Arquivo | Tipo | Duração | Prompt | Voz | Uso no jogo |
| --- | --- | --- | --- | --- | --- | --- |
| `sfx_player_hit` | `assets/src/audio/sfx/sfx_player_hit.mp3` | sfx | 0.6 s | heavy iron armor taking a blunt hit, dull metal clang with a wet grunt of impact, heavy dry tone, close, no music, game sound effect | — | evento `PlayerHit` (herói levou dano); dispara o sidechain da música |
| `sfx_player_death` | `assets/src/audio/sfx/sfx_player_death.mp3` | sfx | 1.5 s | armored executioner collapsing, rusted plate armor crashing to stone ground, low exhale, heavy dry tone, close, no music, game sound effect | — | estado `Dying` (hp do herói <= 0) |
| `sfx_player_levelup` | `assets/src/audio/sfx/sfx_player_levelup.mp3` | sfx | 1.2 s | deep tolling iron bell with a short dark choir swell, cold metal, heavy tone, medium distance, no music melody, game sound effect | — | evento `LevelUp` |
| `sfx_pickup_fragment_01` | `assets/src/audio/sfx/sfx_pickup_fragment_01.mp3` | sfx | 0.5 s | small bone fragment snapping and clinking into a pouch, dry bone and tiny metal, dry tone, close, no music, game sound effect | — | coleta de `Fragment` pelo herói |
| `sfx_sword_swing_01` | `assets/src/audio/sfx/sfx_sword_swing_01.mp3` | sfx | 0.5 s | rusted broadsword swinging through air, heavy iron blade whoosh, dry tone, close, no music, game sound effect | — | evento `Swung` (espada) |
| `sfx_sword_hit_01` | `assets/src/audio/sfx/sfx_sword_hit_01.mp3` | sfx | 0.5 s | rusted sword slicing into a skeleton, crunch of bone and dull metal scrape, heavy dry tone, close, no music, game sound effect | — | `Damaged` por golpe de espada (variação 1) |
| `sfx_sword_hit_02` | `assets/src/audio/sfx/sfx_sword_hit_02.mp3` | sfx | 0.5 s | rusted sword chopping through rotten flesh and bone, wet crunch with a metal ring, heavy tone, close, no music, game sound effect | — | `Damaged` por golpe de espada (variação 2) |
| `sfx_pistol_shot_01` | `assets/src/audio/sfx/sfx_pistol_shot_01.mp3` | sfx | 0.6 s | single shot from a heavy old iron pistol, dry loud crack with short low thump, heavy dry tone, close, no music, game sound effect | — | evento `Fired` (pistola) |
| `sfx_enemy_spawn_01` | `assets/src/audio/sfx/sfx_enemy_spawn_01.mp3` | sfx | 1.0 s | undead rising from graveyard soil, dirt crumbling and bones clacking, low wet groan, wet tone, medium distance, no music, game sound effect | — | surgimento de inimigo comum |
| `sfx_enemy_hit_01` | `assets/src/audio/sfx/sfx_enemy_hit_01.mp3` | sfx | 0.5 s | bone cracking under impact, short dry crunch, dry tone, close, no music, game sound effect | — | `Damaged` em inimigo comum |
| `sfx_enemy_husk_death` | `assets/src/audio/sfx/sfx_enemy_husk_death.mp3` | sfx | 1.0 s | shambling corpse collapsing into a pile of bones, brittle crunch and a rattling clatter, heavy dry tone, close, no music, game sound effect | — | `Died` de Carcaça e demais corpos |
| `sfx_enemy_wail_death` | `assets/src/audio/sfx/sfx_enemy_wail_death.mp3` | sfx | 1.0 s | ghostly wail cut short by a sharp bone snap, thin high rasp fading out, cold tone, medium distance, no music, game sound effect | — | `Died` do Lamento |
| `sfx_boss_gravedigger_entry` | `assets/src/audio/sfx/sfx_boss_gravedigger_entry.mp3` | sfx | 3.0 s | giant gravedigger dragging an iron shovel across stone, slow heavy footsteps and a low guttural roar, heavy dry tone, medium distance, no music, game sound effect | — | `BossIntro` do Coveiro (round 10) |
| `sfx_boss_gravedigger_charge` | `assets/src/audio/sfx/sfx_boss_gravedigger_charge.mp3` | sfx | 1.5 s | huge armored brute charging forward, pounding heavy footfalls on stone with a rising iron rattle, heavy dry tone, medium distance, no music, game sound effect | — | `BossTelegraph` da investida do Coveiro |
| `sfx_ui_hover` | `assets/src/audio/sfx/sfx_ui_hover.mp3` | sfx | 0.5 s | soft iron plate tick, small metal click, dry tone, close, no music, game sound effect | — | hover em botão da UI |
| `sfx_ui_confirm` | `assets/src/audio/sfx/sfx_ui_confirm.mp3` | sfx | 0.5 s | heavy iron latch locking shut, solid metal clunk, heavy dry tone, close, no music, game sound effect | — | confirmar (botão, escolha de carta) |
| `sfx_ui_buy` | `assets/src/audio/sfx/sfx_ui_buy.mp3` | sfx | 0.8 s | handful of old coins dropped on a wooden counter with a bone rattle, dry tone, close, no music, game sound effect | — | compra na loja |
| `sfx_ui_no_gold` | `assets/src/audio/sfx/sfx_ui_no_gold.mp3` | sfx | 0.5 s | dull empty thud of a hollow wooden chest closing, short dry low tone, close, no music, game sound effect | — | compra sem ouro suficiente |
| `sfx_round_start_drum` | `assets/src/audio/sfx/sfx_round_start_drum.mp3` | sfx | 1.5 s | war drum single deep hit with a low rumble tail, heavy dry tone, medium distance, no music melody, game sound effect | — | evento `RoundStarted` |
| `sfx_round_end_bell` | `assets/src/audio/sfx/sfx_round_end_bell.mp3` | sfx | 3.0 s | single cracked iron church bell toll, long cold metallic decay, heavy tone, far distance, no music melody, game sound effect | — | evento `RoundEnded` |
| `mus_menu` | `assets/src/audio/music/mus_menu.mp3` | music | 60.1 s | slow dark ritual music, 75 BPM, deep low choir chanting with distorted gregorian feel, heavy detuned guitar drones and slow war drums, grimdark, no cheerful synthesizers, seamless loop | — | título e Ossuário (menu) |
| `mus_biome_cemetery` | `assets/src/audio/music/mus_biome_cemetery.mp3` | music | 150.0 s | aggressive heavy metal combat music, 130 BPM, chugging low guitars, pounding war drums, ominous low choir, grimdark graveyard mood, no cheerful synthesizers, seamless loop | — | combate no Cemitério Submerso (`music` em `biomes.json`) |
| `mus_biome_swamp` | `assets/src/audio/music/mus_biome_swamp.mp3` | music | 150.0 s | aggressive heavy metal combat music, 130 BPM, chugging low guitars, pounding war drums, ominous low choir, grimdark rotting bone swamp mood, wet low drones, croaking dissonant choir, no cheerful synthesizers, seamless loop | — | combate no Pântano de Ossos |
| `mus_biome_forge` | `assets/src/audio/music/mus_biome_forge.mp3` | music | 150.0 s | aggressive heavy metal combat music, 130 BPM, chugging low guitars, pounding war drums, ominous low choir, grimdark infernal forge mood, anvil hammering percussion, roaring furnace drones, no cheerful synthesizers, seamless loop | — | combate na Forja Infernal |
| `mus_biome_nest` | `assets/src/audio/music/mus_biome_nest.mp3` | music | 150.0 s | aggressive heavy metal combat music, 130 BPM, chugging low guitars, pounding war drums, ominous low choir, grimdark biomechanical nest mood, cold mechanical pulses, wet organic textures, no cheerful synthesizers, seamless loop | — | combate no Ninho Biomecânico |
| `mus_round` | `assets/src/audio/music/mus_round.mp3` | music | 60.1 s | tense percussive grimdark combat music for survival waves, 120 BPM, driving war drums and industrial metal hits, low palm-muted guitar pulse, ominous brass drones, rising tension, no melody hooks, no cheerful synthesizers, seamless loop | — | tema genérico das ondas (reserva quando o bioma não tem faixa própria) |
| `mus_boss` | `assets/src/audio/music/mus_boss.mp3` | music | 60.0 s | epic heavy boss battle music, 140 BPM, massive wordless choir, crushing industrial metal guitars, pounding orchestral percussion and anvil strikes, apocalyptic grimdark mood, no cheerful synthesizers, seamless loop | — | tema genérico de chefe (reserva quando o chefe não tem faixa própria) |
| `sfx_boss_alpha_hunter_entry` | `assets/src/audio/sfx/sfx_boss_alpha_hunter_entry.mp3` | sfx | 3.0 s | towering alien hunter decloaking with a crackle of static, wet clicking mandibles and a low predatory snarl, heavy dry tone, medium distance, no music, game sound effect | — | `BossIntro` do Caçador Alfa (round 40) |
| `sfx_boss_alpha_hunter_leap` | `assets/src/audio/sfx/sfx_boss_alpha_hunter_leap.mp3` | sfx | 1.5 s | huge predator leaping through the air then slamming into the ground, heavy impact with cracking stone and a guttural roar, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossLeap` do Caçador Alfa |
| `sfx_boss_nest_queen_entry` | `assets/src/audio/sfx/sfx_boss_nest_queen_entry.mp3` | sfx | 3.0 s | colossal biomechanical queen rising with a shriek, wet chitin scraping, deep resonant hiss and dripping ichor, heavy dry tone, medium distance, no music, game sound effect | — | `BossIntro` da Rainha do Ninho (round 50) |
| `sfx_boss_nest_queen_sweep` | `assets/src/audio/sfx/sfx_boss_nest_queen_sweep.mp3` | sfx | 1.2 s | massive barbed tail whipping across the ground, fast whoosh and a crunching impact on bone and metal, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossSweep` da Rainha |
| `mus_boss_alpha_hunter` | `assets/src/audio/music/mus_boss_alpha_hunter.mp3` | music | 150.0 s | relentless heavy metal boss music, 140 BPM, stalking low guitar riffs, tribal war drums, tense high string stabs, predator hunt mood, grimdark, no cheerful synthesizers, seamless loop | — | round de chefe 40 (Caçador Alfa) |
| `mus_boss_nest_queen` | `assets/src/audio/music/mus_boss_nest_queen.mp3` | music | 150.0 s | crushing heavy metal boss music, 135 BPM, detuned low guitars, industrial grinding percussion, shrieking choir swells, biomechanical hive horror mood, grimdark, no cheerful synthesizers, seamless loop | — | round de chefe 50 (Rainha do Ninho) |
| `vo_boss_alpha_hunter_entry` | `assets/src/audio/voice/vo_boss_alpha_hunter_entry.mp3` | voice | 2.6 s | You cannot see me. You can only die. | Callum (rouca) | `BossIntro` do Caçador Alfa |
| `vo_boss_alpha_hunter_phase` | `assets/src/audio/voice/vo_boss_alpha_hunter_phase.mp3` | voice | 1.9 s | The hunt begins in earnest. | Callum (rouca) | início da fase de caça (padrão `thermal_vision`) |
| `vo_boss_alpha_hunter_death` | `assets/src/audio/voice/vo_boss_alpha_hunter_death.mp3` | voice | 2.3 s | A worthy prey... after all. | Callum (rouca) | `BossDied` do Caçador Alfa |
| `vo_boss_nest_queen_entry` | `assets/src/audio/voice/vo_boss_nest_queen_entry.mp3` | voice | 2.0 s | My children hunger. Feed them. | Brian (grave) | `BossIntro` da Rainha do Ninho |
| `vo_boss_nest_queen_phase` | `assets/src/audio/voice/vo_boss_nest_queen_phase.mp3` | voice | 1.7 s | Rise, my brood. Rise! | Brian (grave) | início da fase de ovos (`egg_spawn`) |
| `vo_boss_nest_queen_death` | `assets/src/audio/voice/vo_boss_nest_queen_death.mp3` | voice | 1.6 s | The hive... will remember. | Brian (grave) | `BossDied` da Rainha do Ninho |

Vozes (conta ElevenLabs, plano Creator): o Caçador Alfa usa **Callum** (`N2lVS1w4EtoT3dr4eOWO`, rouca e inquietante) e a Rainha do Ninho usa **Brian** (`nPczCjzI2devNBz1zQrb`, grave e ressonante). A escolha saiu da lista de vozes da conta, entre as que soavam graves e sombrias. Trocar a voz exige alterar o `voiceId` no `prompts.json` e regenerar com `--force`.

Os temas `mus_menu`, `mus_round` e `mus_boss` têm 60 s. A API de música (`POST /v1/music`, `music_length_ms` de 3.000 a 600.000, modelo `music_v1`) não tem parâmetro de loop; o "seamless loop" é só pedido no prompt, então o ponto de emenda precisa ser conferido de ouvido antes de o motor de áudio usar a faixa em `loop`.

## 4. Créditos

- Estimativa do script para o conjunto: 21.167 créditos (SFX 200 cada, música 900 por minuto, voz 1 por caractere).
- Consumo real medido no saldo da conta: de 31.917 para 45.105 de 124.333 créditos do ciclo, ou seja, **13.188 créditos** para os 39 arquivos (inclui a repetição de uma faixa que falhou com HTTP 429). A estimativa do script é conservadora (cerca de 60% acima do real).
- Plano: Creator (`plan: creator` em todos os `.meta.json`), com licença comercial.

## 5. Como regenerar

1. Coloque `ELEVENLABS_API_KEY` e `ELEVENLABS_PLAN=creator` no `.env` local (nunca commitado) ou no ambiente. O Bun carrega o `.env` do diretório atual.
2. Confira o que mudou: `bun run audio:generate --dry-run`. O script pula arquivos cujo `meta.json` tem o mesmo hash (prompt, modelo, duração, loop, influência e voz).
3. Gere: `bun run audio:generate --max-credits 30000`. Para um arquivo ou grupo, use `--only 'sfx_ui_*'`; para refazer mesmo sem mudança, `--force`.
4. Se aparecer `HTTP 429`, rode de novo: só o que falhou é gerado.
5. Depois de gerar, escute as faixas de música em loop e confira o `plan` dos `.meta.json`; arquivos com `plan: free` não entram no manifest de produção.
6. Atualize a tabela da seção 3 deste documento quando mudar prompt, voz ou duração.

## 6. Pendências

- O motor de áudio (S2) ainda não carrega estes arquivos: não existe manifest nem etapa de áudio no `assets-build`. Os arquivos estão em `assets/src/audio/<tipo>/<id>.mp3`; o caminho e o formato do manifest ficam para o S2 definir.
- O pós-processo (loudness −16/−14 LUFS, trim de silêncio, pitch dos chefes) não está implementado (SDD 08 §3).
- Faltam SFX de passos, dash, armas extras, mortes por tipo e demais itens do GDD §22.1, e as falas do Mercador de Ossos (§22.3).
