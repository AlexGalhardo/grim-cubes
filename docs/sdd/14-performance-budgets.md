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

Estado no PROTÓTIPO: os testes de alocação usam contador (espião em `Array.prototype.filter/map/slice/concat/join` e nos construtores de TypedArray), não heap snapshot. O `heapMB` do bench fica como sinal complementar. Os props só são instanciados até Chebyshev ≤ `loadRadius` (49 chunks × no máximo 24 ≈ 1.176), para caber no limite de thin instances junto com a horda. Projéteis do herói, tiros inimigos (`EnemyShot`) e fragmentos já têm render, cada um em 1 mesh de thin instances com capacidade fixa (projéteis = pool do jogo, 512; tiros = `ENEMY_SHOT_POOL_SIZE`, 128; fragmentos 256 em `apps/web`). A P-04-05 trouxe os VFX dentro dos pools de `data/render.json` `vfx`: partículas cúbicas (`particlePool` 600), decals (`decalPool` 200), números de dano (32), hit-stop, vinheta no HUD (CSS, sem pós-processo) e shake por `targetScreenOffset`. Medição de referência (`reports/perf-desktop-1080.json`, P-03-05): 29 draw calls e 37 meshes ativos com VFX (P-03-05); após a R-01-03, com SwiftShader, `round20` mede 19 draw calls e 19 meshes ativos e `horde100` 15 e 15, contra os orçamentos de 120 draw calls (desktop), 70 (Android) e 60 meshes ativos. Entre 61 e 65 meshes ativos medidos antes dessa correção, 46 eram os `__root__` sem geometria dos glb importados (um por rig/modelo); `hideEmptyMeshes` os marca como invisíveis e o relatório do bench lista `activeMeshNames` para flagrar regressões. O orçamento não muda; os números servem de linha de base para o round20 representativo (§1).

### Memória de GPU e de áudio (A-01-02, medição de 2026-10-31)

Cada atlas passou a ter o menor tamanho potência de 2 (256 a 2048) que cabe nos seus sprites (`fitAtlas`, o manifest informa `width` e `height`), em vez de 2048² fixo (16 MB cada). Medido com o `assets:build` atual:

| Recurso | Antes | Agora |
| --- | --- | --- |
| 5 atlas (`characters`, `characters_e`, `props`, `props_e`, `vfx_ui`), RGBA sem mipmaps | 80 MB (5 × 16) | 5 MB (5 × 1, todos em 512²) |
| VATs (10) | 0,13 MB | 0,13 MB |
| Malhas glb (todos os modelos) | 0,9 MB em disco | idem |
| Buffers instanciados, partículas, decals | pequenos (alguns MB, pools de `data/render.json`) | idem |
| Áudio de efeitos e vozes decodificado (69 arquivos, 1,6 MB em mp3) | ≈ 35 MB estimados (PCM float 32, estéreo, 44,1 kHz) | idem |
| Música (9 faixas, 16,5 MB em mp3) | streaming por `MediaElement`, não decodificada | idem |

Áudio decodificado sob demanda (A-01-02): nenhum som é decodificado no boot; cada efeito ou voz é decodificado na primeira vez que toca, e a música é streaming. O pior caso de uma run é, portanto, tudo ter tocado uma vez (≈ 35 MB). O motor passou a limitar isso: os efeitos de combate frequentes (`sfx_enemy_*`, `sfx_sword_*`, `sfx_pistol_*`, `sfx_pickup_*`, `sfx_player_hit`, `sfx_explosion*`, `sfx_dash`, `sfx_prop_break`) ficam decodificados depois do primeiro uso, e todo o resto (efeitos de chefe, baús, rodada, vozes; ≈ 20 MB decodificados se tudo tocasse) divide um orçamento de 8 MB (`EVICTABLE_BYTES`) com descarte do menos recente (LRU): o buffer sai do cache, e uma fonte que ainda toca guarda a própria referência, então nenhum som é cortado. Um som descartado que toca de novo é baixado e decodificado outra vez (alguns ms, em um evento raro). Teto resultante de áudio decodificado: ≈ 8 MB mais os frequentes (≈ 10 MB), contra ≈ 35 MB.

Tempo de carga até o `gc.ready` no `vite preview` local (build com debug, SwiftShader, 3 rodadas): frio 1,0 a 1,9 s, morno 1,6 a 2,6 s, com ≈ 1,2 MB transferidos; o morno não ficou melhor porque o preview não envia cabeçalhos de cache e a inicialização do WebGL em software domina. O áudio não entra nesse tempo (nada é carregado no boot). A medição de carga de verdade (Vercel, com CDN e cache longo dos arquivos com hash) fica para o smoke pós-deploy.

Total de texturas e VATs: ≈ 5,2 MB, contra o teto de 160 MB do Android; o áudio decodificado (≈ 35 MB) é o maior item e é memória de sistema, não de GPU. O render interno a 1344×621 e os buffers de quadro somam poucas dezenas de MB. A estimativa de áudio assume 128 kbps; a medição real de memória do aparelho continua para a M-01-04 (device Android do PO). O KTX2 (A-01-02 propriamente dita, `toktx` no CI) deixa de ser necessário para o orçamento de memória e fica só para o tempo de carga e para GPUs que preferem formato comprimido; a decisão sobre instalar o `toktx` segue com o PO.

## 3. Técnicas obrigatórias

