# ADR-0015 — Versionamento SemVer, Conventional Commits, Keep a Changelog e releases no padrão vukem

Status: aceito. Data: 2026-10-31.

## Contexto

O PO exige que as releases sigam exatamente o padrão de <https://github.com/AlexGalhardo/vukem/releases>. O padrão foi lido via API e documentado em `docs/web-search.md` §10.1.

## Alternativas consideradas

- release-please: gera CHANGELOG e releases automaticamente, mas no formato próprio (seções e links diferentes do vukem).
- changesets: orientado a monorepos npm; formato diferente.
- Script próprio (`tools/release`) que reproduz o padrão vukem a partir do CHANGELOG mantido à mão.

## Decisão

Padrão vukem: tag `vX.Y.Z`; título = tag; corpo = seção do CHANGELOG (H3 Added/Changed/Deprecated/Removed/Fixed/Security; itens `**escopo:** Descrição (#PR) ([hash](url))`; sem emoji, sem notas automáticas); `prerelease` só em `-rc.N`; assets com `checksums.txt`, SBOM e, quando configurado, atestação sigstore. CHANGELOG com `[Unreleased]`, cabeçalho `## [X.Y.Z] - AAAA-MM-DD` e rodapé de links de compare. Commits em Conventional Commits 1.0.0 validados por hook.

## Consequências

CHANGELOG é mantido manualmente (DoD) e verificado por script; `tools/release` substitui release-please.

## Referências

`docs/web-search.md` §10; SDD 13
