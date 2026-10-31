# SDD 11 — Testes e qualidade

Ferramentas (versões em `docs/web-search.md` §5.1): Vitest 5.0.5, Playwright 1.64.1, agent-browser 0.41.0, Biome 2.6.4, markdownlint-cli2 0.24.0, lefthook 2.2.2, TypeScript 7.0.2.

## 1. Pirâmide

| Nível | Ferramenta | Escopo | Onde roda | Meta |
| --- | --- | --- | --- | --- |
| Unit | Vitest (Node) | `core`, `game/rules`, `game/systems` (world sintético), `ui/components` (Testing Library + jsdom), `tools/*` | pre-push, CI | cobertura ≥ 80% linhas em `packages/game` e `packages/core`; ≥ 60% em `ui` |
| Integration | Vitest (Node) | run completa sem render (10 rounds), determinismo, save round-trip + migrações, loja/level-up/Ossuário com fixtures, chunk streaming | CI | todos verdes |
| Balance | `tools/sim` (Node) | 500 runs simuladas por dificuldade; asserts de GDD §25 | CI (job separado, 10 min) | dentro das faixas |
| Visual | Playwright `toHaveScreenshot` | telas do design system nos 4 viewports (D31) | CI em PR de UI | diff ≤ 1% |
| E2E | Playwright (Chromium, WebGL via SwiftShader) | fluxo título → run → morte (cheat) → resultado → Ossuário; demo end; opções | CI | verdes; < 5 min |
| Smoke | agent-browser (CLI) | abre build de produção, espera canvas, tira screenshot, lê console sem erros, mede fps por 10 s | CI pós-deploy (preview Vercel) e manual | 0 erros de console; fps ≥ 30 em SwiftShader |
| Performance | script Playwright + `engine.getFps()` + `scene.getActiveMeshes()` | cenário "100 inimigos, round 20" em 1080p/1440p; mobile em device real (manual) | CI (desktop, informativo) e checklist de fase | SDD 14 |
| Manual | checklist por fase no ROADMAP | gamepad, Steam overlay, Android device | fim de fase | — |

## 2. Configuração

- `vitest.config.ts`: `environment: "node"` por padrão; `environmentMatchGlobs: [["packages/ui/**", "jsdom"]]`; `coverage.provider: "istanbul"` (v8 não funciona sob Bun; rodamos sob Node, mas istanbul mantém compatibilidade); `coverage.thresholds` por pacote.
- `playwright.config.ts`: projeto `chromium` com `launchOptions.args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]` (flags do Chromium; validadas no PROTÓTIPO com `gl.getParameter(RENDERER)`), 4 projetos de viewport (`desktop-1080`, `desktop-1440`, `mobile-l` 896×414 com `isMobile: true, hasTouch: true`, `mobile-s` 800×360), `webServer` apontando para `vite preview`.
- Cheats de teste (só em `__BUILD_TARGET__ !== "production"` ou com `?debug=1` em preview): `window.gc.debug.{killHero, skipRound, giveGold, spawn(type, n), setSeed}` expostos para E2E; proibidos no bundle de release (assert no build: string `gc.debug` ausente).
- Determinismo: `tests/integration/determinism.test.ts` roda a seed 42 por 3.600 passos duas vezes e compara `hashWorld(world)`; roda também com `STEP` dividido (2 × 1/120) para garantir que a lógica não depende de dt (deve divergir e o teste documenta que é esperado; serve de alerta se alguém tentar variar dt).

## 3. Lint e formatação

- Biome 2 (`biome.json`): `formatter: { indentStyle: "tab", indentWidth: 4, lineWidth: 110 }`; `linter.rules.recommended: true` + `suspicious.noExplicitAny: error`, `correctness.noUnusedImports: error`, `nursery/project`: `noFloatingPromises`, `noImportCycles`, `noUnresolvedImports`; `noRestrictedImports` para camadas (SDD 01 §2) e `Math.random` em `packages/game` (regra via `noRestrictedGlobals`); `vcs.useIgnoreFile: true`; `files.ignore: ["public/assets/**", "apps/android/**", "release/**"]`.
- TypeScript 7: `tsc -b` com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `types: ["bun-types", "vitest/globals"]` por pacote.
- markdownlint-cli2: `.markdownlint-cli2.jsonc` da raiz (MD013 off, MD033 off, MD024 siblings, MD010 fora de código).
- Regra extra (script `tools/lint-extra`): proíbe hex literal em `packages/ui/**/*.tsx`, proíbe `console.log` fora de `core/logger`, proíbe `^` em versões do `package.json`.

## 4. Git hooks (lefthook)

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: biome
      run: bunx biome check --write {staged_files}
      glob: "*.{ts,tsx,js,json,jsonc,css}"
      stage_fixed: true
    - name: markdown
      run: bunx markdownlint-cli2 {staged_files}
      glob: "*.md"
    - name: data
      run: bun run data:check
      glob: "data/*.json"
    - name: secrets
      run: bun tools/secrets-scan/index.ts {staged_files}
commit-msg:
  jobs:
    - name: conventional
      run: bun tools/commitlint/index.ts {1}
pre-push:
  jobs:
    - name: typecheck
      run: bun run typecheck
    - name: unit
      run: bunx vitest run --project unit
```

`tools/secrets-scan`: regex para chaves conhecidas (`sk_`, `ELEVENLABS`, `xi-api-key`, PEM) nos arquivos staged; bloqueia o commit. `tools/commitlint`: valida `type(scope)!: description` com tipos `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert` (sem dependência).

## 5. Definition of Done (por tarefa)

1. Asserts da microtarefa do ROADMAP passam (comando citado na tarefa).
2. `bun run lint`, `bun run lint:md`, `bun run typecheck` limpos.
3. Testes novos para lógica nova (regra, sistema, componente); `bun run test` verde; cobertura não cai.
4. Se tocou UI: capturas visuais atualizadas e revisadas nos 4 alvos.
5. Se tocou `data/*.json`: `bun run sim` dentro das faixas.
6. Docs afetadas atualizadas (SDD/GDD/ADR) e `CHANGELOG.md` `[Unreleased]`.
7. Commit em Conventional Commits; PR com descrição, capturas e link para a tarefa do ROADMAP.
