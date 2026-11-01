# Áudio do Grim Cubes

Este documento descreve o áudio gerado para o jogo: direção sonora, desenho de som por categoria, tabela de todos os assets, créditos gastos e como regenerar. Fontes de verdade: `assets/src/audio/prompts.json` (entrada), `assets/src/audio/<tipo>/<id>.meta.json` (saída registrada), GDD §22, Art Bible §12 e SDD 08.

## 1. Estilo sonoro e direção

- Tom: metal pesado, drones graves, percussão de tambor de guerra, sem sintetizadores alegres. Mood de DOOM moderno e cantos gregorianos distorcidos, sem copiar melodias (Art Bible §12 e §13).
- SFX: impactos secos e graves, "crunch" de osso nas mortes, metal nas armaduras, nada de sons "cartoon" (pops, molas). Os prompts seguem o template `<objeto/ação>, <material>, <tom>, <distância>, no music, game sound effect`, com `prompt_influence` 0,5 e duração de 0,5 a 1,5 s nos hits e de 1,5 a 3 s em mortes e entradas de chefe.
- Música: **somente instrumental e ambiência**, sem voz humana, coral, canto ou murmúrio (decisão do PO). Os prompts trazem "instrumental only, no vocals, no choir, no singing, no humming, no voices" e o `prompts.json` marca `instrumental: true`, que o `audio-generate` envia à API como `force_instrumental`. BPM de 70 a 80 no menu e de 120 a 140 no combate (140 nos chefes). Sem melodias "pegajosas" nas ondas, para o combate não cansar. Transição por crossfade de 2 s (GDD §22.2).
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
| Música | `mus_*` | menu lento e atmosférico; ondas tensas e percussivas; chefe épico com metal industrial e metais; uma faixa por bioma e uma para cada um dos chefes 4 e 5; tudo instrumental | 60 s (temas) e 150 s (biomas e chefes) |
| Voz | `voice_<chefe>_*` | falas curtas de entrada, mudança de fase e morte dos 5 chefes; 20 falas do Mercador | 1,6 a 2,6 s |

## 3. Assets

A duração é a medida com `ffprobe` nos arquivos gerados. Os prompts estão exatamente como no `prompts.json`.

