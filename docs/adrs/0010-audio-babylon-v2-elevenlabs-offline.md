# ADR-0010 — Áudio: Babylon Audio Engine v2; ElevenLabs via fetch em script de build

Status: aceito; a parte de runtime (Audio Engine v2) foi substituída pelo ADR-0022 em 2026-10-31. Data: 2026-10-31.

## Contexto

Babylon 9 inclui Audio Engine v2 (buses, buffers, streaming, unlock). ElevenLabs licencia uso comercial só em planos pagos e a chave não pode ir ao bundle. O SDK oficial é dependência nova.

## Alternativas consideradas

- Howler.js 2.2.4: maduro, mas duplica o que a engine já faz; última release em 2023.
- `@elevenlabs/elevenlabs-js` 2.75.0: conveniente, mas dependência extra para 3 endpoints REST.
- Gerar áudio em runtime: expõe chave e custa créditos por jogador.

## Decisão

Audio Engine v2 (`CreateAudioEngineAsync`, buses `sfx/music/voice/ui`, unlock no primeiro gesto). Geração offline por `tools/audio-generate` com `fetch` direto, chave em `.env`, `meta.json` por arquivo com plano; arquivos versionados; build recusa assets gerados no plano free.

## Consequências

Custo mensal de plano Creator durante a produção (≈ US$ 22/mês); spatial audio desligado na 1.0 (pan estéreo simples).

## Referências

`docs/web-search.md` §8; SDD 08
