# SDD 08 — Áudio

Decisões: D24 (voz), D25 (ElevenLabs para SFX e música), Babylon Audio Engine v2 (ADR-0010).

## 1. Engine

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

- Entrada: `assets/src/audio/prompts.json` com uma entrada por arquivo: `{ "file": "sfx_sword_hit_01", "kind": "sfx" | "music" | "voice", "prompt": "…", "durationSeconds": 0.6, "loop": false, "promptInfluence": 0.5, "voiceId": "…", "model": "eleven_text_to_sound_v2" }`.
- Execução: `bun run audio:generate [--only sfx_sword_*] [--force]`. Lê `ELEVENLABS_API_KEY` de `.env` (nunca commitado; `.env.example` só com o nome). Pula arquivos já gerados cujo `meta.json` tem o mesmo prompt (hash), salvo `--force`.
- Chamadas via `fetch` direto nos endpoints `/v1/sound-generation`, `/v1/text-to-speech/{voiceId}`, `/v1/music` (sem SDK; ADR-0010), com retry exponencial (3 tentativas) e limite de concorrência 2.
- Pós-processo (ffmpeg, se instalado; senão aviso): normalização −16 LUFS (SFX) / −14 LUFS (música), trim de silêncio, conversão para mp3 nos bitrates acima; pitch shift para chefes (−2 a −4 semitons) conforme Art Bible §12.
- Saída: `assets/src/audio/<kind>/<file>.mp3` + `<file>.meta.json` `{ prompt, model, durationSeconds, generatedAt, plan, promptInfluence, voiceId, hash }`. Ambos versionados.
- Licença: o script recusa rodar se `ELEVENLABS_PLAN` em `.env` for `free` e `--allow-free` não for passado; `meta.plan` registra o plano. Arquivos com `plan: free` não entram no manifest de produção (asserção no `assets:build`).

## 4. Lista de assets

GDD §22.1–§22.3. Total estimado da 1.0: 82 SFX, 10 faixas de música (menu + 4 biomas + 5 chefes), ~40 falas. Custo estimado em créditos: SFX 82 × 200 ≈ 16.400; música 10 × ~2,5 min × 900 ≈ 22.500; voz ~40 × ~150 ≈ 6.000. Total ≈ 45.000 créditos → 1 mês de Creator (121.000) cobre com folga, incluindo regenerações.

## 5. Testes

- Unit: mapeamento evento → som; throttle; prioridade; sidechain rampa.
- Integration (Playwright, headed opcional): unlock após clique; música troca ao mudar bioma; volumes das opções aplicam.
- Tooling: `audio:generate` com mock de API (fixtures) cobre skip por hash, retry e recusa de plano free.