- Thin instances para inimigos, props, fragmentos, partículas cúbicas e projéteis (1 mesh por tipo); buffers `Float32Array` reutilizados; `thinInstanceSetBuffer(..., false)` e `thinInstanceBufferUpdated` uma vez por frame por buffer (na horda: matriz + `bakedVertexAnimationSettingsInstanced`; nos props com fade: matriz + `color`). O chão é 1 mesh com 1 quad por cubo, escrito por slot com `updateDirectly`.
- VAT para animação de inimigos comuns; skeleton só para herói, NPC e chefes.
- `scene.freezeActiveMeshes()` só para meshes estáticos (chão e props), com `scene.unfreezeActiveMeshes()` quando o anel de chunks muda ou em `OriginShifted`; meshes de thin instances animadas (inimigos) usam `alwaysSelectAsActiveMesh = true`; `material.freeze()` em todos os materiais estáticos; `mesh.freezeWorldMatrix()` em chão e props.
- `scene.autoClear = false` onde o chão cobre a tela; `skipPointerMovePicking = true`; picking só para UI (nenhum `scene.pick` por frame).
- Culling manual por distância na simulação (inimigos > 40 u são removidos sem drop) e no render (instâncias fora do frustum ampliado não entram no buffer).
- `engine.setHardwareScalingLevel()` dinâmico via `SceneOptimizer` (Android): começa em `devicePixelRatio / 1.5`; degrada até 2,0 se p99 > 45 ms por 3 s; recupera lentamente. Implementado em `packages/render/src/scene/quality.ts` (`createDynamicScaler`, parâmetros em `data/presets.json` `dynamicScale`); o `main.tsx` liga o scaler quando o preset tem `dynamicScale`, e a tela `Options` escolhe o preset.
- Estado no PROTÓTIPO: chão, props e horda usam `alwaysSelectAsActiveMesh`, e `freezeWorldMatrix`/`material.freeze()` só no chão base e nos materiais placeholder estáticos (os props com fade não devem ser congelados, ver P-02-03). Ainda não estão no código, todos provisórios até A-01: `freezeActiveMeshes`, `autoClear = false`, `skipPointerMovePicking`, `SceneOptimizer`/scaling dinâmico. Culling (P-03-05): na simulação, `cullDistantEnemies` remove inimigos a mais de 40 u do herói (`world.json` `cullDistance`), sem drop nem evento de morte e nunca elites nem chefes; roda logo após o `movementSystem`. No render, a horda deixa de fora as instâncias fora do frustum ampliado da câmera; a primeira versão usava um disco de 30 u em volta do herói (`renderCullRadius`), curto para o mobile e para o afastamento da câmera na intro de chefe, e a troca por frustum de verdade está com o S1.
- Texturas `NEAREST` e sem mipmaps em todos os atlas por ora (pixel art); mipmaps no atlas de chão ficam para uma medição futura.
- Áudio: ≤ 24 vozes simultâneas; `maxInstances` por som.
- UI: React a 12 Hz; nenhum layout thrash (medir com Performance panel: `Recalculate Style` < 1 ms por atualização).

## 4. Medição

- Anéis de contraste e barras de vida (feat/contrast-rings e feat/hp-bars), `round20`, 1080p, SwiftShader, rodadas alternadas (máquina carregada, valores absolutos mais altos que os de outras linhas): com os dois ligados 79, 84 e 81,8 ms de média por frame e p99 162, 202 e 170 ms; desligados (`debug.setOverlays(false)`) 70, 76 e 70,6 ms e p99 140, 164 e 136 ms. Custo ≈ +10 a +16% na média e +16 a +25% no p99, e +3 draw calls (22 para 25: 1 dos anéis e 2 das barras) e +3 meshes ativos. Acima dos 3% do critério, então os anéis ficam desligados no preset `minimum` (`NO_RINGS_PRESETS`); a parte de cada um (anéis contra barras) não foi medida em separado, e as barras são uma opção do jogador nas Opções. Em GPU real o custo não foi medido (`BENCH_GPU=1`).
- Variantes cosméticas de inimigo (`husk_02`, `wail_02`, 30% do tipo; Art Bible §10.2), `round20`, 1080p, SwiftShader, 2 rodadas por estado: com variantes 22 draw calls e 22 meshes ativos, p99 116 e 121 ms, média 59,8 ms; sem elas (`debug.setVariants(0)`) 20 e 20, p99 137 e 130 ms, média 60,5 e 60,9 ms. O custo é de +2 meshes e +2 draw calls (+10%, contra o teto de 120 no desktop e 70 no Android) e nenhum custo de frame medível. Memória: 2 VATs e 2 meshes a mais (alguns KB). Sem corte: nenhum limite foi ultrapassado; se o Android apertar, o corte é `variantPercent: 0` nos presets `minimum` e `low`.
- Atlas emissivos (`atlas_characters_e` e `atlas_props_e`, de `<nome>_e.png`): mesmo tamanho do atlas difuso, PNG RGBA sem KTX2 e sem mipmaps. Os presets `minimum` e `low` não os carregam (`emissive: false` no `loadGameAssets`); do `medium` para cima sim. Empacotar a máscara em um canal só fica para quando houver KTX2.
- VFX ligado contra desligado (P-04-05), `round20`, 1080p, SwiftShader, 2 rodadas cada: média por frame 60,8 e 62,5 ms com VFX contra 55,0 ms sem (≈ 6,5 ms, 11%); frameP99 120 e 143 ms com contra 126 e 121 ms sem, dentro do ruído da máquina. "Sem VFX" = pools de partículas e decals em 0 e números de dano com escala 0 (`debug.setVfx(false)`). O número é indicativo; a meta de p99 ≤ 20 ms precisa de `BENCH_GPU=1`.
- O retrato do Mercador (A-05-01) é um `RenderTargetTexture` de 160 px do mesmo engine, atualizado a cada 2 frames e copiado ao canvas da Shop por `readPixels` (uma leitura assíncrona de ~100 kB), só com a Shop aberta (jogo pausado) e em larguras ≥ 1024 px. O canvas principal nunca muda de tamanho (teste no NullEngine). Custo não medido; o bench não abre a Shop.
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