| Id | Arquivo | Tipo | Duração | Prompt | Voz | Uso no jogo |
| --- | --- | --- | --- | --- | --- | --- |
| `sfx_player_hit` | `assets/src/audio/sfx/sfx_player_hit.mp3` | sfx | 0.6 s | heavy iron armor taking a blunt hit, dull metal clang with a wet grunt of impact, heavy dry tone, close, no music, game sound effect | — | evento `PlayerHit` (herói levou dano); dispara o sidechain da música |
| `sfx_player_death` | `assets/src/audio/sfx/sfx_player_death.mp3` | sfx | 1.5 s | armored executioner collapsing, rusted plate armor crashing to stone ground, low exhale, heavy dry tone, close, no music, game sound effect | — | estado `Dying` (hp do herói <= 0) |
| `sfx_player_levelup` | `assets/src/audio/sfx/sfx_player_levelup.mp3` | sfx | 1.2 s | deep tolling iron bell with a long cold metallic resonance, ringing overtones, no voices, no choir, no singing, heavy dry tone, close, no music, game sound effect | — | evento `LevelUp` |
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
| `mus_menu` | `assets/src/audio/music/mus_menu.mp3` | music | 60.1 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, slow dark atmospheric ambient music, 75 BPM, deep detuned guitar drones, slow war drums, cold metallic reverb pads and distant wind, grimdark ritual mood, no cheerful synthesizers, seamless loop | — | título e Ossuário (menu) |
| `mus_biome_cemetery` | `assets/src/audio/music/mus_biome_cemetery.mp3` | music | 150.0 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, aggressive heavy metal combat music, 130 BPM, chugging low guitars, pounding war drums, grimdark sunken graveyard mood, tolling bells and cold wind ambience, no cheerful synthesizers, seamless loop | — | combate no Cemitério Afundado (`music` em `biomes.json`) |
| `mus_biome_swamp` | `assets/src/audio/music/mus_biome_swamp.mp3` | music | 150.0 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, aggressive heavy metal combat music, 130 BPM, chugging low guitars, pounding war drums, grimdark bone swamp mood, bubbling mud and croaking insect ambience, slow sludgy riffs, no cheerful synthesizers, seamless loop | — | combate no Pântano de Ossos |
| `mus_biome_forge` | `assets/src/audio/music/mus_biome_forge.mp3` | music | 150.0 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, aggressive heavy metal combat music, 130 BPM, chugging low guitars, pounding war drums, grimdark infernal forge mood, anvil hammering percussion, roaring furnace drones, no cheerful synthesizers, seamless loop | — | combate na Forja Infernal |
| `mus_biome_nest` | `assets/src/audio/music/mus_biome_nest.mp3` | music | 150.0 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, aggressive heavy metal combat music, 135 BPM, detuned low guitars, industrial grinding percussion, grimdark biomechanical hive mood, pulsing organic drones and clicking insect ambience, no cheerful synthesizers, seamless loop | — | combate no Ninho Biomecânico |
| `mus_round` | `assets/src/audio/music/mus_round.mp3` | music | 60.1 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, tense percussive grimdark combat music for survival waves, 120 BPM, driving war drums and industrial metal hits, low palm-muted guitar pulse, ominous brass drones, rising tension, no melody hooks, no cheerful synthesizers, seamless loop | — | tema genérico das ondas (reserva quando o bioma não tem faixa própria) |
| `mus_boss` | `assets/src/audio/music/mus_boss.mp3` | music | 60.1 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, epic heavy boss battle music, 140 BPM, crushing industrial metal guitars, pounding orchestral percussion, anvil strikes and massive brass, apocalyptic grimdark mood, no cheerful synthesizers, seamless loop | — | tema genérico de chefe (reserva quando o chefe não tem faixa própria) |
| `sfx_boss_alpha_hunter_entry` | `assets/src/audio/sfx/sfx_boss_alpha_hunter_entry.mp3` | sfx | 3.0 s | towering alien hunter decloaking with a crackle of static, wet clicking mandibles and a low predatory snarl, heavy dry tone, medium distance, no music, game sound effect | — | `BossIntro` do Caçador Alfa (round 40) |
| `sfx_boss_leap` | `assets/src/audio/sfx/sfx_boss_leap.mp3` | sfx | 1.5 s | huge predator leaping through the air then slamming into the ground, heavy impact with cracking stone and a guttural roar, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossLeap` (salto do Caçador Alfa) |
| `sfx_boss_nest_queen_entry` | `assets/src/audio/sfx/sfx_boss_nest_queen_entry.mp3` | sfx | 3.0 s | colossal biomechanical queen rising with a shriek, wet chitin scraping, deep resonant hiss and dripping ichor, heavy dry tone, medium distance, no music, game sound effect | — | `BossIntro` da Rainha do Ninho (round 50) |
| `sfx_boss_sweep` | `assets/src/audio/sfx/sfx_boss_sweep.mp3` | sfx | 1.2 s | massive barbed tail whipping across the ground, fast whoosh and a crunching impact on bone and metal, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossSweep` (varrida de cauda da Rainha) |
| `mus_boss_alpha_hunter` | `assets/src/audio/music/mus_boss_alpha_hunter.mp3` | music | 150.0 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, relentless heavy metal boss music, 140 BPM, stalking low guitar riffs, tribal war drums, tense high string stabs, predator hunt mood, grimdark, no cheerful synthesizers, seamless loop | — | round de chefe 40 (Caçador Alfa) |
| `mus_boss_nest_queen` | `assets/src/audio/music/mus_boss_nest_queen.mp3` | music | 150.0 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, crushing heavy metal boss music, 135 BPM, detuned low guitars, industrial grinding percussion, shrieking string swells, biomechanical hive horror mood, grimdark, no cheerful synthesizers, seamless loop | — | round de chefe 50 (Rainha do Ninho) |
| `voice_alpha_hunter_entry` | `assets/src/audio/voice/voice_alpha_hunter_entry.mp3` | voice | 2.6 s | You cannot see me. You can only die. | Callum (rouca) | `BossIntro` do Caçador Alfa |
| `voice_alpha_hunter_phase` | `assets/src/audio/voice/voice_alpha_hunter_phase.mp3` | voice | 1.9 s | The hunt begins in earnest. | Callum (rouca) | início da fase de caça (padrão `thermal_vision`) |
| `voice_alpha_hunter_death` | `assets/src/audio/voice/voice_alpha_hunter_death.mp3` | voice | 2.3 s | A worthy prey... after all. | Callum (rouca) | `BossDied` do Caçador Alfa |
| `voice_nest_queen_entry` | `assets/src/audio/voice/voice_nest_queen_entry.mp3` | voice | 2.0 s | My children hunger. Feed them. | Brian (grave) | `BossIntro` da Rainha do Ninho |
| `voice_nest_queen_phase` | `assets/src/audio/voice/voice_nest_queen_phase.mp3` | voice | 1.7 s | Rise, my brood. Rise! | Brian (grave) | início da fase de ovos (`egg_spawn`) |
| `voice_nest_queen_death` | `assets/src/audio/voice/voice_nest_queen_death.mp3` | voice | 1.6 s | The hive... will remember. | Brian (grave) | `BossDied` da Rainha do Ninho |
| `sfx_player_dodge` | `assets/src/audio/sfx/sfx_player_dodge.mp3` | sfx | 0.5 s | armored executioner sidestepping fast, quick cloth and plate scrape with a short air whoosh, heavy dry tone, medium distance, no music, game sound effect | — | evento `Dodged` |
| `sfx_explosion_01` | `assets/src/audio/sfx/sfx_explosion_01.mp3` | sfx | 1.5 s | heavy bazooka shell exploding, deep boom with a debris crackle and a short low rumble tail, heavy dry tone, medium distance, no music, game sound effect | — | evento `Exploded` (bazuca e explosões) |
| `sfx_dash` | `assets/src/audio/sfx/sfx_dash.mp3` | sfx | 0.5 s | armored hero lunging forward in a sharp dash, metal plates scraping and a hard air burst, heavy dry tone, medium distance, no music, game sound effect | — | evento `DashStarted` |
| `sfx_prop_break` | `assets/src/audio/sfx/sfx_prop_break.mp3` | sfx | 0.8 s | old clay burial urn smashing, ceramic shards scattering over stone with a dry crack, heavy dry tone, medium distance, no music, game sound effect | — | evento `PropBroken` (urna quebrada) |
| `sfx_pickup_consumable` | `assets/src/audio/sfx/sfx_pickup_consumable.mp3` | sfx | 0.6 s | small glass vial and bone charm snatched up, short wet glass clink and a low soft chime, heavy dry tone, medium distance, no music, game sound effect | — | evento `ConsumablePicked` |
| `sfx_player_revive` | `assets/src/audio/sfx/sfx_player_revive.mp3` | sfx | 2.0 s | dead warrior revived by a phylactery, deep heartbeat thump, cold magical breath and a low choir swell, heavy dry tone, medium distance, no music, game sound effect | — | evento `Revived` (Filactério) |
| `sfx_elite_incoming` | `assets/src/audio/sfx/sfx_elite_incoming.mp3` | sfx | 2.0 s | ominous low horn blast and distant heavy footsteps approaching, warning of a stronger enemy, heavy dry tone, medium distance, no music, game sound effect | — | evento `EliteIncoming` (aviso 2 s antes) |
| `sfx_elite_spawn` | `assets/src/audio/sfx/sfx_elite_spawn.mp3` | sfx | 1.5 s | powerful monster materializing, dark energy crackle and a deep guttural growl, heavy dry tone, medium distance, no music, game sound effect | — | evento `EliteSpawned` |
| `sfx_chest_drop` | `assets/src/audio/sfx/sfx_chest_drop.mp3` | sfx | 1.0 s | heavy iron-bound chest landing on stone, solid wooden thud with a metal rattle, heavy dry tone, medium distance, no music, game sound effect | — | evento `ChestDropped` |
| `sfx_chest_open` | `assets/src/audio/sfx/sfx_chest_open.mp3` | sfx | 1.2 s | rusted chest lid creaking open, metal latch click and a faint ethereal chime, heavy dry tone, medium distance, no music, game sound effect | — | evento `ChestOpened` |
| `sfx_boss_telegraph` | `assets/src/audio/sfx/sfx_boss_telegraph.mp3` | sfx | 1.0 s | deep rising warning growl with a metallic screech, a huge attack winding up, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossTelegraph` |
| `sfx_boss_summon` | `assets/src/audio/sfx/sfx_boss_summon.mp3` | sfx | 2.0 s | dark ritual horn and a rumble as undead claw out of the ground, dirt bursting and bones clacking, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossSummon` |
| `sfx_boss_enrage` | `assets/src/audio/sfx/sfx_boss_enrage.mp3` | sfx | 2.0 s | boss roaring in fury, distorted deep bellow with a rattling metal growl, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossEnraged` |
| `sfx_boss_pool` | `assets/src/audio/sfx/sfx_boss_pool.mp3` | sfx | 1.5 s | thick toxic mud pool bubbling up, wet gurgling splash and slow dripping, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossPool` (poça da Matriarca) |
| `sfx_boss_scream` | `assets/src/audio/sfx/sfx_boss_scream.mp3` | sfx | 1.5 s | monstrous shriek, a shockwave of piercing scream with a deep low distortion, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossScream` |
| `sfx_boss_shockwave` | `assets/src/audio/sfx/sfx_boss_shockwave.mp3` | sfx | 1.5 s | giant war hammer slamming the ground, huge deep impact and a rolling shockwave boom, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossShockwave` (martelo, pouso do salto) |
| `sfx_boss_stealth` | `assets/src/audio/sfx/sfx_boss_stealth.mp3` | sfx | 1.0 s | predator fading into invisibility, soft electric crackle and a low inhale, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossStealth` com a = 1 (some) |
| `sfx_boss_reveal` | `assets/src/audio/sfx/sfx_boss_reveal.mp3` | sfx | 1.0 s | predator decloaking, sharp static burst and a menacing snarl, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossStealth` com a = 0 (aparece) |
| `sfx_boss_bomb` | `assets/src/audio/sfx/sfx_boss_bomb.mp3` | sfx | 1.2 s | flying insectoid dropping a bomb, falling whistle ending in a wet acid splat before the blast, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossBomb` |
| `sfx_egg_laid` | `assets/src/audio/sfx/sfx_egg_laid.mp3` | sfx | 0.8 s | loud wet squelch and a heavy leathery thump, a huge organic egg dropped on the floor, punchy, heavy dry tone, close, no music, game sound effect | — | evento `BossEggLaid` |
| `sfx_egg_broken` | `assets/src/audio/sfx/sfx_egg_broken.mp3` | sfx | 0.8 s | leathery alien egg smashed, wet crack and a gooey splash, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossEggBroken` |
| `sfx_egg_hatched` | `assets/src/audio/sfx/sfx_egg_hatched.mp3` | sfx | 1.2 s | egg bursting open as a creature emerges, wet tearing and a high screech, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossEggHatched` |
| `sfx_boss_swamp_matriarch_entry` | `assets/src/audio/sfx/sfx_boss_swamp_matriarch_entry.mp3` | sfx | 3.0 s | huge swamp hag rising from black water, thick bubbling, wet gurgling roar and slow heavy splashes, heavy dry tone, medium distance, no music, game sound effect | — | `BossIntro` da Matriarca (round 20) |
| `sfx_boss_forgemaster_entry` | `assets/src/audio/sfx/sfx_boss_forgemaster_entry.mp3` | sfx | 3.0 s | colossal armored forgemaster stomping in, giant hammer dragging on iron, furnace roar and clanging chains, heavy dry tone, medium distance, no music, game sound effect | — | `BossIntro` do Forjador (round 30) |
| `sfx_enemy_drowned_death` | `assets/src/audio/sfx/sfx_enemy_drowned_death.mp3` | sfx | 1.0 s | drowned corpse collapsing into water, wet gurgle and a heavy splash, heavy dry tone, medium distance, no music, game sound effect | — | `Died` do Afogado |
| `sfx_enemy_leech_death` | `assets/src/audio/sfx/sfx_enemy_leech_death.mp3` | sfx | 1.0 s | giant blood leech bursting, wet squelch and a short hiss, heavy dry tone, medium distance, no music, game sound effect | — | `Died` da Sanguessuga |
| `sfx_enemy_forged_death` | `assets/src/audio/sfx/sfx_enemy_forged_death.mp3` | sfx | 1.0 s | forged iron golem breaking apart, metal clanging and glowing slag hissing, heavy dry tone, medium distance, no music, game sound effect | — | `Died` do Forjado |
| `sfx_enemy_watcher_death` | `assets/src/audio/sfx/sfx_enemy_watcher_death.mp3` | sfx | 1.0 s | mechanical watcher turret exploding, sparks, metal crunch and a short electric whine, heavy dry tone, medium distance, no music, game sound effect | — | `Died` do Vigia |
| `sfx_enemy_hunter_death` | `assets/src/audio/sfx/sfx_enemy_hunter_death.mp3` | sfx | 1.0 s | fast alien hunter dying with a sharp screech and a thud of its body hitting the ground, heavy dry tone, medium distance, no music, game sound effect | — | `Died` do Caçador |
| `sfx_enemy_breeder_death` | `assets/src/audio/sfx/sfx_enemy_breeder_death.mp3` | sfx | 1.0 s | bloated breeder bursting, heavy wet pop with sloshing fluid and a low groan, heavy dry tone, medium distance, no music, game sound effect | — | `Died` do Reprodutor |
| `voice_gravedigger_entry` | `assets/src/audio/voice/voice_gravedigger_entry.mp3` | voice | 1.7 s | Another soul for my graves. | Brian (grave) | `BossIntro` do Coveiro |
| `voice_gravedigger_phase` | `assets/src/audio/voice/voice_gravedigger_phase.mp3` | voice | 1.7 s | Rise! Rise from the dirt! | Brian (grave) | `BossPhase` do Coveiro (invocação a 50% de HP) |
| `voice_gravedigger_death` | `assets/src/audio/voice/voice_gravedigger_death.mp3` | voice | 2.0 s | Back... into the earth... | Brian (grave) | `BossDied` do Coveiro |
| `voice_swamp_matriarch_entry` | `assets/src/audio/voice/voice_swamp_matriarch_entry.mp3` | voice | 3.4 s | Come closer, little one. The swamp is hungry. | Callum (rouca) | `BossIntro` da Matriarca |
| `voice_swamp_matriarch_phase` | `assets/src/audio/voice/voice_swamp_matriarch_phase.mp3` | voice | 2.1 s | Drown them all, my leeches. | Callum (rouca) | `BossPhase` da Matriarca |
| `voice_swamp_matriarch_death` | `assets/src/audio/voice/voice_swamp_matriarch_death.mp3` | voice | 2.2 s | The water... takes me back... | Callum (rouca) | `BossDied` da Matriarca |
| `voice_forgemaster_entry` | `assets/src/audio/voice/voice_forgemaster_entry.mp3` | voice | 1.8 s | I will forge you into scrap. | Brian (grave) | `BossIntro` do Forjador |
| `voice_forgemaster_phase` | `assets/src/audio/voice/voice_forgemaster_phase.mp3` | voice | 1.6 s | My armor is unbreakable! | Brian (grave) | `BossPhase` do Forjador (armadura 30) |
| `voice_forgemaster_death` | `assets/src/audio/voice/voice_forgemaster_death.mp3` | voice | 1.9 s | The fire... goes out. | Brian (grave) | `BossDied` do Forjador |
| `voice_merchant_arrive_1` | `assets/src/audio/voice/voice_merchant_arrive_1.mp3` | voice | 2.9 s | Fresh bones, fresh coin. Come, come. | Bill (velho, nítido) | evento `MerchantArrived` (o Mercador chega ao fim do round) |
| `voice_merchant_arrive_2` | `assets/src/audio/voice/voice_merchant_arrive_2.mp3` | voice | 2.9 s | Still breathing? Good. I sell to the living. | Bill (velho, nítido) | evento `MerchantArrived` (o Mercador chega ao fim do round) |
| `voice_merchant_arrive_3` | `assets/src/audio/voice/voice_merchant_arrive_3.mp3` | voice | 3.0 s | The dead pay badly. Let us do business. | Bill (velho, nítido) | evento `MerchantArrived` (o Mercador chega ao fim do round) |
| `voice_merchant_wait_1` | `assets/src/audio/voice/voice_merchant_wait_1.mp3` | voice | 2.3 s | I have all night. You may not. | Bill (velho, nítido) | Mercador esperando: um comentário a cada 12 s (estado `MerchantWait`) |
| `voice_merchant_wait_2` | `assets/src/audio/voice/voice_merchant_wait_2.mp3` | voice | 2.1 s | My wares do not sell themselves. | Bill (velho, nítido) | Mercador esperando: um comentário a cada 12 s (estado `MerchantWait`) |
| `voice_merchant_wait_3` | `assets/src/audio/voice/voice_merchant_wait_3.mp3` | voice | 3.0 s | Take your time. Death certainly does. | Bill (velho, nítido) | Mercador esperando: um comentário a cada 12 s (estado `MerchantWait`) |
| `voice_merchant_wait_4` | `assets/src/audio/voice/voice_merchant_wait_4.mp3` | voice | 3.1 s | Every moment you linger, the grave grows hungrier. | Bill (velho, nítido) | Mercador esperando: um comentário a cada 12 s (estado `MerchantWait`) |
| `voice_merchant_come_1` | `assets/src/audio/voice/voice_merchant_come_1.mp3` | voice | 3.2 s | Over here, Executioner. Mind the bones. | Bill (velho, nítido) | Mercador esperando: chamada para o herói se aproximar (estado `MerchantWait`) |
| `voice_merchant_come_2` | `assets/src/audio/voice/voice_merchant_come_2.mp3` | voice | 2.7 s | Come closer. I do not bite. Much. | Bill (velho, nítido) | Mercador esperando: chamada para o herói se aproximar (estado `MerchantWait`) |
| `voice_merchant_come_3` | `assets/src/audio/voice/voice_merchant_come_3.mp3` | voice | 3.3 s | You are walking away from the best prices in the grave. | Bill (velho, nítido) | Mercador esperando: chamada para o herói se aproximar (estado `MerchantWait`) |
| `voice_merchant_buy_1` | `assets/src/audio/voice/voice_merchant_buy_1.mp3` | voice | 3.1 s | A fine choice. May it outlive you. | Bill (velho, nítido) | compra feita na loja |
| `voice_merchant_buy_2` | `assets/src/audio/voice/voice_merchant_buy_2.mp3` | voice | 3.0 s | Sold. No refunds, even in death. | Bill (velho, nítido) | compra feita na loja |
| `voice_merchant_buy_3` | `assets/src/audio/voice/voice_merchant_buy_3.mp3` | voice | 2.3 s | Pleasure doing business with the doomed. | Bill (velho, nítido) | compra feita na loja |
| `voice_merchant_buy_4` | `assets/src/audio/voice/voice_merchant_buy_4.mp3` | voice | 3.2 s | Coin well spent. Or so I tell everyone. | Bill (velho, nítido) | compra feita na loja |
| `voice_merchant_nomoney_1` | `assets/src/audio/voice/voice_merchant_nomoney_1.mp3` | voice | 2.3 s | Your purse is as empty as a skull. | Bill (velho, nítido) | compra sem ouro suficiente |
| `voice_merchant_nomoney_2` | `assets/src/audio/voice/voice_merchant_nomoney_2.mp3` | voice | 2.2 s | I take coin, not promises. | Bill (velho, nítido) | compra sem ouro suficiente |
| `voice_merchant_nomoney_3` | `assets/src/audio/voice/voice_merchant_nomoney_3.mp3` | voice | 2.9 s | Come back when you are richer. Or deader. | Bill (velho, nítido) | compra sem ouro suficiente |
| `voice_merchant_farewell_1` | `assets/src/audio/voice/voice_merchant_farewell_1.mp3` | voice | 2.3 s | Go, then. Die gloriously. | Bill (velho, nítido) | fechamento da loja ("Próximo round") |
| `voice_merchant_farewell_2` | `assets/src/audio/voice/voice_merchant_farewell_2.mp3` | voice | 2.2 s | Mind the dark. It minds you. | Bill (velho, nítido) | fechamento da loja ("Próximo round") |
| `voice_merchant_farewell_3` | `assets/src/audio/voice/voice_merchant_farewell_3.mp3` | voice | 3.4 s | Until the next round, if you are still in one piece. | Bill (velho, nítido) | fechamento da loja ("Próximo round") |
| `sfx_merchant_arrive` | `assets/src/audio/sfx/sfx_merchant_arrive.mp3` | sfx | 1.8 s | rusty chains dragging across stone and a cracked bone bell ringing twice, a bone merchant arriving, dry eerie tone, medium distance, no music, game sound effect | — | evento `MerchantArrived` (o Mercador chega: correntes e sino de osso) |
| `sfx_consumable_drop` | `assets/src/audio/sfx/sfx_consumable_drop.mp3` | sfx | 0.6 s | small glass vial and a bone charm dropping onto stone, a short bright clink and a soft thud, heavy dry tone, medium distance, no music, game sound effect | — | evento `ConsumableDropped` (frasco ou ímã cai) |
| `sfx_elite_escape` | `assets/src/audio/sfx/sfx_elite_escape.mp3` | sfx | 1.5 s | powerful monster retreating, a low snarl fading into distant heavy footsteps and a closing cave echo, heavy dry tone, medium distance, no music, game sound effect | — | evento `EliteEscaped` (a elite fugiu no fim do round) |
| `sfx_enemy_shot` | `assets/src/audio/sfx/sfx_enemy_shot.mp3` | sfx | 0.5 s | small bone-tipped bolt spat from a rusted turret, a short dry hiss and a wet snap, heavy dry tone, medium distance, no music, game sound effect | — | evento `EnemyShotFired` (tiro do Vigia) |
| `sfx_enemy_charge` | `assets/src/audio/sfx/sfx_enemy_charge.mp3` | sfx | 0.8 s | fast predator winding up to charge, a rising guttural growl with claws scraping on stone, heavy dry tone, medium distance, no music, game sound effect | — | evento `EnemyTelegraph` (o Caçador prepara a investida) |
| `sfx_ui_reroll` | `assets/src/audio/sfx/sfx_ui_reroll.mp3` | sfx | 0.7 s | wooden bones rattling and tumbling in a leather cup, quick dry clatter, heavy dry tone, medium distance, no music, game sound effect | — | loja: rolar de novo (reroll) |
| `sfx_ui_lock` | `assets/src/audio/sfx/sfx_ui_lock.mp3` | sfx | 0.5 s | heavy iron padlock snapping shut, a sharp metal click, heavy dry tone, medium distance, no music, game sound effect | — | loja: travar ou destravar uma oferta |
| `sfx_boss_death` | `assets/src/audio/sfx/sfx_boss_death.mp3` | sfx | 3.0 s | colossal monster collapsing, a deep final roar breaking into a heavy crash and rolling rubble, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossDied`, junto da fala `voice_<chefe>_death` |
| `voice_gravedigger_enrage` | `assets/src/audio/voice/voice_gravedigger_enrage.mp3` | voice | 2.0 s | The earth is hungry, and so am I! | Brian (grave) | fúria do Coveiro (`BossEnraged`; ainda sem gatilho no `soundFor`) |
| `voice_swamp_matriarch_enrage` | `assets/src/audio/voice/voice_swamp_matriarch_enrage.mp3` | voice | 2.5 s | You dare make me rage, little one? | Callum (rouca) | fúria do Matriarca (`BossEnraged`; ainda sem gatilho no `soundFor`) |
| `voice_forgemaster_enrage` | `assets/src/audio/voice/voice_forgemaster_enrage.mp3` | voice | 1.7 s | Burn! Burn in my forge! | Brian (grave) | fúria do Forjador (`BossEnraged`; ainda sem gatilho no `soundFor`) |
| `voice_alpha_hunter_enrage` | `assets/src/audio/voice/voice_alpha_hunter_enrage.mp3` | voice | 1.9 s | Now the hunt turns savage. | Callum (rouca) | fúria do Caçador Alfa (`BossEnraged`; ainda sem gatilho no `soundFor`) |
| `voice_nest_queen_enrage` | `assets/src/audio/voice/voice_nest_queen_enrage.mp3` | voice | 1.6 s | Enough! Tear them apart! | Brian (grave) | fúria do Rainha (`BossEnraged`; ainda sem gatilho no `soundFor`) |
| `sfx_step_stone` | `assets/src/audio/sfx/sfx_step_stone.mp3` | sfx | 0.5 s | single heavy armored boot step on cold stone, a dull metal clank and a dry scuff, close, no music, game sound effect | — | passos do herói em pedra (Cemitério e Forja), a cada 1,7 u andada |
| `sfx_step_mud` | `assets/src/audio/sfx/sfx_step_mud.mp3` | sfx | 0.5 s | single heavy armored boot step in thick wet mud, a slow squelch and a muffled metal clank, close, no music, game sound effect | — | passos do herói na lama (Pântano e Ninho), a cada 1,7 u andada |
| `sfx_smg_loop` | `assets/src/audio/sfx/sfx_smg_loop.mp3` | sfx | 2.2 s | submachine gun firing a steady burst, rapid dry gunshots with brass casings, seamless loop, close, no music, game sound effect | — | loop da submetralhadora (ainda sem gatilho: o motor não toca loops de efeito) |
| `sfx_mg_loop` | `assets/src/audio/sfx/sfx_mg_loop.mp3` | sfx | 2.2 s | heavy machine gun firing continuously, deep rapid thudding shots with a metal rattle, seamless loop, close, no music, game sound effect | — | loop da metralhadora pesada (ainda sem gatilho) |
| `sfx_ambience_cemetery` | `assets/src/audio/sfx/sfx_ambience_cemetery.mp3` | sfx | 10.0 s | cold wind over a graveyard, faint creaking iron fences and distant tolling, low eerie ambience, seamless loop, no music, game sound effect | — | ambiente do Cemitério Afundado (ainda sem gatilho) |
| `sfx_ambience_swamp` | `assets/src/audio/sfx/sfx_ambience_swamp.mp3` | sfx | 10.0 s | bubbling black swamp, slow dripping water, distant insects and low gurgling, damp ambience, seamless loop, no music, game sound effect | — | ambiente do Pântano de Ossos (ainda sem gatilho) |
| `sfx_ambience_forge` | `assets/src/audio/sfx/sfx_ambience_forge.mp3` | sfx | 10.0 s | roaring furnace drone, distant anvil clangs and hissing steam, hot industrial ambience, seamless loop, no music, game sound effect | — | ambiente da Forja Infernal (ainda sem gatilho) |
| `sfx_ambience_nest` | `assets/src/audio/sfx/sfx_ambience_nest.mp3` | sfx | 10.0 s | wet organic hive ambience, slow pulsing hum, faint clicking and dripping slime, seamless loop, no music, game sound effect | — | ambiente do Ninho Biomecânico (ainda sem gatilho) |
| `mus_boss_gravedigger` | `assets/src/audio/music/mus_boss_gravedigger.mp3` | music | 130.1 s | instrumental only, no vocals, no choir, no singing, no humming, no voices, slow crushing heavy metal boss music, 100 BPM, huge detuned low guitars, tolling church bell, slow pounding war drums, grave digging rhythm of shovel and iron, graveyard horror mood, grimdark, no cheerful synthesizers, seamless loop | — | round de chefe 10 (Coveiro) |

