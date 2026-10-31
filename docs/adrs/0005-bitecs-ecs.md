# ADR-0005 — ECS com bitecs 0.4.0

Status: aceito. Data: 2026-10-31.

## Contexto

A simulação precisa de centenas de entidades por passo sem alocação, buffers contínuos para alimentar thin instances e testes unitários por sistema. O PO aprovou a dependência (brainstorming P19).

## Alternativas consideradas

- Estrutura própria SoA: zero dependência, mas reinventa queries, pools e serialização; mais disciplina exigida dos agentes.
- miniplex 2.0.0: ergonômico, orientado a objetos, última release em 2023, menos performático.
- bitecs 0.4.0: TypedArrays (SoA), queries rápidas, sem dependências, release em dez/2025.

## Decisão

bitecs 0.4.0 em `packages/game`; componentes como TypedArrays; sistemas como funções puras `(world, step) => void`; sem classes no hot path.

## Consequências

Curva de aprendizado para quem não conhece ECS; em troca, `render.sync` lê os buffers diretamente e os testes de sistema são triviais.

## Referências

SDD 02
