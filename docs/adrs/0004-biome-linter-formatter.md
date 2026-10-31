# ADR-0004 — Biome 2 como linter e formatter, com tabs de largura 4

Status: aceito. Data: 2026-10-31.

## Contexto

Padrões globais: `.editorconfig` com tab de largura 4, markdownlint, sem ESLint+Prettier. Biome 2 cobre TS/JSON/CSS com regras type-aware sem depender do compilador TS (relevante com TS 7 sem API JS).

## Alternativas consideradas

- ESLint 9 + Prettier + typescript-eslint: maduro, mas depende da API do TypeScript (TS 7.0 não a expõe) e exige 3 ferramentas.
- Biome 2.6.4: uma ferramenta, rápido, `biome ci`, regras `project` (`noFloatingPromises`, `noImportCycles`).

## Decisão

Biome 2.6.4 com `indentStyle: tab`, `indentWidth: 4`, `lineWidth: 110`, `recommended` + regras listadas no SDD 11 §3; markdownlint-cli2 para Markdown; `.editorconfig` como fonte para editores.

## Consequências

Algumas regras do ecossistema ESLint não existem no Biome (aceito); lint extra em script próprio para regras de projeto (hex em TSX, `console.log`, `^`).

## Referências

`docs/web-search.md` §5.4; SDD 11
