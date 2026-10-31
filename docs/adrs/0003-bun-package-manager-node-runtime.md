# ADR-0003 — Bun como gerenciador e runner; Node como runtime de Vite, Vitest e Playwright

Status: aceito. Data: 2026-10-31.

## Contexto

A regra global pede Bun. Vite, Vitest e Playwright têm shebang Node e documentação só para Node; a cobertura `v8` do Vitest não funciona sob Bun; Playwright não documenta Bun.

## Alternativas consideradas

- Tudo sob Bun (`bun run --bun`): risco de incompatibilidades sem suporte oficial.
- Tudo sob Node com npm/pnpm: contraria a regra global.
- Bun para instalar/rodar scripts e ferramentas próprias (`tools/*`), Node para as CLIs com shebang (comportamento padrão de `bun run`).

## Decisão

Bun 1.4.4 como package manager (workspaces, `bun.lock`) e runner; `bun run vite|vitest|playwright` executa essas CLIs sob Node (padrão do Bun); ferramentas próprias em `tools/*` rodam sob Bun. Cobertura com `istanbul`.

## Consequências

Node 22+ continua sendo requisito de dev e CI; `setup-bun` + `setup-node` nos workflows.

## Referências

`docs/web-search.md` §5.4
