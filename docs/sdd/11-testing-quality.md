# SDD 11 — Testes e qualidade

Ferramentas (versões em `docs/web-search.md` §5.1): Vitest 5.0.5, Playwright 1.64.1; smoke também em Playwright (agent-browser descartado, ADR-0019 emendado), Biome 2.6.4, markdownlint-cli2 0.24.0, lefthook 2.2.2, TypeScript 7.0.2.

## 1. Pirâmide

| Nível | Ferramenta | Escopo | Onde roda | Meta |
| --- | --- | --- | --- | --- |
| Unit | Vitest (Node) | `core`, `game/rules`, `game/systems` (world sintético), `ui/components` (Testing Library + jsdom), `tools/*` | pre-push, CI | cobertura ≥ 80% linhas em `packages/game` e `packages/core`; ≥ 60% em `ui` |
| Integration | Vitest (Node) | run completa sem render (10 rounds), determinismo, save round-trip + migrações, loja/level-up/Ossuário com fixtures, chunk streaming | CI | todos verdes |
| Balance | `tools/sim` (Node) | 500 runs simuladas por dificuldade; asserts de GDD §25 | CI (job separado, 10 min) | dentro das faixas |
| Visual | Playwright `toHaveScreenshot` | telas do design system nos 4 viewports (D31) | CI em PR de UI | diff ≤ 1% |
| E2E | Playwright (Chromium, WebGL via SwiftShader) | fluxo título → run → morte (cheat) → resultado → Ossuário; demo end; opções | CI | verdes; < 5 min |
| Smoke | Playwright (`tools/smoke/run.ts`, `bun run test:smoke -- --url <url>`) | abre a URL, espera `window.gc.ready`, tira screenshot (`reports/smoke.png`), lê o console | CI pós-deploy de produção (`deploy-web.yml`) e manual | `gc.ready`, 0 erros de console (fps fica no bench, SDD 14 §4) |
| Performance | script Playwright + `engine.getFps()` + `scene.getActiveMeshes()` | cenário "100 inimigos, round 20" em 1080p/1440p; mobile em device real (manual) | CI (desktop, informativo) e checklist de fase | SDD 14 |
| Manual | checklist por fase no ROADMAP | gamepad, Steam overlay, Android device | fim de fase | — |

## 2. Configuração

