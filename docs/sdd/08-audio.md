# SDD 08 — Áudio

Decisões: D24 (voz), D25 (ElevenLabs para SFX e música), Babylon Audio Engine v2 (ADR-0010).

## 1. Engine

Implementado em P-06-04 (`apps/web/src/audio/`), em Web Audio puro, sem dependência nova (substitui o plano de usar o Audio Engine v2 do Babylon: o motor fica testável com um `AudioContext` falso, e a música usa `HTMLAudioElement` em streaming).

- `createAudioEngine(deps)` cria `master`, `music` e `sfx` (mais um ganho de ducking entre `music` e `master`). Os volumes são os percentuais de `meta.settings.volume` (tela Options), aplicados em `bus.gain.value`; mudar na tela aplica na hora.
- Unlock: o contexto nasce suspenso; o primeiro `pointerdown`, `keydown` ou `touchstart` chama `unlock()`. Antes disso nenhum som toca (descartado) e a música pedida começa quando o contexto roda.
- Arquivos: `/assets/audio/<id>.mp3`, um por id de `assets/src/audio/prompts.json` (o Est copia `assets/src/audio/<kind>/<id>.mp3` para `public/assets/audio/`). Sem manifest: o motor tenta o arquivo; se ele não existir (ou a resposta não for áudio) toca silêncio e registra `log.warn` uma única vez por id.
- SFX: `decodeAudioData` por id, em cache, carregado no primeiro uso. Limite de vozes simultâneas por id (padrão 6; golpes 8, mortes 6, vozes de chefe 1), pitch aleatório ±5% (`playbackRate`), no máximo uma partida do mesmo id a cada 40 ms.
- Orçamento por frame: 12 sons novos; inimigos e UI param em 8, para sobrar espaço ao herói, chefes e elites (`beginFrame()` zera o contador).
- Música: ids `mus_menu` (menu, tela de dificuldade e resultados), `mus_boss` (apresentação e luta de chefe) e, nos rounds normais, a faixa do bioma sob o herói (`onMusic`, `mus_biome_*`) com `mus_round` de reserva. A troca faz crossfade de 1,5 s (rampas de ganho em duas faixas). Se o arquivo do primeiro candidato faltar, tenta o seguinte.
- Sidechain: ao tocar `PlayerHit` (sem ser dreno), a música cai 3 dB por 200 ms.
- Spatial desligado na 1.0 (câmera fixa); pan estéreo continua como possibilidade futura.
- Formatos: `.mp3` (44,1 kHz, 128 kbps SFX / 160 kbps música).

## 2. Eventos → sons

`apps/web/src/audio/eventSounds.ts` (`soundFor`) mapeia o tipo do evento a ids de som: golpe e tiro, acerto (variações `sfx_sword_hit_01/02`, crítico `sfx_enemy_hit_01`), morte por tipo de inimigo, esquiva, dano no herói, início e fim de round, level-up, explosão, elite, baú, telegrafia, invocação, fúria, grito, onda de choque, ações dos chefes 4 e 5, dash, prop quebrado e consumível. O render drena o buffer; o áudio escuta no caminho (um `EventBuffer` que repassa cada evento ao mapa e depois ao render).

Vozes dos chefes: `voice_<id do chefe>_entry | phase | death` (ex.: `voice_gravedigger_death`); a entrada também toca `sfx_boss_<id>_entry`. UI: `sfx_ui_hover` ao passar o mouse e `sfx_ui_confirm` ao clicar em botões.

Ids ainda sem arquivo (silêncio com aviso, ver prompts.json): `sfx_player_dodge`, `sfx_explosion_01`, `sfx_boss_telegraph`, `sfx_boss_*`, `sfx_egg_*`, `sfx_dash`, `sfx_prop_break`, `sfx_pickup_consumable`, `mus_round`, `mus_boss` e as vozes.

## 3. Geração com ElevenLabs (`tools/audio-generate`)

