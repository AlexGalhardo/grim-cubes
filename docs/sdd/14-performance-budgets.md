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

Estado no PROTÓTIPO: os testes de alocação usam contador (espião em `Array.prototype.filter/map/slice/concat/join` e nos construtores de TypedArray), não heap snapshot. O `heapMB` do bench fica como sinal complementar. Os props só são instanciados até Chebyshev ≤ `loadRadius` (49 chunks × no máximo 24 ≈ 1.176), para caber no limite de thin instances junto com a horda. Projéteis do herói, tiros inimigos (`EnemyShot`) e fragmentos já têm render, cada um em 1 mesh de thin instances com capacidade fixa (projéteis = pool do jogo, 512; tiros = `ENEMY_SHOT_POOL_SIZE`, 128; fragmentos 256 em `apps/web`). A P-04-05 trouxe os VFX dentro dos pools de `data/render.json` `vfx`: partículas cúbicas (`particlePool` 600), decals (`decalPool` 200), números de dano (32), hit-stop, vinheta no HUD (CSS, sem pós-processo) e shake por `targetScreenOffset`. Medição de referência (`reports/perf-desktop-1080.json`, P-03-05): 29 draw calls e 37 meshes ativos com VFX, contra os orçamentos de 120 draw calls (desktop), 70 (Android) e 60 meshes ativos. O orçamento não muda; os números servem de linha de base para o round20 representativo (§1).

## 3. Técnicas obrigatórias

- Thin instances para inimigos, props, fragmentos, partículas cúbicas e projéteis (1 mesh por tipo); buffers `Float32Array` reutilizados; `thinInstanceSetBuffer(..., false)` e `thinInstanceBufferUpdated` uma vez por frame por buffer (na horda: matriz + `bakedVertexAnimationSettingsInstanced`; nos props com fade: matriz + `color`). O chão é 1 mesh com 1 quad por cubo, escrito por slot com `updateDirectly`.
- VAT para animação de inimigos comuns; skeleton só para herói, NPC e chefes.
- `scene.freezeActiveMeshes()` só para meshes estáticos (chão e props), com `scene.unfreezeActiveMeshes()` quando o anel de chunks muda ou em `OriginShifted`; meshes de thin instances animadas (inimigos) usam `alwaysSelectAsActiveMesh = true`; `material.freeze()` em todos os materiais estáticos; `mesh.freezeWorldMatrix()` em chão e props.
- `scene.autoClear = false` onde o chão cobre a tela; `skipPointerMovePicking = true`; picking só para UI (nenhum `scene.pick` por frame).
- Culling manual por distância na simulação (inimigos > 40 u são removidos sem drop) e no render (instâncias fora do frustum ampliado não entram no buffer).
- `engine.setHardwareScalingLevel()` dinâmico via `SceneOptimizer` (Android): começa em `devicePixelRatio / 1.5`; degrada até 2,0 se p99 > 45 ms por 3 s; recupera lentamente. Implementado em `packages/render/src/scene/quality.ts` (`createDynamicScaler`, parâmetros em `data/presets.json` `dynamicScale`); a ligação no `main.tsx` e a tela `Options` ficam para depois da `createGameSession`.
- Estado no PROTÓTIPO: chão, props e horda usam `alwaysSelectAsActiveMesh`, e `freezeWorldMatrix`/`material.freeze()` só no chão base e nos materiais placeholder estáticos (os props com fade não devem ser congelados, ver P-02-03). Ainda não estão no código, todos provisórios até A-01: `freezeActiveMeshes`, `autoClear = false`, `skipPointerMovePicking`, `SceneOptimizer`/scaling dinâmico. Culling (P-03-05): na simulação, `cullDistantEnemies` remove inimigos a mais de 40 u do herói (`world.json` `cullDistance`), sem drop nem evento de morte e nunca elites nem chefes; roda logo após o `movementSystem`. No render, a horda deixa de fora as instâncias fora do frustum ampliado da câmera; a primeira versão usava um disco de 30 u em volta do herói (`renderCullRadius`), curto para o mobile e para o afastamento da câmera na intro de chefe, e a troca por frustum de verdade está com o S1.
- Texturas `NEAREST` e sem mipmaps em todos os atlas por ora (pixel art); mipmaps no atlas de chão ficam para uma medição futura.
- Áudio: ≤ 24 vozes simultâneas; `maxInstances` por som.
- UI: React a 12 Hz; nenhum layout thrash (medir com Performance panel: `Recalculate Style` < 1 ms por atualização).

