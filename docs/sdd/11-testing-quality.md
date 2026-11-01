# SDD 11 — Testes e qualidade

Ferramentas (versões em `docs/web-search.md` §5.1): Vitest 5.0.5, Playwright 1.64.1; smoke também em Playwright (agent-browser descartado, ADR-0019 emendado), Biome 2.6.4, markdownlint-cli2 0.24.0, lefthook 2.2.2, TypeScript 7.0.2.

## 1. Pirâmide

| Nível | Ferramenta | Escopo | Onde roda | Meta |
| --- | --- | --- | --- | --- |
| Unit | Vitest (Node) | `core`, `game/rules`, `game/systems` (world sintético), `ui/components` (Testing Library + jsdom), `tools/*` | pre-push, CI | cobertura ≥ 80% linhas em `packages/game` e `packages/core`; ≥ 60% em `ui` |
| Integration | Vitest (Node) | run completa sem render (10 rounds), determinismo, save round-trip + migrações, loja/level-up/Ossuário com fixtures, chunk streaming | CI | todos verdes |
| Balance | `tools/sim` (Node) | 500 runs simuladas por dificuldade; asserts de GDD §25 | CI (job separado, 10 min) | dentro das faixas; `bun run sim --runs 500 --rounds 30 --check` roda de verdade e o relatório de fechamento da A-02-03 está em `reports/balance-a0203-final.json` (`reports/sim-*.json` é ignorado pelo git e pelo Biome) |
| Visual | Playwright `toHaveScreenshot` | telas nos 4 viewports (D31), dentro dos specs e2e | CI (job e2e) | tolerância do `playwright.config.ts` (hoje `maxDiffPixelRatio` 0,02; redução com o Est) |
| E2E | Playwright (Chromium, WebGL via SwiftShader) | hoje: boot, level-up, loja, resultados, save-safety, elite/baú, fade, mundo, revisão de arte (`tests/e2e/*.spec.ts`); alvo: título → run → morte (cheat) → resultado → Ossuário; demo end; opções | CI | verdes; < 5 min |
| Smoke | Playwright (`tools/smoke`) | abre a URL, espera `window.gc.ready`, tira screenshot (`reports/smoke.png`), falha com erro de console, `x-vercel-protection-bypass` só na mesma origem | CI pós-deploy de produção (`deploy-web.yml`) e manual | 0 erros de console (a medição de fps no smoke é provisória; o fps vem do bench) |
| Performance | `tools/perf` (Playwright, recorder em `engine.onEndFrameObservable`) | `?bench=horde100` e `?bench=round20` em 1080p/1440p; mobile em device real (manual) | manual (`bun run test:perf`), CI provisório até A-01-03 | SDD 14 |
| Manual | checklist por fase no ROADMAP | gamepad, Steam overlay, Android device | fim de fase | — |

## 2. Configuração

