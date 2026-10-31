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
| Voz | `voice_<chefe>_*` | falas curtas de entrada, mudança de fase e morte dos 5 chefes | 1,6 a 2,6 s |

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
| `sfx_egg_laid` | `assets/src/audio/sfx/sfx_egg_laid.mp3` | sfx | 0.8 s | organic egg being laid on the floor, wet squelch and a soft leathery thump, heavy dry tone, medium distance, no music, game sound effect | — | evento `BossEggLaid` |
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

Vozes (conta ElevenLabs, plano Creator): **Callum** (`N2lVS1w4EtoT3dr4eOWO`, rouca e inquietante) fala pela Matriarca do Pântano e pelo Caçador Alfa; **Brian** (`nPczCjzI2devNBz1zQrb`, grave e ressonante) fala pelo Coveiro, pelo Forjador e pela Rainha do Ninho. A escolha saiu da lista de vozes da conta, entre as que soavam graves e sombrias. Trocar a voz exige alterar o `voiceId` no `prompts.json` e regenerar com `--force`.

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
- Total medido: cerca de **28.350 créditos** para os 78 arquivos mais a regeneração das músicas (as 9 faixas vocais arquivadas contam nos 13.188 da primeira leva). A estimativa do script é conservadora, sobretudo na música. O saldo é de uma conta compartilhada, então o delta pode incluir outro uso entre as leituras.
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
- Faltam SFX de passos, dash, armas extras, mortes por tipo e demais itens do GDD §22.1, e as falas do Mercador de Ossos (§22.3).
