# SDD 13 — Release e versionamento

Especificações: SemVer 2.0.0 (<https://semver.org/>), Conventional Commits 1.0.0 (<https://www.conventionalcommits.org/en/v1.0.0/>), Keep a Changelog 1.1.0 (<https://keepachangelog.com/en/1.1.0/>). Padrão de release: repositório vukem (`docs/web-search.md` §10.1; ADR-0015).

## 1. Versão

- `package.json.version` é a fonte. Até a 1.0: `0.y.z` (tudo pode mudar). Fases: ESTRUTURA 0.1.x, PROTÓTIPO 0.2.x–0.3.x, ALPHA 0.4.x–0.6.x, BETA 0.7.x–0.9.x, RC `1.0.0-rc.N`, lançamento `1.0.0`, Android `1.1.0`.
- Mesma versão em web, Electron (`electron-builder` lê `package.json`) e Android (`versionName` = versão; `versionCode` = número monotônico gerado por `tools/release`).
- Exibida na tela de título e na tela de resultado (`__APP_VERSION__`).

## 2. Commits

`type(scope)!: description` em inglês, imperativo, ≤ 72 caracteres. Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Escopos sugeridos: `core`, `game`, `render`, `ui`, `platform`, `world`, `combat`, `shop`, `ossuary`, `audio`, `assets`, `electron`, `android`, `web`, `ci`, `docs`, `data`, `sim`. Breaking: `!` ou rodapé `BREAKING CHANGE:`. Rodapé `Refs: ROADMAP#<id>` com o id da microtarefa.

## 3. CHANGELOG.md

Formato idêntico ao vukem:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **shop:** Lock items between rounds (#12) ([a1b2c3d](https://github.com/AlexGalhardo/grim-cubes/commit/a1b2c3d…))

## [0.2.0] - 2026-11-30

### Added

- **world:** Infinite chunk streaming with deterministic seeds (#8) ([…](…))

### Fixed

- **combat:** Projectiles no longer hit the same enemy twice (#11) ([…](…))

[Unreleased]: https://github.com/AlexGalhardo/grim-cubes/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/AlexGalhardo/grim-cubes/compare/v0.1.0...v0.2.0
```

Regras: item = `- **escopo:** Descrição em inglês (#PR) ([hash7](url do commit))`; grupos na ordem Added, Changed, Deprecated, Removed, Fixed, Security; `**BREAKING:**` no início do item quando aplicável; `[Unreleased]` sempre presente; rodapé com links de compare. Mantido manualmente por quem fecha a tarefa (DoD), verificado por `tools/changelog-check` no CI (todo PR com `feat`/`fix` precisa tocar `[Unreleased]`).

## 4. Fluxo de release (`bun run release <patch|minor|major|rc>`)

1. Verifica `main` limpa, CI verde no HEAD.
2. Calcula a nova versão; move `[Unreleased]` para `## [X.Y.Z] - AAAA-MM-DD`; atualiza links de compare; atualiza `package.json` e `versionCode`.
3. Commit `chore(release): vX.Y.Z` e tag anotada `vX.Y.Z` (tag = `v` + versão; sem sufixo no título).
4. `git push --follow-tags` dispara `release.yml`:
   - título da release = tag (`v0.2.0`);
   - corpo = exatamente a seção `[X.Y.Z]` do CHANGELOG (sem cabeçalho de versão, sem "Full Changelog", sem notas automáticas, sem emoji);
   - `prerelease: true` só para `-rc.N`;
   - assets: `grim-cubes_X.Y.Z_windows_x64.exe` (NSIS), `grim-cubes_X.Y.Z_windows_x64_portable.exe`, `grim-cubes_X.Y.Z_android.aab` (a partir da 1.1), `checksums.txt` (SHA-256 de todos), `grim-cubes_X.Y.Z.sbom.json` (CycloneDX via `tools/sbom`, dependências npm), e, quando a assinatura sigstore estiver configurada (fase BETA), `checksums.txt.sigstore.json` e `grim-cubes.intoto.jsonl` via `actions/attest-build-provenance` `[versão a fixar]`.
5. Deploy web de produção acontece pelo `push` em `main` do commit de release.
6. Upload Steam e Play são manuais (`workflow_dispatch`) após o release, com aprovação do PO.

## 5. Hotfix

Branch `hotfix/x.y.z` a partir da tag, `fix:` commits, `bun run release patch`, merge de volta em `main`.