- `vitest.config.ts` (Vitest 5; `environmentMatchGlobs` foi removido no Vitest 4): `projects` `unit` (Node: core, game, render, platform, `tools/**`), `unit-ui` (jsdom: `packages/ui`) e `integration` (Node: `tests/integration`); `coverage.provider: "istanbul"` (v8 não funciona sob Bun), reporters `text` e `json-summary`, thresholds iniciais 0 (meta: ≥ 80% de linhas em `game` e `core`, ≥ 60% em `ui`). No CI, `vitest run --project "unit*"` cobre `unit` e `unit-ui`.
- `playwright.config.ts`: `launchOptions.args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]` (flags do Chromium; o boot spec registra o renderer desmascarado como annotation), 4 projetos de viewport (`desktop-1080`, `desktop-1440`, `mobile-l` 896×414 com `isMobile: true, hasTouch: true`, `mobile-s` 800×360), `workers: 1` (SwiftShader é pesado demais em paralelo), `retries` 1 no CI, reporters `list` e `html` (`playwright-report/`), `snapshotPathTemplate` `tests/visual/__screenshots__/{arg}{ext}`, `webServer` com `vite preview` na porta `GC_E2E_PORT` (padrão 4173, para worktrees paralelos não reaproveitarem o servidor de outro). Provisórios até a correção do Est: baselines por plataforma (`{platform}` no template), `maxDiffPixels` + máscara do canvas no lugar de `maxDiffPixelRatio` 0,02, e `mobile-s` com `isMobile/hasTouch`. O bench tem config própria (`tools/perf/playwright.config.ts`, porta 4174).
- Biome e `.editorconfig` (E-05-05): o Biome 2.6.4 não tem `format --check`; `biome format .` respeita tab 4 com e sem `.editorconfig`, porque `biome.json` fixa `indentStyle: tab` e `indentWidth: 4` e o Biome só lê o `.editorconfig` com `formatter.useEditorconfig: true` (desligado). O `.editorconfig` serve aos editores.
- Soak no navegador (R-01-02): `?bench=soak&runs=10&rounds=60&seed=1&speed=1` num build de debug. O bot greedy (`packages/game/src/bot`, o mesmo do simulador, com `unstick` ligado) joga runs inteiras com o herói imortal, uma carga de página por run (o relatório fica no `sessionStorage`; `reset=1` recomeça). Grava por run fps médio e 1% pior, p50/p99/máximo do tempo de frame, heap (`performance.memory`, só Chrome; use `--enable-precise-memory-info` para valores finos), rounds, passos, e uma lista de erros (`error` e `unhandledrejection`). `gc.debug.soak.report()` devolve o relatório e `download()` baixa `soak-report.json`, que também baixa sozinho ao fim. A aba precisa ficar visível (uma aba oculta pausa a simulação). O relatório headless com SwiftShader não vale como medida de GPU.
- Gamepad virtual (B-04-02): com `?gamepad=1` num build de debug, `window.gc.debug.gamepad` troca `navigator.getGamepads` por um pad de mapeamento padrão com `connect`, `disconnect`, `press`, `release`, `tap(botão, ms)`, `setAxis(eixo, valor)`, `reset` e `state`. Funciona com ou sem `?debug` (que pula o menu). O e2e `tests/e2e/gamepad-nav.spec.ts` percorre menu, slots, dificuldade e pausa só com ele (fica no repositório, fora do CI). Cada recarga da página desconecta o pad.
- Cheats de teste (só quando `__DEBUG_API__` é verdadeiro, ou seja, build com `GC_DEBUG_API=1`; o build de release e o de produção o deixam falso): hoje `window.gc.debug.{hero, state, grantXp, grantGold, endRound, spawnElite, killElites, killHero}`, mais `bench` e `saveNotice` quando aplicável, ativados por `?debug=1`. O alvo também inclui `skipRound`, `spawn(type, n)` e `setSeed` (a seed hoje vem de `?seed=`). São proibidos no bundle de release (assert: string `gc.debug` ausente no `dist` sem `GC_DEBUG_API`).
- Determinismo (provisório até P-07-03: o teste ainda não existe; o único teste em `tests/integration` hoje é um smoke): `tests/integration/determinism.test.ts` roda a seed 42 por 3.600 passos duas vezes e compara `hashWorld(world)`; roda também com `STEP` dividido (2 × 1/120) para garantir que a lógica não depende de dt (deve divergir e o teste documenta que é esperado; serve de alerta se alguém tentar variar dt).

## 3. Lint e formatação

