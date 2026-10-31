# ADR-0022 — Motor de áudio em Web Audio puro

Status: aceito. Data: 2026-10-31. Substitui a parte de runtime do ADR-0010 (o Audio Engine v2 do Babylon); a geração offline pela ElevenLabs do ADR-0010 continua valendo.

## Contexto

O ADR-0010 previa o Audio Engine v2 do Babylon 9. Na P-06-04, o motor precisou de regras próprias de jogo: unlock no primeiro gesto, throttle de 40 ms por som, limite de vozes, orçamento de sons novos por frame (8 de inimigos, 12 no total), crossfade de música de 1,5 s, candidato de reserva quando falta um arquivo e buses `sfx/music/voice/ui` controlados pela tela `Options`. Tudo isso precisava ser testável em Node, sem navegador.

## Alternativas consideradas

- Audio Engine v2 do Babylon: já vem com a engine, mas acopla o áudio à cena e é difícil de testar sem WebGL; as regras de throttle e orçamento ficariam por cima dele de qualquer jeito.
- Howler.js 2.2.4: dependência nova para o que a Web Audio API já oferece.

## Decisão

Motor próprio em `apps/web/src/audio/` sobre a Web Audio API:

- SFX e voz em `AudioBuffer` decodificados uma vez, tocados por `AudioBufferSourceNode` com variação de pitch de até 5%.
- Música em `HTMLAudioElement` com streaming, ligada ao bus de música, com crossfade.
- A interface mínima do `AudioContext` fica atrás de um tipo próprio (`webAudio.ts`), e os testes usam um contexto falso.
- O mapa evento → som (`eventSounds.ts`) lê os eventos do jogo; nada de áudio entra em `packages/game`.
- Arquivos em `assets/audio`, servidos em `/assets/audio/`; versões descartadas ficam em `assets/audio-archive/` (no git enquanto ficarem abaixo de 50 MB, decisão do Orq).

## Consequências

- Sem dependência nova; o motor roda igual na web e no Electron.
- Áudio espacial continua fora da 1.0 (pan estéreo simples).
- O pós-processo de loudness (SDD 08 §3) segue como dívida do `audio-generate`.

## Referências

ADR-0010; SDD 08; `apps/web/src/audio/`.
