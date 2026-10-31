# ADR-0013 — UI: React 19 overlay com store próprio e useSyncExternalStore; Tailwind v4 com tokens; fonte pixel OFL

Status: aceito. Data: 2026-10-31.

## Contexto

HUD não pode re-renderizar a 60 fps; não há integração oficial Babylon+React; o PO escolheu store próprio sem zustand (P22) e o Art Bible define o design system (D33).

## Alternativas consideradas

- `react-babylonjs` / Reactylon: cena declarativa em React; acopla engine ao React, re-render arriscado.
- zustand 5.0.16: ergonomia, dependência pequena.
- CustomEvents DOM: estado espalhado.

## Decisão

Canvas controlado por `render`; React só para telas e HUD; `Store<T>` próprio + `useSyncExternalStore`; snapshots a 12 Hz; comandos por fila; Tailwind v4 com `@theme` (tokens do Art Bible §16.9), sem hex em TSX; fonte display pixel OFL escolhida entre "Press Start 2P" e "Pixelify Sans" após teste de legibilidade em 1080p e 6" (decisão final registrada como emenda deste ADR na fase PROTÓTIPO).

## Consequências

Sem devtools de store (aceito; snapshot é serializável e logável); números de dano desenhados pela engine, não pelo React.

## Referências

SDD 07; Art Bible §16