Vozes (conta ElevenLabs, plano Creator): **Callum** (`N2lVS1w4EtoT3dr4eOWO`, rouca e inquietante) fala pela Matriarca do Pântano e pelo Caçador Alfa; **Brian** (`nPczCjzI2devNBz1zQrb`, grave e ressonante) fala pelo Coveiro, pelo Forjador e pela Rainha do Ninho. A escolha saiu da lista de vozes da conta, entre as que soavam graves e sombrias. Trocar a voz exige alterar o `voiceId` no `prompts.json` e regenerar com `--force`.

O **Mercador de Ossos** usa **Bill** (`pqHfZKP75CvOlQylNhV4`, voz velha e nítida, humor seco): 20 falas em inglês (GDD §22.3, D24) em seis momentos, com `voice_merchant_<momento>_<n>` e legenda `voice.merchant.<momento>_<n>` nos dois locales: `arrive` (3), `wait` (4), `come` (3), `buy` (4), `nomoney` (3) e `farewell` (3). As linhas de cada momento se revezam, sem repetir a mesma duas vezes seguidas (`apps/web/src/audio/merchantVoice.ts`).

Os temas `mus_menu`, `mus_round` e `mus_boss` têm 60 s; biomas e chefes têm 150 s. A API de música (`POST /v1/music`, `music_length_ms` de 3.000 a 600.000, modelo `music_v1`) não tem parâmetro de loop; o "seamless loop" é só pedido no prompt, então o ponto de emenda precisa ser conferido de ouvido antes de o motor de áudio usar a faixa em `loop`.

