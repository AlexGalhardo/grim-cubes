# ADR-0001 — Babylon.js como engine 3D

Status: aceito. Data: 2026-10-31.

## Contexto

O jogo precisa de 3D voxel com hordas (centenas de instâncias animadas), rodar em navegador, Electron e Android WebView, e ser escrito em TypeScript. O PO definiu Babylon.js no briefing; registramos a decisão com as alternativas para auditoria.

## Alternativas consideradas

- **Three.js + ECS próprio**: mais popular; precisa montar instancing animado, loaders, áudio e ferramentas de inspeção à mão.
- **Phaser (2D com sprites pré-renderizados)**: perderia o 3D real (câmera, profundidade, voxels).
- **Godot (Web export)**: export web pesado e com limitações em mobile WebView; perde a stack TS/React.
- **Babylon.js 9**: thin instances, Baked Vertex Animation, Audio Engine v2, inspector, glTF completo, WebGPU opcional, TypeScript nativo.

## Decisão

Babylon.js 9.33.1 (`@babylonjs/core`, `/loaders`, `/inspector` em dev) com imports por caminho (tree-shaking) e loader dinâmico.

## Consequências

- Positivas: horda via thin instances + VAT sem código próprio de GPU skinning; áudio e inspector inclusos; comunidade ativa.
- Negativas: bundle maior que Three.js se os imports forem por barrel (mitigado por regra de lint); sem guia oficial Babylon + Vite (configuração própria validada no PROTÓTIPO).

## Referências

`docs/web-search.md` §5.2, §6.3
