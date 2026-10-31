# ADR-0016 — Git hooks com lefthook

Status: aceito. Data: 2026-10-31.

## Contexto

Hooks de pre-commit/pre-push são obrigatórios; Husky 9.1.7 não tem release desde nov/2024 e exige lint-staged; o projeto usa Bun e roda em Windows 11.

## Alternativas consideradas

- Husky + lint-staged: padrão JS, duas dependências, sem paralelismo nativo.
- simple-git-hooks: mínimo, sem `staged_files`.
- lefthook 2.2.2: binário único, paralelo, `{staged_files}`, YAML, instalável por npm/winget/scoop.

## Decisão

lefthook 2.2.2 com `pre-commit` (biome, markdownlint, data:check, secrets-scan), `commit-msg` (commitlint próprio) e `pre-push` (typecheck, unit).

## Consequências

Hooks rodam sem Node; scripts de validação próprios em `tools/*` sob Bun.

## Referências

`docs/web-search.md` §5.6; SDD 11 §4
