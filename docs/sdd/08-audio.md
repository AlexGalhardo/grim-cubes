# SDD 08 — Áudio

Decisões: D24 (voz), D25 (ElevenLabs para SFX e música), Babylon Audio Engine v2 (ADR-0010).

## 1. Engine

As seções 1 e 2 são provisórias até P-06-04: ainda não existe motor de áudio no jogo (nenhum `AudioEngine`, bus ou `eventSounds.ts`), e o jogo roda mudo. Hoje só a geração offline (§3) está implementada.

- `CreateAudioEngineAsync({ resumeOnInteraction: true, disableDefaultUI: true })` de `@babylonjs/core/AudioV2/webAudio/webAudioEngine` no bootstrap; `await audioEngine.unlockAsync()` no primeiro gesto (botão "Começar" da tela de título). Até o unlock, nenhum som é tocado (fila descartada).
- Buses: `master` (main bus), `sfx`, `music`, `voice`, `ui` via `CreateAudioBusAsync`; volumes vêm de `Options.audio` (0–1) e são aplicados em `bus.volume`.
- Sons de combate: `CreateSoundBufferAsync` por arquivo no load do bioma/chefe; instâncias via `CreateSoundAsync(name, buffer, { maxInstances })` (hits 8, mortes 6, pickups 4, UI 2).
- Música: `CreateStreamingSoundAsync` (HTMLMediaElement), loop; crossfade de 2 s implementado com dois streams e rampas de volume.
- Spatial: desligado na 1.0 (câmera fixa; pan estéreo simples calculado pela posição x relativa à câmera: `sound.stereo.pan = clamp(dx / 14, −0,7, 0,7)` se a API permitir; senão mono). ADR-0010 registra.
- Formatos: `.mp3` (44,1 kHz, 128 kbps SFX / 160 kbps música) como principal; `.wav` não é distribuído (tamanho). Array de URLs não é necessário com mp3 universal.
- Android WebView: unlock no primeiro toque funciona igual; testar `setMediaPlaybackRequiresUserGesture` (default true, aceitável porque há gesto).

## 2. Eventos → sons

`render/audio/eventSounds.ts` mapeia eventos do ring buffer para sons com regras de throttle (mesmo som no máximo a cada 40 ms; máximo 12 sons novos por frame; prioridade: herói > chefe > elite > UI > inimigos). Variações: `sfx_sword_hit_01..03` sorteadas; pitch ±5% aleatório por instância (`playbackRate`).

Sidechain simples: ao tocar `sfx_player_hit`, `music.volume` cai 3 dB por 200 ms (rampa).

## 3. Geração com ElevenLabs (`tools/audio-generate`)

- Entrada: `assets/src/audio/prompts.json` com uma entrada por arquivo: `{ "file": "sfx_sword_hit_01", "kind": "sfx" | "music" | "voice", "prompt": "…", "durationSeconds": 0.6, "loop": false, "promptInfluence": 0.5, "voiceId": "…", "model": "eleven_text_to_sound_v2" }`. Hoje tem 37 entradas: 24 SFX (`eleven_text_to_sound_v2`), 7 músicas (`music_v1`, 150 s: menu, 4 biomas e os chefes 4 e 5) e 6 falas dos chefes 4 e 5 (`eleven_multilingual_v2`, `voiceId` ainda `PENDING_PO_VOICE_ID` até o PO escolher a voz e aprovar o modelo). `parsePrompts` valida `file` único (`^[a-z][a-z0-9_]*$`), `kind`, `prompt`, `model`, `voiceId` obrigatório em voz e as faixas da API (SFX 0,5–30 s; música 3–600 s).
- Execução: `bun run audio:generate [--dry-run] [--only sfx_sword_*] [--force] [--max-credits N] [--allow-free] [--out dir]`. Lê `ELEVENLABS_API_KEY` e `ELEVENLABS_PLAN` do ambiente (o Bun carrega `.env`, nunca commitado; `.env.example` só com os nomes). Pula arquivos já gerados cujo `meta.json` tem o mesmo hash (prompt, modelo, duração, loop, influência, voz), salvo `--force`. O log mostra só "api key: set/missing"; a chave vai apenas no header `xi-api-key`.
- Códigos de saída: 0 ok; 1 falha de geração, chave ausente ou estimativa acima de `--max-credits` (padrão 20.000, conferido antes de qualquer chamada; o conjunto atual estima 20.717, então uma geração completa exige `--max-credits` aprovado pelo PO); 2 plano recusado (`free` sem `--allow-free`, ou plano ausente fora do `--dry-run`). O `--dry-run` aceita plano ausente e só lista.
- Créditos: estimativa conservadora (SFX 200 por geração, música 900 por minuto, voz 1 por caractere). As tarifas oficiais de SFX e música não são publicadas por segundo; revisar com o saldo real.
- Chamadas via `fetch` direto nos endpoints `/v1/sound-generation` (`text`, `duration_seconds`, `prompt_influence`, `loop`, `model_id`), `/v1/text-to-speech/{voiceId}` (`text`, `model_id`) e `/v1/music` (`prompt`, `music_length_ms`, `model_id`), sem SDK (ADR-0010). Retry exponencial (3 tentativas; erros 4xx exceto 429 não repetem) e limite de concorrência 2.
- Pós-processo (ffmpeg, se instalado; senão aviso): normalização −16 LUFS (SFX) / −14 LUFS (música), trim de silêncio, conversão para mp3 nos bitrates acima; pitch shift para chefes (−2 a −4 semitons) conforme Art Bible §12. Provisório até A-05-02: ainda não implementado.
- Saída: `assets/src/audio/<kind>/<file>.mp3` + `<file>.meta.json` `{ prompt, model, durationSeconds, generatedAt, plan, promptInfluence, voiceId, hash }`. Ambos versionados.
- Licença: o script recusa rodar se `ELEVENLABS_PLAN` em `.env` for `free` e `--allow-free` não for passado; `meta.plan` registra o plano. Arquivos com `plan: free` não entram no manifest de produção (asserção no `assets:build`, provisória até P-06-04/A-05-02: o `assets-build` ainda não tem etapa de áudio). Nenhum áudio foi gerado ainda: falta o plano pago (E-05-04).

## 4. Lista de assets

GDD §22.1–§22.3. Total estimado da 1.0: 82 SFX, 10 faixas de música (menu + 4 biomas + 5 chefes), ~40 falas. Custo estimado em créditos: SFX 82 × 200 ≈ 16.400; música 10 × ~2,5 min × 900 ≈ 22.500; voz ~40 × ~150 ≈ 6.000. Total ≈ 45.000 créditos → 1 mês de Creator (121.000) cobre com folga, incluindo regenerações.

## 5. Testes

- Unit: mapeamento evento → som; throttle; prioridade; sidechain rampa (provisório até P-06-04).
- Integration (Playwright, headed opcional): unlock após clique; música troca ao mudar bioma; volumes das opções aplicam (provisório até P-06-04).
- Tooling (existe): `audio:generate` com `fetch` simulado cobre dry-run sem chamadas e sem chave no log, recusa de plano free (exit 2), chave ausente, limite de créditos, skip por hash, `--only`, retry e sem retry em 4xx, e `meta.json` com `plan`.