- Biome 2 (`biome.json`): `formatter: { indentStyle: "tab", indentWidth: 4, lineWidth: 110 }`; `linter.rules.preset: "recommended"` (`recommended: true` está obsoleto no Biome 2.6) + `suspicious.noExplicitAny: error`, `correctness.noUnusedImports: error`, `nursery/project`: `noFloatingPromises`, `noImportCycles`, `noUnresolvedImports`; `noRestrictedImports` para camadas (SDD 01 §2) por override de pacote, barrel `@babylonjs/core` proibido (só subcaminhos) e `Math.random` em `packages/game` (plugin GritQL `tools/biome/no-math-random.grit`, porque `noRestrictedGlobals` não pega acesso a membro); `vcs.useIgnoreFile: true`; `files.includes` com `**/*.{ts,tsx,js,mjs,json,jsonc,css}` menos `public/assets`, `apps/android`, `release` e `bun.lock`.
- TypeScript 7: `bun run typecheck` = `bun check -b` (type checker nativo do Bun 1.4.4: mesmos erros do `tsc -b`, multithread, segue `references`); `tsc -b` continua válido como referência. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck: true` (os `.d.ts` do Babylon 9.33.1 quebram com `exactOptionalPropertyTypes`, TS2416), `types: ["bun"]` na base (`vitest/globals` saiu: os testes importam de `vitest` e `globals` está desligado; `apps/web` usa `types: ["vite/client"]`). Projetos: os 5 pacotes, `apps/web` e `tools` (8 com o `tests`). `packages/game` tem `rootDir: "../.."` e `resolveJsonModule` para os loaders de `data/*.json` (SDD 05).
- markdownlint-cli2: `.markdownlint-cli2.jsonc` da raiz (MD013 off, MD033 off, MD024 siblings, MD010 fora de código).
- Regra extra (script `tools/lint-extra`): proíbe hex literal em `packages/ui/**/*.tsx`, proíbe `console.log` fora de `core/logger` (em `packages/**` e `apps/**`), proíbe `^`/`~` nos campos de dependência dos `package.json` (raiz, `apps/*`, `packages/*`; `engines` pode ter `>=`). A regra contra texto fixo em TSX é provisória até A-07-01.

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

`tools/secrets-scan`: regex para chaves com formato real (`sk_` com ≥ 20 caracteres, inclusive `sk_live_`/`sk_test_`; `ELEVENLABS_API_KEY=` com valor de ≥ 20; header `xi-api-key` com literal; `ghp_`/`github_pat_`; `AKIA…`; PEM de chave privada) nos arquivos staged; bloqueia o commit sem imprimir o valor. Placeholders, comparações e headers vindos de variável não disparam. O hook lê o arquivo do disco, não o conteúdo staged (limite conhecido). `tools/commitlint`: valida `type(scope)!: description` com tipos `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert` (sem dependência).

## 5. Definition of Done (por tarefa)

1. Asserts da microtarefa do ROADMAP passam (comando citado na tarefa).
2. `bun run lint`, `bun run lint:md`, `bun run typecheck` limpos.
3. Testes novos para lógica nova (regra, sistema, componente); `bun run test` verde; cobertura não cai.
4. Se tocou UI: capturas visuais atualizadas e revisadas nos 4 alvos.
5. Se tocou `data/*.json`: `bun run sim` dentro das faixas.
6. Docs afetadas atualizadas (SDD/GDD/ADR) e `CHANGELOG.md` `[Unreleased]`.
7. Commit em Conventional Commits; PR com descrição, capturas e link para a tarefa do ROADMAP.

## 6. Testes de aloc e de locale

- Sistemas por passo (`separation`, `behavior`, `breakables`) têm teste de zero alocação: espiam `Array.prototype.filter/map/slice`, `Array`, `Float32Array`, `Map` e `Set` durante 100 passos depois de aquecer (`packages/game/src/systems/alloc.test.ts`, `breakables.test.ts`).
- Componentes de UI com texto têm teste no locale `en` (`locale-en.test.tsx`): `setLocale("en")` por teste e volta para `pt-BR` no `afterEach`; o setup `tests/setup/i18n.ts` registra os dois catálogos.
- Um chefe montado só por data (`line_charge` + `mud_pool`) roda o ciclo comum de padrões em `boss.test.ts` (A-03-00).
- `tools/data-check` (`bun run data:check`) valida cada `data/*.json` contra `data/schema/*.schema.json` e aplica regras cruzadas que o schema não expressa (`tools/data-check/rules.ts`): props de bioma com o `kind` certo, `unloadRadius > loadRadius`, `unlockRound` e projétil das armas, tiers duplicados e dificuldades que dependem de dificuldade inexistente, `doubleCard.bonuses` menor que o número de cartas, chefe só em round múltiplo de 10 e sem round repetido. `checkAssets` confere que modelos, ícones e `music` de bioma apontam para arquivos/entradas existentes (`models/<categoria>/<id>.bbmodel`, `audio/prompts.json`). O auto-teste cobre cada caso negativo.
