# ADR-0014 — Renderização: WebGL2 padrão, WebGPU opt-in; thin instances + VAT; materiais sem PBR

Status: aceito. Data: 2026-10-31.

## Contexto

WebGPU no Babylon é opt-in sem fallback automático e seu suporte em Android WebView é incerto; o look é unlit/flat (Art Bible §4); hordas exigem instancing.

## Alternativas consideradas

- WebGPU por padrão: ganho não verificado; risco em WebView.
- Instances clássicas (`createInstance`): mais flexíveis (culling por instância), mais custo por instância.
- SPS (Solid Particle System): bom para partículas, pior para animação por vértice.

## Decisão

`Engine` (WebGL2) por padrão; `WebGPUEngine` só com `navigator.gpu` e opção do jogador (desktop), nunca em Android na 1.0. Thin instances por tipo + `BakedVertexAnimationManager` para inimigos comuns; `StandardMaterial` sem specular ou unlit; `NEAREST`; 1 direcional + 1 hemisférica; sombras só herói/elites/chefes no desktop; blob shadows no resto.

## Consequências

Culling de thin instances é por mesh (tudo ou nada): resolvido por culling manual na simulação (remoção > 40 u) e por buffer só com instâncias próximas.

## Referências

`docs/web-search.md` §6.3, §6.5; SDD 14
