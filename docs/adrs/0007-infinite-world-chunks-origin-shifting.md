# ADR-0007 — Mundo infinito com chunks, PRNG por chunk e origin shifting próprio

Status: aceito. Data: 2026-10-31.

## Contexto

Mundo sem bordas em f32 perde precisão longe da origem; Babylon 9 tem 'Large World Rendering' experimental com API instável; a geração por chunk precisa ser determinística por seed.

## Alternativas consideradas

- `useLargeWorldRendering` do Babylon: experimental, nome da opção mudou entre versões (fórum).
- Origin shifting manual a cada 1.024 u: técnica clássica, controlada por nós.
- Geração em Web Worker desde o início: complexidade de transferência; custo medido de geração é < 1 ms por chunk (hipótese a validar).

## Decisão

Chunks 16×16 u, anel raio 3, `hash32(seed, cx, cz)` → `mulberry32`, `simplex-noise` 4.0.3 para densidade; origin shifting manual; geração síncrona na 1.0 com limite de 2 chunks por frame; Worker só se a medição no PROTÓTIPO exceder 2 ms por chunk.

## Consequências

Código próprio de shifting precisa de teste de continuidade (SDD 03 §6); LWR pode ser adotado em ADR futuro quando estabilizar.

## Referências

`docs/web-search.md` §6.1; SDD 03