- `vitest.config.ts` (Vitest 5; `environmentMatchGlobs` foi removido no Vitest 4): `projects` `unit` (Node: core, game, render, platform, `tools/**`), `unit-ui` (jsdom: `packages/ui`) e `integration` (Node: `tests/integration`); `coverage.provider: "istanbul"` (v8 não funciona sob Bun), reporters `text` e `json-summary`, thresholds iniciais 0 (meta: ≥ 80% de linhas em `game` e `core`, ≥ 60% em `ui`). No CI, `vitest run --project "unit*"` cobre `unit` e `unit-ui`.
- `playwright.config.ts`: projeto `chromium` com `launchOptions.args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]` (flags do Chromium; validadas no PROTÓTIPO com `gl.getParameter(RENDERER)`), 4 projetos de viewport (`desktop-1080`, `desktop-1440`, `mobile-l` 896×414 com `isMobile: true, hasTouch: true`, `mobile-s` 800×360), `webServer` apontando para `vite preview`.
- Emenda E-05-05 (validação do e2e e do Biome, 2026-10-31):
  - **WebGL em CI.** O e2e (`tests/e2e/boot.spec.ts`) roda igual no Windows e no container `mcr.microsoft.com/playwright:v1.64.1-noble` com as flags SwiftShader acima. `gl.getParameter(gl.RENDERER)` devolve sempre `"WebKit WebGL"`, porque o Chromium mascara o renderer para reduzir fingerprinting. O valor real vem da extensão `WEBGL_debug_renderer_info`: `UNMASKED_RENDERER_WEBGL` = `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. O teste valida `/swiftshader|angle/i` nesse valor e o registra como annotation `gl-renderer` no `playwright-report/` (`console.log` é proibido pelo lint).
  - **Capturas.** O antialiasing de texto difere entre Windows e Linux, então há uma baseline por sistema: `snapshotPathTemplate` = `tests/visual/__screenshots__/{arg}-{platform}{ext}` (`boot-<alvo>-win32.png`, `boot-<alvo>-linux.png`). As `-win32` são geradas localmente; as `-linux` vêm do container (`.github/workflows/update-snapshots.yml`, `workflow_dispatch`, sobe os PNG como artefato `linux-snapshots`). Tolerância: `maxDiffPixels: 100` e `threshold: 0.2` (substitui o `maxDiffPixelRatio: 0.02` inicial). Cada alvo tem 2 capturas: `boot-<alvo>` (página inteira) e `ui-<alvo>` (só a UI: o `canvas#game` é escondido com `stylePath` `tests/e2e/hide-canvas.css`, porque uma `mask` também cobriria o HUD que está desenhado sobre o canvas) com `maxDiffPixels: 0`. O `mobile-s` também usa `isMobile` e `hasTouch`.
  - **Container e Bun.** A imagem Playwright não tem `unzip`, que o `setup-bun` exige; os jobs em container instalam o Bun com `npm install -g bun@1.4.4`.
  - **Porta do preview.** O `webServer` usa a porta 4273 e `reuseExistingServer: false`: com a porta padrão 4173 e reuso, um `vite preview` de outro worktree respondia no lugar do build do teste (HUD diferente, milhares de pixels de diferença). Se a porta estiver ocupada, o Playwright agora falha em vez de testar o servidor errado.
  - **Biome e `.editorconfig`.** Biome 2.6.4 não tem `format --check` (o comando `biome format` já só verifica; `--write` aplica) e **não lê o `.editorconfig` por padrão**: só com `formatter.useEditorconfig: true`. Medido em um diretório isolado: sem chaves de formatação e sem `.editorconfig`, o padrão do Biome é tab (largura 2); com `.editorconfig` de espaços e sem `useEditorconfig`, ele é ignorado; com `useEditorconfig: true` ele é seguido. No repositório, `biome.json` fixa `indentStyle: "tab"`, `indentWidth: 4`, `lineWidth: 110`; por isso `biome format .` dá o mesmo resultado (183 arquivos, nenhum ajuste) com e sem o `.editorconfig`. Decisão: `biome.json` é a fonte de verdade do formato; o `.editorconfig` serve a editores e a arquivos que o Biome não formata (YAML, Markdown). Nenhuma mudança no ADR-0019 por este item.
  - **Pendência de ADR.** O smoke pós-deploy usa Playwright, não agent-browser (ver ADR-0019, emenda).
- Cheats de teste (só quando `__DEBUG_API__` é verdadeiro, ou seja, build com `GC_DEBUG_API=1`; o build de release e o de produção o deixam falso): `window.gc.debug.{killHero, skipRound, giveGold, spawn(type, n), setSeed}` expostos para E2E; proibidos no bundle de release (assert no build: string `gc.debug` ausente).
- Determinismo: `tests/integration/determinism.test.ts` roda a seed 42 por 3.600 passos duas vezes e compara `hashWorld(world)`; roda também com `STEP` dividido (2 × 1/120) para garantir que a lógica não depende de dt (deve divergir e o teste documenta que é esperado; serve de alerta se alguém tentar variar dt).

## 3. Lint e formatação

- Biome 2 (`biome.json`): `formatter: { indentStyle: "tab", indentWidth: 4, lineWidth: 110 }`; `linter.rules.preset: "recommended"` (`recommended: true` está obsoleto no Biome 2.6) + `suspicious.noExplicitAny: error`, `correctness.noUnusedImports: error`, `nursery/project`: `noFloatingPromises`, `noImportCycles`, `noUnresolvedImports`; `noRestrictedImports` para camadas (SDD 01 §2) por override de pacote, barrel `@babylonjs/core` proibido (só subcaminhos) e `Math.random` em `packages/game` (plugin GritQL `tools/biome/no-math-random.grit`, porque `noRestrictedGlobals` não pega acesso a membro); `vcs.useIgnoreFile: true`; `files.ignore: ["public/assets/**", "apps/android/**", "release/**"]`.
- TypeScript 7: `bun run typecheck` = `bun check -b` (type checker nativo do Bun 1.4.4: mesmos erros do `tsc -b`, multithread, segue `references`); `tsc -b` continua válido como referência. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck: true` (os `.d.ts` do Babylon 9.33.1 quebram com `exactOptionalPropertyTypes`, TS2416), `types: ["bun", "vitest/globals"]`.
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