## 4. Arquivo (versões anteriores)

As nove músicas da primeira leva (e o SFX de level-up) tinham coral (os prompts pediam "choir"), e o PO pediu só instrumental e ambiência. Elas foram arquivadas, sem apagar, em `assets/audio-archive/music/<id>_v1_vocal.mp3` com o `<id>_v1_vocal.meta.json` ao lado. A pasta fica fora de `assets/src/audio/`, que é a única que o `assets:build` copia para o jogo.

| Arquivado | Motivo |
| --- | --- |
| `mus_menu_v1_vocal` | prompt pedia "deep low choir chanting" |
| `mus_round_v1_vocal` | prompt pedia coral e vozes nas ondas |
| `mus_boss_v1_vocal` | prompt pedia "massive wordless choir" |
| `mus_biome_cemetery_v1_vocal`, `mus_biome_swamp_v1_vocal`, `mus_biome_forge_v1_vocal`, `mus_biome_nest_v1_vocal` | prompts pediam "ominous low choir" |
| `mus_boss_alpha_hunter_v1_vocal`, `mus_boss_nest_queen_v1_vocal` | a Rainha pedia "shrieking choir swells"; o Caçador foi arquivado na dúvida |
| `sfx_player_levelup_v1_choir` (em `assets/audio-archive/sfx/`) | prompt pedia "short dark choir swell"; o PO quer o jogo sem voz cantada, e a versão nova é só sino e ressonância |