## 4. Medição

- `tools/perf/bench.spec.ts` (Playwright): carrega `?debug=1&bench=round20`, que instancia o cenário de referência determinístico (seed fixa), roda 5 s de warm-up (descartados) e 30 s de medição, e grava `{ fpsAvg, fpsP1, frameP99, drawCalls, activeMeshes, heapMB }` com `fpsAvg` = frames medidos / segundos, `activeMeshes` = pico de `scene.getActiveMeshes().length`, `drawCalls` = pico por frame de `SceneInstrumentation.drawCallsCounter` (média em `drawCallsAvg`); `frameP99` por `performance.now()` em `engine.onEndFrameObservable`; cenários `horde100` e `round20`, rodar com `bun run test:perf` (`BENCH_GPU=1` em GPU real), `performance.memory` quando disponível. Resultado em `reports/perf-<alvo>.json` e comentário no PR (informativo no CI com SwiftShader; os números válidos vêm da execução local/manual com GPU real, registrada no checklist de fase).
- Android: mesmo cenário via Capacitor em device real; coleta com `adb shell dumpsys gfxinfo` + overlay de fps do jogo; registrado em `reports/perf-android-<device>.json` ao final de cada fase.
- Cenários (só em build com `GC_DEBUG_API=1`, `?bench=` em `apps/web`): seed 42, herói parado, sem fluxo de run nem level-up. `horde100` mantém a horda no cap; `round20` acrescenta mira, arma e projéteis. Hoje o `round20` não sustenta a carga de referência (a horda cai abaixo de 100 e a arma inicial não gera 200 projéteis); elite e decals entram com a P-05-06 e a P-04-05. Tudo isso é provisório até a correção do round20 (S1). O relatório deve registrar `enemies` e `projectiles` médios.
- Inspector do Babylon (`@babylonjs/inspector`) disponível em `?debug=1` para profiling manual; nunca no bundle de produção (provisório: ainda não ligado no `apps/web`).
- Regressão: variação > 10% em `frameP99` ou > 15% em draw calls no bench do CI bloqueia o merge (comparação com `main`). Provisório até A-01: hoje o bench não roda no `ci.yml`.

## 5. Degradação controlada (opções de vídeo)

| Preset | Inimigos cap | Sombras | Pós | Decals | Partículas | Render scale |
| --- | --- | --- | --- | --- | --- | --- |
| Ultra (1440p) | 100 | cascata 2048 | tudo | 200 | 600 | 1,0 |
| Alto (1080p padrão) | 100 | cascata 1024 | tudo | 200 | 600 | 1,0 |
| Médio | 100 | blob | vinheta | 100 | 300 | 1,0 |
| Baixo / Android padrão | 60 | blob | vinheta | 60 | 200 | dinâmico |
| Mínimo | 40 | nenhuma | nenhum | 30 | 100 | 0,5–0,75 |

Os valores da tabela vivem em `data/presets.json` (schema `presets.schema.json`, `presetsData` em `@gc/game`); `applyPreset` aplica sombras e escala de render, e o cap de inimigos e os tamanhos dos pools ficam com quem os possui (spawner e VFX). Não há gerador de sombras ainda, então `shadows` só liga `scene.shadowsEnabled`.

O `cap` de inimigos afeta jogabilidade: abaixo de 100, os spawns excedentes são removidos (sem drop) como no cap padrão, e o `total(N)` do round não muda, então a pressão por tempo é a mesma. Registrado no GDD §10.3 como consequência aceita.
