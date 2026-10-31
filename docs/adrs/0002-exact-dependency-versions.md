# ADR-0002 — Versões exatas de dependências

Status: aceito. Data: 2026-10-31.

## Contexto

A regra global do PO exige versões estáveis, fixas (sem `^`), nunca `latest`/pré-releases. A stack muda rápido (Vite 8, TS 7, Biome 2.6) e quebras entre minors já ocorreram (ex.: `thinInstanceSetBuffer` com `staticBuffer` default alterado).

## Alternativas consideradas

- Ranges `^` com lockfile: o lockfile protege, mas `bun update` sobe silenciosamente.
- Versões exatas + Dependabot semanal: upgrades explícitos em PR.

## Decisão

`package.json` só com versões exatas (lint extra falha em `^`/`~`); `bun.lock` commitado; `bun install --frozen-lockfile` no CI; Dependabot com `versioning-strategy: increase`; toda atualização de major gera entrada em `CHANGELOG` (Changed) e, se afetar arquitetura, um ADR.

## Consequências

Upgrades exigem PR dedicado; em troca, builds reprodutíveis e diffs auditáveis.

## Referências

`docs/web-search.md` §5.1 (tabela de versões verificadas)