Para voltar a uma versão antiga, copie o par de arquivos de volta para `assets/src/audio/music/` com o id original e ajuste o `prompts.json` (o hash do `meta.json` decide se o `audio-generate` a considera atual).

## 5. Créditos

- Primeira leva (39 arquivos: 24 SFX, 9 músicas, 6 falas): o script estimou 21.167 créditos; o saldo da conta foi de 31.917 para 45.105 de 124.333, ou seja, **13.188 créditos** reais (inclui a repetição de uma faixa que falhou com HTTP 429).
- Regeneração instrumental (9 faixas de música, versões novas de `mus_*`): saldo de 47.712 para 62.559, ou seja, **14.847 créditos** reais (a estimativa do script para as 9 faixas é 16.200).
- Segunda leva (39 arquivos: 30 SFX e 9 falas, com os ids que o motor de áudio pede): o script estimou 6.251 créditos; o saldo foi de 47.167 para 47.502, ou seja, **335 créditos** reais.
- Falas do Mercador (20 arquivos, 746 caracteres): o script estimou 746 créditos (1 por caractere) e o saldo da conta não se moveu na leitura de `/v1/user/subscription` (62.572 antes e depois; o contador de TTS pode ser lançado com atraso).
- SFX `sfx_merchant_arrive` (1 arquivo): 200 créditos estimados pelo script, gerado em separado.
- SFX da B-03-03 (7 arquivos): 1.400 créditos estimados pelo script (ver §8).
- Total medido: cerca de **28.350 créditos** para os 98 arquivos mais a regeneração das músicas (as 9 faixas vocais arquivadas contam nos 13.188 da primeira leva). A estimativa do script é conservadora, sobretudo na música. O saldo é de uma conta compartilhada, então o delta pode incluir outro uso entre as leituras.
- Plano: Creator (`plan: creator` em todos os `.meta.json`), com licença comercial.