- Entrada: `assets/src/audio/prompts.json` com uma entrada por arquivo: `{ "file": "sfx_sword_hit_01", "kind": "sfx" | "music" | "voice", "prompt": "…", "durationSeconds": 0.6, "loop": false, "promptInfluence": 0.5, "voiceId": "…", "model": "eleven_text_to_sound_v2" }`. Hoje tem 22 entradas (20 SFX com `eleven_text_to_sound_v2` e 2 músicas com `music_v1`, 150 s). `parsePrompts` valida `file` único (`^[a-z][a-z0-9_]*$`), `kind`, `prompt`, `model`, `voiceId` obrigatório em voz e as faixas da API (SFX 0,5–30 s; música 3–600 s).
- Execução: `bun run audio:generate [--dry-run] [--only sfx_sword_*] [--force] [--max-credits N] [--allow-free] [--out dir]`. Lê `ELEVENLABS_API_KEY` e `ELEVENLABS_PLAN` do ambiente (o Bun carrega `.env`, nunca commitado; `.env.example` só com os nomes). Pula arquivos já gerados cujo `meta.json` tem o mesmo hash (prompt, modelo, duração, loop, influência, voz), salvo `--force`. O log mostra só "api key: set/missing"; a chave vai apenas no header `xi-api-key`.
- Códigos de saída: 0 ok; 1 falha de geração, chave ausente ou estimativa acima de `--max-credits` (padrão 20.000, conferido antes de qualquer chamada); 2 plano recusado (`free` sem `--allow-free`, ou plano ausente fora do `--dry-run`). O `--dry-run` aceita plano ausente e só lista.
- Créditos: estimativa conservadora (SFX 200 por geração, música 900 por minuto, voz 1 por caractere). As tarifas oficiais de SFX e música não são publicadas por segundo; revisar com o saldo real.
- Chamadas via `fetch` direto nos endpoints `/v1/sound-generation` (`text`, `duration_seconds`, `prompt_influence`, `loop`, `model_id`), `/v1/text-to-speech/{voiceId}` (`text`, `model_id`) e `/v1/music` (`prompt`, `music_length_ms`, `model_id`), sem SDK (ADR-0010). Retry exponencial (3 tentativas; erros 4xx exceto 429 não repetem) e limite de concorrência 2.
- Pós-processo (ffmpeg, se instalado; senão aviso): normalização −16 LUFS (SFX) / −14 LUFS (música), trim de silêncio, conversão para mp3 nos bitrates acima; pitch shift para chefes (−2 a −4 semitons) conforme Art Bible §12. Provisório até A-05-02: ainda não implementado.
- Saída: `assets/src/audio/<kind>/<file>.mp3` + `<file>.meta.json` `{ prompt, model, durationSeconds, generatedAt, plan, promptInfluence, voiceId, hash }`. Ambos versionados.
- Licença: o script recusa rodar se `ELEVENLABS_PLAN` em `.env` for `free` e `--allow-free` não for passado; `meta.plan` registra o plano. Arquivos com `plan: free` não entram no manifest de produção (asserção no `assets:build`, provisória até P-06-04/A-05-02: o `assets-build` ainda não tem etapa de áudio). Nenhum áudio foi gerado ainda: falta o plano pago (E-05-04).

## 4. Lista de assets

GDD §22.1–§22.3. Total estimado da 1.0: 82 SFX, 10 faixas de música (menu + 4 biomas + 5 chefes), ~40 falas. Custo estimado em créditos: SFX 82 × 200 ≈ 16.400; música 10 × ~2,5 min × 900 ≈ 22.500; voz ~40 × ~150 ≈ 6.000. Total ≈ 45.000 créditos → 1 mês de Creator (121.000) cobre com folga, incluindo regenerações.

## 5. Testes

- Unit (`apps/web/src/audio/audio.test.ts`, `AudioContext` falso): unlock, throttle de 40 ms, limite de vozes, orçamento por frame, arquivo ausente com um só aviso, volumes dos buses, crossfade de 1,5 s e candidato de reserva, mapa evento → som e música por estado.
- Integration (Playwright, headed opcional): unlock após clique; música troca ao mudar bioma; volumes das opções aplicam (provisório até P-06-04).
- Tooling (existe): `audio:generate` com `fetch` simulado cobre dry-run sem chamadas e sem chave no log, recusa de plano free (exit 2), chave ausente, limite de créditos, skip por hash, `--only`, retry e sem retry em 4xx, e `meta.json` com `plan`.
