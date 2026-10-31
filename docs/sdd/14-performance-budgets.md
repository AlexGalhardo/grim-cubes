# SDD 14 — Performance e orçamentos por plataforma

Pilar P5 (GDD §2) e Art Bible §5.4. Alvos de tela D31.

## 1. Metas

| Plataforma | Cenário de referência | Meta | Mínimo aceitável |
| --- | --- | --- | --- |
| Desktop 1080p (GPU integrada classe Intel Iris Xe / Ryzen 5 iGPU, 2021+) | round 20, 100 inimigos, 1 elite, 200 projéteis, 150 decals | 60 fps estáveis (p99 frame ≤ 20 ms) | 45 fps |
| Desktop 1440p (GPU dedicada classe GTX 1650 / RX 6500) | idem | 60 fps (p99 ≤ 18 ms) | 60 fps com render interno 1080p |
| Electron (mesmo hardware) | idem | igual ao navegador ±5% | — |
| Android classe Galaxy A (Snapdragon 6xx/7xx, 2022+), 896×414 e 800×360 CSS px | round 20, 60 inimigos, 1 elite, 120 projéteis, 60 decals, render interno ≈ 1344×621 | 30 fps estáveis (p99 ≤ 40 ms) | 30 fps com cap 40 inimigos |
| Memória JS (heap) | qualquer | ≤ 256 MB desktop; ≤ 180 MB Android | — |
| Memória GPU (texturas + buffers) | qualquer | ≤ 300 MB desktop; ≤ 160 MB Android (KTX2) | — |
| Tempo até o menu (cold, web, 50 Mbps) | — | ≤ 5 s; bundle inicial ≤ 2,5 MB gzip; grupo `core` de assets ≤ 12 MB | — |
| Geração de chunk | 49 chunks | ≤ 50 ms total (Node), ≤ 2 ms por chunk no frame | — |
| Simulação (`simulate`) | 100 inimigos, 200 projéteis | ≤ 2 ms por passo (desktop), ≤ 5 ms (Android) | — |

## 2. Orçamentos por frame (desktop / Android)

| Recurso | Desktop | Android |
| --- | --- | --- |
| Draw calls | ≤ 120 | ≤ 70 |
| Triângulos | ≤ 400 k | ≤ 150 k |
| Meshes ativos (após instancing) | ≤ 60 | ≤ 40 |
| Thin instances totais | ≤ 1.500 (inimigos + props + fragmentos + partículas cúbicas) | ≤ 800 |
| Materiais únicos | ≤ 12 | ≤ 10 |
| Texturas residentes | 3 atlas + VAT (≤ 8) + UI | idem em KTX2 |
| Luzes | 1 direcional + 1 hemisférica + ≤ 4 pontuais | + ≤ 1 pontual |
| Sombras | 1 cascata 1024, só herói/elites/chefes | nenhuma (blob) |
| Pós-processo | vinheta + bloom leve + grain | vinheta |
| Partículas | ≤ 600 | ≤ 200 |
| Decals | ≤ 200 | ≤ 60 |
| Alocações no hot path | 0 por frame (verificado com heap snapshot: sem crescimento em 60 s) | idem |

## 3. Técnicas obrigatórias

- Thin instances para inimigos, props, fragmentos, partículas cúbicas e projéteis (1 mesh por tipo); buffers `Float32Array` reutilizados; `thinInstanceSetBuffer(..., false)` e `thinInstanceBufferUpdated` uma vez por frame por mesh.
- VAT para animação de inimigos comuns; skeleton só para herói, NPC e chefes.
- `scene.freezeActiveMeshes()` com `scene.unfreezeActiveMeshes()` quando o anel de chunks muda; `material.freeze()` em todos os materiais estáticos; `mesh.freezeWorldMatrix()` em chão e props.
- `scene.autoClear = false` onde o chão cobre a tela; `skipPointerMovePicking = true`; picking só para UI (nenhum `scene.pick` por frame).
- Culling manual por distância na simulação (inimigos > 40 u são removidos sem drop) e no render (instâncias fora do frustum ampliado não entram no buffer).
- `engine.setHardwareScalingLevel()` dinâmico via `SceneOptimizer` (Android): começa em `devicePixelRatio / 1.5`; degrada até 2,0 se p99 > 45 ms por 3 s; recupera lentamente.
- Texturas `NEAREST`, sem mipmaps nos atlas de personagens (pixel art), mipmaps só no atlas de chão.
- Áudio: ≤ 24 vozes simultâneas; `maxInstances` por som.
- UI: React a 12 Hz; nenhum layout thrash (medir com Performance panel: `Recalculate Style` < 1 ms por atualização).

## 4. Medição

- `tools/perf/bench.spec.ts` (Playwright): carrega `?debug=1&bench=round20`, que instancia o cenário de referência determinístico (seed fixa), roda 30 s e grava `{ fpsAvg, fpsP1, frameP99, drawCalls, activeMeshes, heapMB }` via `engine.getFps()`, `scene.getActiveMeshes().length`, `engine._drawCalls` (ou `SceneInstrumentation`), `performance.memory` quando disponível. Resultado em `reports/perf-<alvo>.json` e comentário no PR (informativo no CI com SwiftShader; os números válidos vêm da execução local/manual com GPU real, registrada no checklist de fase).
- Android: mesmo cenário via Capacitor em device real; coleta com `adb shell dumpsys gfxinfo` + overlay de fps do jogo; registrado em `reports/perf-android-<device>.json` ao final de cada fase.
- Inspector do Babylon (`@babylonjs/inspector`) disponível em `?debug=1` para profiling manual; nunca no bundle de produção.
- Regressão: variação > 10% em `frameP99` ou > 15% em draw calls no bench do CI bloqueia o merge (comparação com `main`).

## 5. Degradação controlada (opções de vídeo)

| Preset | Inimigos cap | Sombras | Pós | Decals | Partículas | Render scale |
| --- | --- | --- | --- | --- | --- | --- |
| Ultra (1440p) | 100 | cascata 2048 | tudo | 200 | 600 | 1,0 |
| Alto (1080p padrão) | 100 | cascata 1024 | tudo | 200 | 600 | 1,0 |
| Médio | 100 | blob | vinheta | 100 | 300 | 1,0 |
| Baixo / Android padrão | 60 | blob | vinheta | 60 | 200 | dinâmico |
| Mínimo | 40 | nenhuma | nenhum | 30 | 100 | 0,5–0,75 |

O `cap` de inimigos afeta jogabilidade: abaixo de 100, os spawns excedentes são removidos (sem drop) como no cap padrão, e o `total(N)` do round não muda, então a pressão por tempo é a mesma. Registrado no GDD §10.3 como consequência aceita.