## 6. Como regenerar

1. Coloque `ELEVENLABS_API_KEY` e `ELEVENLABS_PLAN=creator` no `.env` local (nunca commitado) ou no ambiente. O Bun carrega o `.env` do diretório atual.
2. Confira o que mudou: `bun run audio:generate --dry-run`. O script pula arquivos cujo `meta.json` tem o mesmo hash (prompt, modelo, duração, loop, influência e voz).
3. Gere: `bun run audio:generate --max-credits 30000`. Para um arquivo ou grupo, use `--only 'sfx_ui_*'`; para refazer mesmo sem mudança, `--force`.
4. Se aparecer `HTTP 429`, rode de novo: só o que falhou é gerado.
5. Depois de gerar, escute as faixas de música em loop e confira o `plan` dos `.meta.json`; arquivos com `plan: free` não entram no manifest de produção.
6. Atualize a tabela da seção 3 deste documento quando mudar prompt, voz ou duração.

## 7. Pendências

- O `assets:build` copia os mp3 para `public/assets/audio/<id>.mp3` e o motor de áudio (`apps/web/src/audio`) pede os ids pelo nome: `voice_<id do chefe>_<entry|phase|death>`, `sfx_boss_<id>_entry` e os `sfx_*` por evento (`eventSounds.ts`).
- O `enemyDeath` de `apps/web/src/main.tsx` só distingue `wail` e `husk`. Os ids `sfx_enemy_<id>_death` dos 8 tipos já existem, e o S2 precisa trocar o mapa por `sfx_enemy_${id}_death`.
- As falas de `entry` existem para os 5 chefes, mas o `soundFor` só mapeia `phase` e `death`; a de `entry` toca no `BossIntro` de `main.tsx`.
- O pós-processo (loudness −16/−14 LUFS, trim de silêncio, pitch dos chefes) não está implementado (SDD 08 §3).
- Faltam SFX de passos, armas extras e outros itens do GDD §22.1.

## 8. Cobertura e metas (B-03-03, 2026-10-31)

Levantamento contra as metas do ROADMAP (82 SFX, 10 músicas, 40 falas), com o que existia no levantamento (106 arquivos; a rodada 2, em §10, fechou as falas em 40 e os efeitos em 70):

| Tipo | Meta | Hoje | Proposta de meta para o jogo atual | Falta |
| --- | --- | --- | --- | --- |
| SFX | 82 | 62 | **70** | passos (2 superfícies), loops de SMG e metralhadora, 4 loops ambientes de bioma |
| Músicas | 10 | 9 | **12** | faixas próprias dos chefes 1 a 3 (hoje usam o `mus_boss` genérico) |
| Falas | 40 | 35 | **40** | 1 fala de fúria (`enrage`) por chefe, 5 no total |

- **Por que 70 e não 82**: a lista de §22.1 do GDD conta 30 sons de chefe (6 por chefe) e 16 de inimigos por tipo. O jogo cobre cada chefe com entrada, telegrafia, padrão, fúria e morte pelos sons genéricos de evento (`sfx_boss_*`), então 6 por chefe seria redundante. Os 8 que faltam para 70 são sons de mundo, não de evento.
- **Por que 12 músicas**: o GDD §22.2 pede uma faixa por chefe; os chefes 4 e 5 têm, os chefes 1 a 3 não.
- **Custo estimado do que falta** (referência do consumo real medido nas músicas: cerca de 2.000 créditos por faixa de 150 s; SFX em dezenas de créditos; fala em 1 crédito por caractere): 3 músicas de chefe cerca de 6.000; 8 SFX cerca de 200 a 1.600; 5 falas cerca de 200. Total até cerca de 8.000 créditos, acima do teto de 5.000 desta rodada, então ficaram para depois.
- **Gerado nesta rodada** (só o que cobre eventos do jogo hoje sem som): 7 SFX (`sfx_consumable_drop`, `sfx_elite_escape`, `sfx_enemy_shot`, `sfx_enemy_charge`, `sfx_ui_reroll`, `sfx_ui_lock`, `sfx_boss_death`), estimados em 1.400 créditos pelo script. O saldo lido na conta (62.919 antes e depois) não registra SFX, então o custo real fica por estimativa.
- **Ligados ao jogo**: `sfx_ui_buy` e `sfx_ui_no_gold` já existiam sem uso e passaram a tocar na compra (loja e Ossuário) e no reroll sem ouro. `sfx_enemy_spawn_01` e `sfx_boss_gravedigger_charge` continuam sem uso (spawn é barulhento demais; a telegrafia do Coveiro usa o `sfx_boss_telegraph` genérico).
- **Todo evento do jogo agora tem som**, exceto os que não devem ter: `BossPattern`, `OriginShifted` e `PoolExhausted`.

## 9. Mix (revisão de 2026-10-31)

- **Sidechain da música em falas de voz**: quando uma fala `voice_*` (chefes e Mercador) começa, a música cai para 0,5 (−6 dB) em 0,1 s, fica assim pelo tamanho da fala e volta a 1 em 0,4 s. Um golpe no herói (−3 dB por 200 ms) não levanta a música enquanto uma fala a segura. Antes, só o golpe no herói baixava a música.
- **Polifonia por grupo** (`GROUP_VOICES` em `audioEngine.ts`, o grupo vem do prefixo do id): `voice_*` até 2 ao mesmo tempo, `sfx_ui_*` até 4 e os demais efeitos até 24 (SDD 14). Vale além do limite por som (`maxVoices`) e do orçamento de 12 sons novos por frame.
- **Buses**: continuam `master`, `music` e `sfx`; o GDD fala de `voice` e `ui`, mas dividir o bus exigiria rotear cada fonte e ainda não há tela de volume para eles. A polifonia por grupo resolve o que importava (fala não se empilha, UI não cobre o combate).
- **Não medido**: o loudness real (−16 / −14 LUFS) das faixas, que depende do pós-processo de `ffmpeg` ainda não implementado (SDD 08 §3), e o ponto de emenda dos loops.

## 10. Loudness e rodada 2 da B-03-03 (2026-10-31)

- **Gerado na rodada 2** (saldo conferido antes: 63.005 de 124.333; estimativa do script para os 13 arquivos: 1.740 créditos, contra o teto de 5.000): as 5 falas de fúria `voice_<chefe>_enrage` e 8 efeitos: `sfx_step_stone`, `sfx_step_mud`, `sfx_smg_loop`, `sfx_mg_loop` e `sfx_ambience_cemetery|swamp|forge|nest` (os loops com `loop: true`, de 2 s e de 10 s). Além disso, `sfx_pistol_shot_01` e `sfx_egg_laid` foram gerados de novo (quase silenciosos: −49 e −60 LUFS), este com um prompt mais forte; contam como 2 gerações extras (cerca de 400 créditos estimados). O contador de caracteres da conta não mostra SFX, então o custo real continua por estimativa.
- **Ligado ao jogo**: os passos (`apps/web/src/audio/footsteps.ts`) tocam a cada 1,7 u andada no round, com `sfx_step_mud` no pântano e no ninho e `sfx_step_stone` nos outros biomas. Os loops de SMG e metralhadora e os 4 ambientes estão gerados, mas o motor de áudio ainda não toca efeitos em loop (só música): ficam sem uso até o S2 acrescentar `playLoop`/`stop`. A fala `voice_<chefe>_enrage` também ainda não tem gatilho no `soundFor`.
- **Normalização de loudness**: `ffmpeg` 9.0.2 está instalado; o script `bun tools/audio-generate/normalize.ts` relata e `--apply` corrige (SDD 08 §3). Antes, 105 dos 120 arquivos estavam a mais de 1 LU do alvo (de −59,9 a −2,2 LUFS: efeitos de chefe berrando em −2 LUFS e outros quase mudos). Depois de duas passadas, 4 ficam fora: `sfx_ambience_forge` (−25,1 contra −24, o loop oscila ao recodificar), `sfx_prop_break` (−23,9) e `voice_merchant_buy_2` (−18,3), presos pelo pico, e `voice_merchant_arrive_2` (−17,3). Os que dependem do pico são transientes curtos que não chegam ao alvo sem clipar.
- **Reencodificação**: os 105 arquivos foram recodificados em mp3 128 kbps (uma ou duas vezes); a perda é pequena, mas os arquivos originais do ElevenLabs só voltam regenerando com `--force`. O hash do `meta.json` não muda com a normalização.
- **Música**: as 9 faixas foram normalizadas a −14 LUFS junto com o resto.

## 11. Rodada 3 da B-03-03 e fechamento do loudness (2026-10-31)

- **Loudness em todos os meta**: `normalize.ts --apply` agora grava `loudness { target, before, after }` também nos arquivos que já estavam a menos de 1 LU do alvo (os 14 que faltavam: `mus_menu`, `sfx_boss_alpha_hunter_entry`, `sfx_boss_gravedigger_entry`, `sfx_boss_swamp_matriarch_entry`, `sfx_boss_sweep`, `sfx_chest_open`, `sfx_enemy_hit_01`, `sfx_enemy_leech_death`, `sfx_enemy_spawn_01`, `sfx_enemy_watcher_death`, `sfx_player_dodge`, `sfx_ui_buy`, `sfx_ui_confirm`, `sfx_ui_lock`), sem reescrever o mp3. O `tools/guards` falha se algum meta ficar sem `loudness`.
- **Eventos sem som**: nenhum além dos três propositalmente mudos (`BossPattern`, `OriginShifted`, `PoolExhausted`). A meta de 70 efeitos segue atingida e não foi preciso gerar mais nenhum.
- **Primeira música de chefe**: `mus_boss_gravedigger` (150 s, instrumental, 100 BPM), estimada em 2.250 créditos pelo script, contra o teto de 5.000 da rodada (saldo conferido antes: 63.588 de 124.333). O contador da conta não registrou o consumo na leitura imediata. Faltam as faixas da Matriarca e do Forjador (`mus_boss_swamp_matriarch` e `mus_boss_forgemaster`) para as 12 músicas.
- **Ligação no jogo**: o motor passa a tocar `mus_boss_<id do chefe>` e cai em `mus_boss` quando a faixa não existe. As faixas do Caçador Alfa e da Rainha, geradas antes, nunca estavam ligadas.
- `bun run audio:generate --dry-run` lista 0 arquivos a gerar (120 em dia).

## 12. Os 12 efeitos que fecham os 82 (2026-11-01)

Gerados no plano `creator` (estimativa do script: 2.400 créditos, 12 × 200; o contador da conta não registra SFX). Loudness medido com `normalize.ts --apply --only <id>` e gravado em cada `meta.json`. Nenhum `plan` é `free`.

| Id | Por que existe |
| --- | --- |
| `sfx_pickup_fragment_02`, `sfx_pickup_fragment_03` | variações de coleta da lista mínima (GDD §22.1) |
| `sfx_weapon_upgrade` | upgrade de tier da arma |
| `sfx_bazooka_shot` | disparo da bazuca (a explosão já era `sfx_explosion_01`) |
| `sfx_elite_aura` | loop da aura de elite |
| `sfx_ui_cancel`, `sfx_ui_card`, `sfx_ui_souls` | cancelar, carta escolhida e almas contando |
| `sfx_wind` | vento, à parte dos loops de bioma |
| `sfx_boss_gravedigger_slam`, `sfx_boss_swamp_spit`, `sfx_boss_forgemaster_hammer` | um ataque próprio dos chefes que só tinham a entrada, ou só a investida |

O total de créditos fica em `docs/audio/credits.md`. `bun run audio:generate --dry-run` lista 0 pendentes (132 em dia).
