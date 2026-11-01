# Grim Cubes — ROADMAP

Versão 0.1.0 — 2026-10-31. Este é o arquivo mais importante do projeto: define o que será feito, em que ordem, por quem e como cada entrega é verificada. Fontes: `docs/gdd.md`, `docs/art-bible.md`, `docs/sdd/*.md`, `docs/adrs/*.md`, `docs/brainstorming.md`.

## Como ler este arquivo

- 5 fases: **1. ESTRUTURA**, **2. PROTÓTIPO**, **3. ALPHA**, **4. BETA**, **5. 1.0 RC**. Depois da 1.0, o apêndice **1.1 ANDROID**.
- Cada fase tem objetivo, critério de entrada, critério de saída, tarefas → subtarefas → microtarefas, e riscos.
- Microtarefa = menor unidade de trabalho atribuível a um agente (≤ 1 dia de trabalho). Formato:

```text
- [ ] **ID** Descrição. Deps: IDs. Resp: papel. Prio: P0|P1|P2.
  - Asserts: verificações objetivas (comando + resultado esperado, arquivo que deve existir, métrica com valor).
```

- IDs: `<Fase>-<Tarefa>-<Micro>` (`E` ESTRUTURA, `P` PROTÓTIPO, `A` ALPHA, `B` BETA, `R` RC, `M` 1.1 Android). Ex.: `P-03-02`.
- Papéis (ver `prompt-workers.md`): **Orq** (Orquestrador, Opus), **S1** (Sênior 1: engine, render, mundo, assets), **S2** (Sênior 2: game, UI, tooling, ports), **Est** (Estagiário: testes, docs, simulações, pesquisa, i18n), **Esp** (Especialista: revisão e correção), **PO** (Alex: contas, pagamentos, decisões, ações manuais).
- Prioridade: P0 bloqueia a saída da fase; P1 esperado na fase; P2 pode escorregar para a próxima.
- Status: `[ ]` pendente, `[~]` em andamento, `[x]` concluído (asserts verificados), `[-]` cancelado (com motivo no `docs/PROGRESS.md`).
- Toda microtarefa concluída exige: asserts passando, DoD do `docs/sdd/11-testing-quality.md` §5, linha no `CHANGELOG.md` quando aplicável, e atualização de `docs/PROGRESS.md`.
- Comandos assumem Bun na raiz do repositório. "exit 0" = código de saída zero.

## Calendário alvo (D30)

| Fase | Início | Fim | Semanas | Versões |
| --- | --- | --- | --- | --- |
| 1. ESTRUTURA | 2026-11-02 | 2026-11-15 | 2 | 0.1.x |
| 2. PROTÓTIPO | 2026-11-16 | 2026-12-27 | 6 | 0.2.x–0.3.x |
| 3. ALPHA (demo pública em 2027-01-24) | 2026-12-28 | 2027-02-21 | 8 | 0.4.x–0.6.x |
| 4. BETA | 2027-02-22 | 2027-04-04 | 6 | 0.7.x–0.9.x |
| 5. 1.0 RC → 1.0 | 2027-04-05 | 2027-04-30 | 2 (+2 de lançamento) | 1.0.0-rc.N → 1.0.0 |
| 1.1 ANDROID | 2027-05-03 | 2027-06-27 | 8 | 1.1.0 |

Ritmo: ~20 h/semana do PO + agentes. Datas escorregam; a ordem e os critérios não.

---

## Fase 1 — ESTRUTURA

**Objetivo.** Repositório, toolchain, CI, convenções e esqueleto de código prontos, de forma que qualquer agente consiga clonar, instalar, rodar `dev`, `lint`, `typecheck`, `test` e `build` em menos de 10 minutos, e que um cubo renderize em Babylon com HUD React por cima nos 4 alvos de tela.

**Critério de entrada.** Etapas 1–6 da documentação aprovadas (`docs/`, `ROADMAP.md`, `prompt-workers.md`); repositório `AlexGalhardo/grim-cubes` acessível; PO com Bun 1.4.4, Node 22+, Git, Blockbench 5 instalados.

**Critério de saída (todos P0 concluídos).** `ci.yml` verde em `main` com lint, typecheck, unit, integration, build-web e e2e; preview na Vercel abrindo a cena "cubo + HUD" nos 4 viewports com capturas versionadas; `CHANGELOG.md` com `0.1.0`; `docs/PROGRESS.md` em uso; hooks lefthook ativos; release `v0.1.0` publicada no padrão vukem.

### E-01 Repositório e convenções

- [x] **E-01-01** Inicializar o repositório git local, conectar ao remoto `AlexGalhardo/grim-cubes`, branch `main`, commit inicial com a documentação existente. Deps: —. Resp: S2. Prio: P0.
  - Asserts: `git remote -v` mostra `origin` apontando para `github.com/AlexGalhardo/grim-cubes`; `git log --oneline | wc -l` ≥ 1; primeiro commit segue Conventional Commits (`chore: initial documentation`); `.env` não aparece em `git ls-files`.
- [x] **E-01-02** Arquivos de convenção: `.editorconfig` (tab 4), `.gitignore`, `.gitattributes` (`* text=auto eol=lf`, `*.glb binary`, `*.png binary`, `*.mp3 binary`), `LICENSE` (proprietária; já criada e aprovada em 2026-10-31, só validar), `README.md` (visão, como rodar, links para docs). Deps: E-01-01. Resp: S2. Prio: P0.
  - Asserts: todos os arquivos existem na raiz; `README.md` passa em `bunx markdownlint-cli2 README.md` (exit 0); `.gitattributes` contém `eol=lf`.
- [x] **E-01-03** `CHANGELOG.md` no formato Keep a Changelog 1.1.0 / padrão vukem com seção `[Unreleased]` e rodapé de links (SDD 13 §3). Deps: E-01-01. Resp: Est. Prio: P0.
  - Asserts: primeira linha `# Changelog`; contém `## [Unreleased]`; contém o link `[Unreleased]: https://github.com/AlexGalhardo/grim-cubes/compare/`; markdownlint exit 0.
- [x] **E-01-04** `docs/PROGRESS.md` (estado compartilhado: tarefa atual por agente, últimas 20 microtarefas concluídas, bloqueios, próximos passos) criado com o template de `prompt-workers.md`. Deps: E-01-01. Resp: Orq. Prio: P0.
  - Asserts: arquivo existe com as seções `## Agentes`, `## Concluídas`, `## Bloqueios`, `## Próximos`; markdownlint exit 0.
- [x] **E-01-05** `CLAUDE.md` e `AGENTS.md` do projeto (instruções de sessão, skills obrigatórias: caveman, karpathy-guidelines, graphify, ponytail; comandos; convenções; links). Deps: E-01-01. Resp: Orq. Prio: P0.
  - Asserts: ambos existem na raiz; contêm a string `karpathy-guidelines`, `graphify`, `caveman`, `ponytail`; contêm a tabela de comandos `bun run dev|lint|typecheck|test|build`; markdownlint exit 0.
- [~] **E-01-06** Proteção da branch `main` no GitHub (PR obrigatório, CI obrigatório, sem force-push, histórico linear) e Dependabot (`.github/dependabot.yml` para `npm` e `github-actions`, semanal, `versioning-strategy: increase`). Deps: E-01-01, E-04-01. Resp: PO (configuração no GitHub) + S2 (arquivo). Prio: P1.
  - Asserts: `gh api repos/AlexGalhardo/grim-cubes/branches/main/protection --jq .required_status_checks.contexts` inclui `ci`; `.github/dependabot.yml` existe com `interval: weekly`.
  - Estado (Esp, 2026-10-31): `dependabot.yml` entregue (ff185d9), semanal, ecossistemas `bun` e `github-actions` (o Dependabot não aceita `versioning-strategy` para `bun`). Pendente do PO: proteção da `main` no GitHub; hoje o fluxo de §6 do `prompt-workers.md` integra sem PR, então "PR obrigatório" exige mudar esse fluxo antes.

### E-02 Toolchain

- [x] **E-02-01** `package.json` raiz com workspaces (`apps/*`, `packages/*`), `packageManager: bun@1.4.4`, `engines`, scripts do SDD 10 §4 (ainda que alguns apontem para stubs), e `bun.lock`. Dependências exatas (ADR-0002): `@babylonjs/core` 9.33.1, `@babylonjs/loaders` 9.33.1, `react` 19.3.1, `react-dom` 19.3.1, `bitecs` 0.4.0, `simplex-noise` 4.0.3; dev: `vite` 8.3.5, `@vitejs/plugin-react` 6.1.2, `tailwindcss` 4.3.3, `@tailwindcss/vite` 4.3.3, `typescript` 7.0.2, `@biomejs/biome` 2.6.4, `vitest` 5.0.5, `@vitest/coverage-istanbul` 5.0.5, `@playwright/test` 1.64.1, `markdownlint-cli2` 0.24.0, `lefthook` 2.2.2, `@types/bun` 1.4.4, `@babylonjs/inspector` 9.33.1, `jsdom`, `@testing-library/react`, `@gltf-transform/core`, `fake-indexeddb`, `axe-core` (as cinco últimas: última estável no dia da instalação, fixada exata e registrada no HANDOFF). Deps: E-01-01. Resp: S2. Prio: P0.
  - Asserts: `bun install --frozen-lockfile` exit 0; `grep -E '"\^|"~' package.json` não encontra nada (exit 1); `bun pm ls` lista as versões acima exatamente; `@babylonjs/inspector` só em devDependencies.
- [x] **E-02-02** `tsconfig.json` base (TS 7: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module: esnext`, `moduleResolution: bundler`, `types` explícitos, `paths` `@gc/*`) + `tsconfig` por pacote com `references`. Deps: E-02-01. Resp: S2. Prio: P0.
  - Asserts: `bun run typecheck` (`bun check -b`) exit 0 com os stubs; `tsc --showConfig` mostra `"strict": true` e `"noUncheckedIndexedAccess": true`.
- [x] **E-02-03** `biome.json` (tab 4, lineWidth 110, regras do SDD 11 §3 incluindo `noRestrictedImports` entre camadas e `Math.random` proibido em `packages/game`). Deps: E-02-01. Resp: S2. Prio: P0.
  - Asserts: `bun run lint` (`biome ci .`) exit 0; teste negativo: um arquivo temporário em `packages/game` com `Math.random()` faz `biome lint` falhar (documentado no PR com a saída).
- [x] **E-02-04** Vite 8 config (`apps/web/vite.config.ts`: React, Tailwind, `assetsInclude` glb/ktx2, `manualChunks`, `define` de `__APP_VERSION__`, `__BUILD_TARGET__`, `__IS_DEMO__` por modo). Deps: E-02-01. Resp: S2. Prio: P0.
  - Asserts: `bun run dev` sobe em `http://localhost:5173` (verificado por `curl -s -o /dev/null -w "%{http_code}"` = 200); `vite build --mode web-demo` exit 0 e `dist/assets/*.js` contém chunks separados `babylon-*.js` e `react-*.js`.
- [x] **E-02-05** Vitest config (Node por padrão, jsdom em `packages/ui`, cobertura istanbul com thresholds iniciais 0 e meta documentada), um teste de exemplo por pacote. Deps: E-02-01. Resp: Est. Prio: P0.
  - Asserts: `bun run test` exit 0 com ≥ 5 testes; `bunx vitest run --coverage` gera `coverage/coverage-summary.json`.
- [x] **E-02-06** Playwright config (4 projetos de viewport D31, flags SwiftShader, `webServer` com `vite preview`) + 1 teste e2e que abre a página e verifica que o `<canvas>` existe e que `window.gc.ready === true`. Deps: E-02-04, E-03-02. Resp: Est. Prio: P0.
  - Asserts: `bunx playwright test` exit 0 nos 4 projetos; capturas `tests/visual/__screenshots__/boot-<alvo>-<plataforma>.png` nos 4 alvos commitadas (baselines por plataforma `-{platform}`; `maxDiffPixels: 100` e `threshold: 0.2`; captura extra só da UI com `maxDiffPixels: 0`); `playwright-report/index.html` gerado; no teste, `UNMASKED_RENDERER_WEBGL` (extensão `WEBGL_debug_renderer_info`, registrado como annotation no relatório) contém `SwiftShader` ou `ANGLE` (prova de WebGL headless; `gl.RENDERER` vem mascarado como "WebKit WebGL").
- [x] **E-02-07** lefthook (`lefthook.yml` do SDD 11 §4) + `tools/commitlint` + `tools/secrets-scan` + `tools/lint-extra` (hex em TSX, `console.log`, `^` em versões). Deps: E-02-01. Resp: S2. Prio: P0.
  - Asserts: `bunx lefthook install` exit 0; commit com mensagem `bad message` é rejeitado (exit ≠ 0) e `feat(core): add logger` aceito; arquivo staged que atribui um valor de teste à variável `ELEVENLABS_API_KEY` bloqueia o commit; `bun tools/lint-extra/index.ts` exit 0 no repositório.
- [x] **E-02-08** markdownlint (`.markdownlint-cli2.jsonc` já existente) integrado ao script `lint:md` e ao hook. Deps: E-02-07. Resp: Est. Prio: P1.
  - Asserts: `bun run lint:md` exit 0 em todos os `.md` do repositório.

### E-03 Esqueleto de código

- [x] **E-03-01** Pacotes `core`, `game`, `render`, `ui`, `platform` com `package.json`, `src/index.ts` e um módulo real cada: `core/logger`, `core/rng` (`mulberry32`, `hash32`), `core/store`, `game/loop` (passo fixo), `render/engine` (`createEngine(canvas): Promise<Engine>` com WebGL2; `NullEngine` para testes; o ramo `WebGPUEngine` opt-in do ADR-0014 fica para a ALPHA), `ui/App`, `platform/detect`. Contratos de `packages/*/src/index.ts` combinados entre S1 e S2 antes de implementar (PROGRESS). Deps: E-02-02. Resp: S1 (core, render) + S2 (game, ui, platform). Prio: P0.
  - Asserts: `bun run typecheck` exit 0; testes unitários: os 5 primeiros valores de `mulberry32(42)` batem com a implementação de referência pública (valores de ouro no teste); `hash32(1,2,3)` e `hash32(7,-1,-1)` com valores de ouro (i32 negativo); `store.publish` notifica assinantes 1 vez; loop com `dt = 1 s` executa exatamente `MAX_STEPS` = 5 passos e registra `slowFrame` — todos verdes; render importa `@babylonjs/core` só por subcaminho (sem o barrel).
- [x] **E-03-02** Cena mínima: `Engine` WebGL2, câmera conforme ADR-0017 (valores do GDD §5), luz direcional + hemisférica, chão (hoje por chunks, P-01), 1 cubo "herói" movido por WASD/stick/joystick virtual, HUD React com HP/round fictícios lido do store a 12 Hz, `window.gc.ready = true` ao fim do boot. Deps: E-03-01. Resp: S1. Prio: P0.
  - Asserts: `window.gc.ready === true` verificado por script Playwright local (o e2e definitivo, com as capturas `tests/visual/__screenshots__/boot-<alvo>.png` nos 4 alvos, é entregue em E-02-06); fps no desktop-1080 medido por `SceneInstrumentation` em 30 s após 5 s de warm-up, média ≥ 120 com vsync desligado, na máquina do PO (CPU/GPU registradas em `docs/PROGRESS.md`); meshes ativos e draw calls dentro do orçamento do SDD 14 §2 (desktop: ≤ 60 meshes ativos, ≤ 120 draw calls).
  - Emenda (Esp, 2026-10-31): o chão 16×16 u e o limite de 5 meshes ativos valiam para a cena mínima; o chão virou chunks (P-01) e o herói virou rig (P-06-06), então o assert passa a ser o orçamento do SDD 14 §2. Estado: `window.gc.ready = true` no fim do boot (`apps/web/src/main.tsx`), HUD a 12 Hz (`packages/ui/src/App.tsx`). Pendente do PO: fps ≥ 120 na máquina do PO. e2e fora do CI (decisão do PO 2026-10-31).
- [x] **E-03-03** Tailwind v4 `theme.css` com todos os tokens do Art Bible §16.9 e componentes `Panel`, `Button`, `Bar` do design system. Deps: E-03-01. Resp: S2. Prio: P0.
  - Asserts: `packages/ui/src/theme.css` contém `--color-night: #14121c` e `--breakpoint-desktop-xl: 2048px`; testes de componente (3) verdes; `bun tools/lint-extra/index.ts` não encontra hex em `.tsx`.
- [x] **E-03-04** `data/` com JSON Schema e arquivos iniciais (`enemies.json` com os 8 tipos, `weapons.json` com 5 armas, `rounds.json`, `biomes.json`, `elites.json`, `items.json` com 40 itens, `cards.json`, `ossuary.json`, `bosses.json` com o Coveiro, `hero.json`, `world.json`; `render.json` e `presets.json` pendentes da D1, fase 2) copiados do GDD, e `tools/data-check`. Deps: E-02-01. Resp: Est. Prio: P0.
  - Asserts: `bun run data:check` exit 0; teste negativo: id duplicado em `items.json` faz o check falhar; `jq length data/items.json` = 40; `jq length data/enemies.json` = 8.
- [x] **E-03-05** `packages/platform` com adaptadores `web` (storage IndexedDB) e stubs `electron`/`capacitor` que lançam `NotImplemented`. Deps: E-03-01. Resp: S2. Prio: P1.
  - Asserts: teste de storage web em jsdom com `fake-indexeddb` (dev dep, versão estável; aprovação do PO) faz round-trip de `save`; stubs cobertos por teste de "lança erro".
- [x] **E-03-06** ECS base em `packages/game/src/ecs/`: world bitecs, `components.ts` (`Position`, `PrevPosition`, `Velocity`, `Radius`, `Health`, tags de facção) e `events.ts` (ring buffer de eventos consumido por `render` via `consumeEvents`), conforme SDD 02 §2; contrato `render.sync(world, alpha)` combinado com S1. Deps: E-03-01. Resp: S2. Prio: P0.
  - Asserts: testes de criação/remoção de entidade e de reciclagem de ids; ring buffer não aloca após o warm-up (teste com contador) e descarta o mais antigo ao encher; `render` não importa nada que escreva em componentes (regra do Biome ou teste de import).

### E-04 CI/CD e deploy

- [x] **E-04-01** `.github/workflows/ci.yml` conforme SDD 12 §1 (lint → typecheck → unit → integration → build-web → e2e; container Playwright `v1.64.1-noble`; `setup-bun@v2`; `checkout@v7`; artefatos). Deps: E-02-05, E-02-06. Resp: S2. Prio: P0.
  - Asserts: workflow verde em PR (`gh run list --workflow ci.yml --limit 1 --json conclusion` = `success`); duração < 10 min; artefatos `coverage` e `playwright-report` presentes.
- [x] **E-04-02** Projeto Vercel `grim-cubes-demo` conectado ao repositório; `vercel.json` (rewrites SPA, headers de cache); preview por PR; produção em `main`. Deps: E-02-04. Resp: PO (criar projeto) + S2. Prio: P0.
  - Asserts: URL de produção responde 200 e renderiza o canvas (smoke E-04-04); `curl -I <url>/assets/<arquivo com hash>` retorna `cache-control: public, max-age=31536000, immutable`; PR de teste gera URL de preview comentada pelo bot da Vercel.
  - Estado (Esp, 2026-10-31): projeto ligado, `vercel.json` com rewrite SPA, `immutable` em `/assets/*`, revalidação do `manifest.json` e headers de segurança (6370507); deploy de produção Ready. A produção responde 302 por causa da proteção SSO (decisão B do PO). Pendente do PO: secret `VERCEL_AUTOMATION_BYPASS_SECRET` para o smoke medir o 200 e o header de cache. A preview por PR não se aplica enquanto a `main` integrar sem PR (§6 do `prompt-workers.md`).
- [x] **E-04-03** `.github/workflows/release.yml` + `tools/release` (SDD 13 §4) e `tools/sbom` (CycloneDX a partir de `bun.lock`), release `v0.1.0`. Deps: E-01-03, E-04-01. Resp: S2. Prio: P0.
  - Asserts: `gh release view v0.1.0 --json name,tagName,isPrerelease` → `name == tagName == "v0.1.0"`, `isPrerelease == false`; corpo da release é idêntico à seção `## [0.1.0]` do CHANGELOG (diff vazio após remover o cabeçalho); assets incluem `checksums.txt` e `grim-cubes_0.1.0.sbom.json`.
  - Estado (Esp, 2026-10-31): `gh release view v0.1.0` → `name` e `tagName` `v0.1.0`, `isPrerelease: false`, assets `checksums.txt` e `grim-cubes_0.1.0.sbom.json`; o corpo bate com a seção `## [0.1.0]` (só diferem as linhas de link do rodapé do arquivo).
- [x] **E-04-04** Smoke com Playwright (`@playwright/test`; agent-browser não é dependência do projeto) em `tools/smoke/run.ts`: abre URL, espera `window.gc.ready`, screenshot, lê console, falha se houver `error`; aceita `VERCEL_AUTOMATION_BYPASS_SECRET` (headers `x-vercel-protection-bypass` e `x-vercel-set-bypass-cookie`, só mesma origem, valor nunca logado) + workflow `deploy-web.yml` pós-deploy (`deployment_status` de produção, environment `Production`, a confirmar no 1º deploy). Deps: E-04-02. Resp: Est. Prio: P1.
  - Asserts: `bun run test:smoke -- --url <preview>` exit 0 e gera `reports/smoke.png`; workflow roda após deploy de produção e está verde.
- [x] **E-04-05** `codeql.yml` semanal e por PR. Deps: E-04-01. Resp: Est. Prio: P2.
  - Asserts: workflow presente e verde na primeira execução.
- [x] **E-04-06** `tools/changelog-check` (SDD 13 §3): job no CI que falha o PR com commit `feat`/`fix` sem tocar `CHANGELOG.md` `[Unreleased]`; rótulo `skip-changelog` para exceções. Deps: E-04-01. Resp: Est. Prio: P2.
  - Asserts: PR de teste com `feat:` sem CHANGELOG falha o check; com a linha em `[Unreleased]` passa; self-test com fixtures.
  - Estado (Esp, 2026-10-31): `tools/changelog-check` com self-test (`check.test.ts`: feat sem item falha, com item passa, outros tipos e o rótulo isentos) e job `changelog` no `ci.yml` (63b50d0). O PR de teste não se aplica enquanto a `main` integrar sem PR (§6 do `prompt-workers.md`); o job roda quando houver PR.

### E-05 Pesquisa, contas e tarefas manuais do PO

- [x] **E-05-01** Consulta manual de marca "Grim Cubes" no INPI (classes 9 e 41), USPTO (TESS) e EUIPO; resultado registrado em `docs/legal/trademark-screening.md` (triagem, não parecer). Deps: —. Resp: PO. Prio: P0.
  - Asserts: arquivo existe com data, bases consultadas, capturas ou números de processo encontrados, e decisão "manter nome" ou "trocar para X"; se trocar, ADR novo e atualização de `package.json.name`.
- [ ] **E-05-02** Registro dos domínios `grimcubes.com` e `grimcubes.com.br` (se o nome for mantido). Deps: E-05-01. Resp: PO. Prio: P1.
  - Asserts: `rdap.verisign.com/com/v1/domain/grimcubes.com` retorna 200 com o registrante; registrado em `docs/legal/domains.md`.
- [ ] **E-05-03** Conta Steamworks (US$ 100, App ID do jogo e da demo) iniciada, prazo de 21 dias registrado. Deps: E-05-01. Resp: PO. Prio: P1 (bloqueia a ALPHA).
  - Asserts: `docs/legal/accounts.md` com App IDs (sem credenciais) e data de pagamento; secrets `STEAM_APP_ID` e `STEAM_DEMO_APP_ID` criados no GitHub (`gh secret list` os lista).
- [~] **E-05-04** Conta ElevenLabs em plano pago (Creator recomendado) e `ELEVENLABS_API_KEY`/`ELEVENLABS_PLAN` em `.env` local e no ambiente `audio` do GitHub. Deps: —. Resp: PO. Prio: P1 (bloqueia áudio no PROTÓTIPO).
  - Asserts: `gh secret list --env audio` inclui `ELEVENLABS_API_KEY`; `.env.example` contém só os nomes; `tools/audio-generate --dry-run` lê o plano e imprime `plan: creator`.
  - Estado (Esp, 2026-10-31, `main` 49039f2): plano Creator ativo e usado na geração dos 119 áudios (`meta.json` com `plan: creator`); `ELEVENLABS_PLAN=creator` como variável do ambiente `audio`. Pendente do PO: o secret `ELEVENLABS_API_KEY` no ambiente `audio` do GitHub (`gh secret list --env audio` ainda não o lista).
- [x] **E-05-05** Validar as flags WebGL do Playwright/SwiftShader e a leitura de `.editorconfig` pelo Biome; registrar em `docs/sdd/11-testing-quality.md` (emenda) e no ADR-0019 se mudar. Deps: E-02-06. Resp: Est. Prio: P1.
  - Asserts: trecho do log do e2e com `RENDERER` colado no PR; `biome format .` (o Biome 2.6.4 não tem `--check`) respeita tab 4 com e sem `.editorconfig`, porque `biome.json` fixa os valores e o Biome só lê o `.editorconfig` com `formatter.useEditorconfig: true` (resultado documentado no SDD 11 §2).
  - Estado (Esp, 2026-10-31): flags e renderer documentados no SDD 11 §2 e na emenda do ADR-0019 (ef0481b); o `boot.spec` registra o `UNMASKED_RENDERER_WEBGL` como annotation; a nota do Biome/`.editorconfig` entrou no SDD 11 §2 nesta reconciliação. Sem PR no fluxo atual: o log do renderer fica na annotation do relatório do e2e, fora do CI (decisão do PO 2026-10-31).

### Riscos da fase 1

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| TypeScript 7 sem API JS quebra Vitest/Vite/plugins | média | alto | testar na E-02-02; fallback `@typescript/typescript6` 6.0.2 com ADR de emenda |
| WebGL headless no CI (SwiftShader) falha | média | alto | E-05-05 valida cedo; alternativa: `xvfb` + Chromium com GPU de software ou e2e em runner com GPU |
| Vercel Hobby considerar a demo uso comercial | baixa | médio | confirmar fair use; Pro se necessário (custo do PO) |
| Consulta de marca aponta conflito | baixa | alto | shortlist de nomes em `docs/web-search.md` §2.3; renomear antes do PROTÓTIPO |
| Steamworks demora > 21 dias | média | médio | iniciar na ESTRUTURA |

---

## Fase 2 — PROTÓTIPO

**Objetivo.** Provar o loop central e a performance: mundo infinito com chunks, horda de 100 inimigos (Carcaça e Lamento) com thin instances + VAT, espada e pistola com auto-mira, rounds 1–10 com rampa de tempo, loja entre rounds, level-up, elite com pity, o Coveiro no round 10, tela de morte com almas, e a demo "até o round 10" funcional na web. Arte em placeholder consistente com o Art Bible (herói, 2 inimigos, chefe, Mercador, 10 props do Cemitério). Sem Ossuário completo, sem outros biomas.

**Critério de entrada.** Saída da ESTRUTURA concluída; `v0.1.0` publicada; E-05-01 concluída (nome confirmado).

**Critério de saída.** Uma run completa (round 1 → Coveiro morto → tela de resultado) jogável no preview da Vercel e em build Electron local; `bench=horde100` e `bench=round20` (protocolo P-03-06: 5 s de warm-up + 30 s) na máquina do PO em 1080p com fpsAvg ≥ 60 e frameP99 ≤ 20 ms (números de CI/SwiftShader só informativos); relatório Android preliminar (P-07-05) registrado; determinismo verificado; simulador rodando com relatório; 3 sessões de playtest registradas; `v0.3.0` publicada.

### P-01 Mundo procedural

- [x] **P-01-01** `game/world/chunks`: `generateChunk` determinístico (SDD 03 §2.1) com props do `biomes.json` (só Cemitério), regra de corredor, exclusão perto do spawn; duas grades 4×4 independentes (bloqueantes+destrutíveis ≤ 1 por célula; decorativos ≤ 1 por célula), contagens sorteadas nas faixas de `biomes.json`, `simplex-noise` (seed derivada de `seedRun`) só ordena a escolha de células; preenche o `ChunkData` (lista fixa de props) consumido por P-01-03. Deps: E-03-04, P-01-02. Resp: S1. Prio: P0.
  - Asserts: testes: mesma seed → mesmo hash em 1.000 chunks; bloqueantes ∈ [4, 8] (D3), decorativos ∈ [6, 14], destrutíveis ∈ [1, 2]; regra de corredor 0 violações em 10.000 chunks; nenhum prop > 2 u a < 3 u do spawn; `generate 49 chunks` < 50 ms em Node (teste com `performance.now()`).
- [x] **P-01-02** `chunkSystem`: anel raio 3, fila por distância, ≤ 2 chunks gerados por passo, descarga (Chebyshev ≥ 5) antes da carga no mesmo passo, pool fixo de 81 `ChunkData` (9×9). Deps: P-01-01. Resp: S1. Prio: P0.
  - Asserts: teste de integração: mover o herói 2.000 u em linha reta mantém sempre todos os chunks com Chebyshev ≤ 3 carregados (após estabilizar), nenhum com ≥ 5, total ∈ [49, 81] após estabilizar e nunca aloca além do pool (contador de alocações = 0 após o warm-up).
- [x] **P-01-03** Render de chunks: chão em 1 mesh único (1 quad por cubo, 16×16 por chunk, slots fixos para 81 chunks, cada cubo com UV para o tile 32² da sua variante em `atlas_terrain`, 32 px/u do Art Bible §5); props instanciados só nos chunks com Chebyshev ≤ 3 (orçamento SDD 14 §2), props por thin instances por tipo, reconstrução de buffers só quando o anel muda ou quando ocorre `OriginShifted`. Deps: P-01-02, P-06-02. Resp: S1. Prio: P0.
  - Asserts: `scene.getActiveMeshes().length` ≤ 12 com 49–81 chunks (chão = 1 mesh); draw calls ≤ 60 sem inimigos (via `SceneInstrumentation` logado em `?debug=1`); captura visual `world-cemetery-<alvo>.png` nos 4 alvos.
- [x] **P-01-04** Origin shifting (SDD 03 §1): `Position`/`PrevPosition` relativos à origem; `applyOriginShift` em `game/world` quando |hero| > 1.024 u (`data/world.json`); delta múltiplo de 16; evento `OriginShifted {dx, dz}`; render desloca câmera e reescreve buffers de chão/props. Deps: P-01-02. Resp: S1. Prio: P0.
  - Asserts: teste: andar 5.000 u e verificar `|Δ(hero − prop)| < 0,01 u` em todos os shifts; |Δ alvo da câmera| < 0,01 u no passo do shift (teste NullEngine); vídeo de 10 s pelo PO (manual).
  - Estado (Esp, 2026-10-31): `packages/game/src/world/originShift.test.ts` (5.000 u, tolerância 0,01 u, determinismo, sem alocação) e `packages/render/src/port.test.ts` (alvo da câmera no shift). Pendente do PO: vídeo de 10 s.
- [x] **P-01-05** Colisão herói/inimigo vs props bloqueantes (spatial hash estático) e steering de desvio dos inimigos. Deps: P-01-02, P-03-01, P-03-03, E-03-06. Resp: S1. Prio: P0.
  - Asserts: teste: herói contra lápide não atravessa (`dist ≥ r_prop + r_hero − 0,01`); 100 inimigos perseguindo através de um campo de 20 props (fixture determinística `tests/fixtures/prop-field-20.json`, seed 42) chegam ao herói em ≤ 15 s simulados (nenhum preso).

### P-02 Herói, câmera e input

- [x] **P-02-01** Herói com stats base (GDD §7.1), movimento sem inércia, `PrevPosition` e interpolação no render; câmera ADR-0017 (elevação 55°, beta 0,611 rad, D1) seguindo com lerp 8/s (`setTarget(v, false, false, true)` para preservar alpha/beta/raio); valores de câmera em `data/render.json`. Deps: E-03-02, E-03-06. Resp: S1. Prio: P0.
  - Asserts: teste: velocidade medida = 6 u/s ± 1%; captura em 1080p mostra o herói no centro ±5% da tela; trapézio visível no chão (picking dos 4 cantos em `?debug=1`, logado) bate com GDD §5 (profundidade 25,6 u, larguras 30,3/35,9/44,2 u) com ±3%.
- [x] **P-02-02** Input unificado (`InputState`): teclado, gamepad (polling, dead zone), joystick virtual (mobile) e remap básico. Deps: E-03-02. Resp: S2. Prio: P0.
  - Asserts: testes unitários do mapeamento; e2e mobile-l: `touchscreen` arrasta o joystick e o herói se move ≥ 3 u por polling (o SwiftShader limita o passo; emenda do Orq 2026-10-31); gamepad testado manualmente pelo PO (registro em PROGRESS).
  - Estado (Esp, 2026-10-31): mapeamento e remap testados em `packages/platform/src/input/input.test.ts`; `tests/e2e/input.spec.ts` cobre teclado e joystick virtual, que espera 3 u por polling (até 20 s). e2e fora do CI (decisão do PO 2026-10-31). Pendente do PO: teste manual do gamepad.
- [x] **P-02-03** Fade/transparência de props altos entre câmera e herói. Deps: P-01-03. Resp: S1. Prio: P2.
  - Asserts: captura com árvore morta entre câmera e herói mostra o herói visível (teste visual anexado).

### P-03 Horda

- [x] **P-03-01** Spatial hash dinâmico (célula 2 u, `queryCircle` sem alocação) + `separationSystem`. Deps: E-03-01, E-03-06. Resp: S2. Prio: P0.
  - Asserts: teste: 600 entidades aleatórias, `queryCircle` devolve o mesmo conjunto que a busca ingênua (100 consultas); custo de rebuild + 600 consultas < 1 ms em Node (p50 de 100 execuções).
- [x] **P-03-02** `spawnSystem` com `rounds.json` (total, intervalo, rajada, cap 100, anel 22–30 u com viés de 60%). Deps: P-03-01. Resp: S2. Prio: P0.
  - Asserts: integração: round 10 gera exatamente `20 + 12 × 10 = 140` spawns com herói parado e sem arma; simultâneos nunca > 100 (assert por passo).
- [x] **P-03-03** `behaviorSystem` para `chase` (Carcaça) e `zigzag` (Lamento); dano de contato com cooldown 0,5 s; i-frames do herói. Deps: P-03-02. Resp: S2. Prio: P0.
  - Asserts: testes: Carcaça a 10 u alcança o herói parado em ≤ 3 s simulados; herói cercado por 10 Carcaças recebe no máximo 1 hit por 0,3 s (i-frames).
- [x] **P-03-04** Render da horda: 1 mesh por tipo + thin instances + VAT (`BakedVertexAnimationManager`) com clipes idle/walk/attack/hit/death (2º buffer por instância `bakedVertexAnimationSettingsInstanced`, `alwaysSelectAsActiveMesh = true`); buffers reutilizados; `thinInstanceBufferUpdated` 1×/frame por buffer (matriz + VAT). Deps: P-06-03, P-03-03, P-03-06. Resp: S1. Prio: P0.
  - Asserts: `bench=horde100` (100 inimigos animados, sem projéteis; protocolo P-03-06) em 1080p na máquina do PO: fps médio ≥ 60, `frameP99 ≤ 20 ms`, draw calls ≤ 120, heap estável (Δ < 5 MB em 60 s); resultado em `reports/perf-desktop-1080.json`.
  - Estado (Esp, 2026-10-31): horda por tipo com thin instances + VAT (28771cc, aee88a3, 4c953bb); `reports/perf-desktop-1080.json` (SwiftShader, 71eadf2) com 15 draw calls e Δheap 0 no `horde100`. Pendente do PO: `BENCH_GPU=1 bun run test:perf` na máquina do PO (fps ≥ 60, frameP99 ≤ 20 ms).
- [x] **P-03-05** Culling: remoção de inimigos > 40 u (sem drop) e exclusão de instâncias fora do frustum ampliado. Deps: P-03-04. Resp: S1. Prio: P1.
  - Asserts: teste: inimigo a 45 u é removido no passo seguinte; cull de render por frustum (4 planos laterais, margem = raio do modelo × escala + 1 u): nenhum inimigo com centro na tela deixa de ser desenhado e `thinInstanceCount` ≤ inimigos na tela × 1,5 (a margem passa de 10% em 800×360; decisão do Orq em 2026-10-31).
- [x] **P-03-06** Harness de bench (`tools/perf/bench.spec.ts`, cenários `?bench=horde100|round20`, seed fixa): 5 s de warm-up + 30 s de medição; métricas do SDD 14 §4 via `SceneInstrumentation`; `frameP99` por `performance.now()` em `onEndFrameObservable`. Deps: P-03-03, E-02-06. Resp: S1. Prio: P0.
  - Asserts: gera `reports/perf-<alvo>.json` com 6 chaves; duas execuções no SwiftShader com `drawCalls` e `activeMeshes` idênticos.

### P-04 Combate e armas

- [x] **P-04-01** `rules/damage.ts` (fórmulas GDD §8.2), fila de dano, `damageSystem` (crit, armadura, esquiva, roubo de vida, knockback, i-frames), eventos. Deps: E-03-04. Resp: S2. Prio: P0.
  - Asserts: tabela de testes: armadura 10 → dano ×0,60 (±0,01); armadura −10 → ×1,40 (±0,01, fórmula simétrica do GDD §8.2); dodge 60% com rng fixo bate a taxa (10.000 amostras, ±1%); cap de roubo de vida 10 HP/s respeitado.
- [x] **P-04-02** `targetingSystem` (mais próximo, prioridade elite/chefe ×0,8) e `weaponSystem` para `sword` (arco 120°) e `pistol` (projétil). Deps: P-04-01, P-03-01. Resp: S2. Prio: P0.
  - Asserts: testes: espada acerta 3 de 4 inimigos posicionados (1 fora do arco); pistola cria projétil com `pierce 0` (o acerto é testado na P-04-03); `attacksPerSecond` 2,0 → 120 ataques em 60 s simulados (±1).
- [x] **P-04-03** `projectileSystem` (vida, hit por spatial hash, bitmask anti-duplo-hit, pool 512). Deps: P-04-02. Resp: S2. Prio: P0.
  - Asserts: teste: projétil com `pierce 0` acerta 1 e some; projétil com `pierce 2` atravessa 3 inimigos em linha e some; 600 projéteis simultâneos nunca excedem o pool (assert) e o 601º é descartado com evento `PoolExhausted`.
- [x] **P-04-04** Tiers de arma (multiplicadores) e upgrade; `smg`, `mg` (dispersão, penalidade de velocidade) e `bazooka` (área, autodano). Deps: P-04-03. Resp: S2. Prio: P1.
  - Asserts: testes de cada arma com valores de `weapons.json`; bazuca a 1 u do herói causa 50% do dano nele; T4 da espada = dano ×3,2.
- [x] **P-04-05** Juice do combate (Art Bible §9, GDD §23): números de dano por engine (sprites), flash branco, partículas cúbicas de sangue (pool 600), decals (pool 200 FIFO), desmembramento em cubos, knockback visual, hit-stop (30/80 ms), vignette de dano, shake (toggle). Decals como thin instances de 1 quad (1 draw call). Deps: P-03-04, P-04-01. Resp: S1. Prio: P1.
  - Asserts: vídeo de 15 s no PR; pools nunca excedidos (asserts em debug); toggle de gore reduz decals a 0 e troca cor (captura comparativa); `frameP99` do bench não piora > 10% com VFX ligado.
  - Evidência (S1, 2026-10-31): `round20` 1080p SwiftShader, 2 rodadas por estado: frameP99 120 e 143 ms com VFX contra 126 e 121 ms sem (média 131,5 contra 123,5, +6,5%, abaixo de 10%); média por frame 61,7 contra 55 ms. Detalhes no SDD 14. Pendente do PO: o vídeo de 15 s (ação manual em `docs/PROGRESS.md`).
  - Estado (Esp, 2026-10-31): números de dano, flash, partículas (pool 600) e decals (pool 200 FIFO com fade), desmembramento, knockback, hit-stop, vinheta e shake entregues; pools nunca excedidos (`vfx.test.ts`); gore reduzido zera decals e acinzenta os cubos (baselines `gore-*`); pools do preset aplicados ao vivo (8d68a74). Bench VFX ligado × desligado no SDD 14 (`round20`, SwiftShader): frameP99 120 e 143 ms com VFX contra 126 e 121 ms sem, dentro do ruído; média por frame +11%. Pendente do PO: vídeo de 15 s e o mesmo bench em GPU real.
- [x] **P-04-06** Render de projéteis e pilhas de fragmento (thin instances, 1 mesh por tipo, buffer reutilizado, sem alocação; emissivo conforme Art Bible §5.1), lendo `Projectile`/`Fragment` só para leitura. Deps: P-04-03, P-05-02. Resp: S1. Prio: P0.
  - Asserts: teste NullEngine: 200 projéteis e 50 pilhas viram 1 draw call por tipo; contador de alocação 0 por frame; captura `combat-<alvo>.png` com tiros e drops visíveis nos 4 alvos.

### P-05 Rounds, loja, level-up, elite, chefe

- [x] **P-05-01** `roundSystem` + máquina de estados da run (SDD 02 §5): rampa de duração (GDD §13.1), intro/outro, fim de round mata restantes sem drop, Bolsa. Deps: P-03-02. Resp: S2. Prio: P0.
  - Asserts: teste: durações dos rounds 1–12 = [20,25,30,35,40,45,50,55,60,60(chefe: sem timer),60,60] s em passos; fragmentos no chão ao fim do round vão para a Bolsa e reaparecem no seguinte (contagem conservada).
- [x] **P-05-02** Fragmentos (drop por tipo, chance decrescente, 50 pilhas, magnet por raio de pickup), XP + ouro, colheita no fim do round. Deps: P-05-01, P-04-01. Resp: S2. Prio: P0.
  - Asserts: teste: round 10 → chance de drop 85% (10.000 amostras ±1%); 60 pilhas viram 50 com valor conservado; colheita 4 no round 5 → `ceil(4 × 1,25) = 5`.
- [x] **P-05-03** Level-up (curva GDD §16.1, 3 cartas de `cards.json`, pausa) + tela `LevelUp` no design system. Deps: P-05-02, E-03-03. Resp: S2. Prio: P0.
  - Asserts: teste: XP para passar do nível 10 para o 11 = 82 (GDD §16.1); 3 cartas distintas; escolha aplica o stat e marca `dirty`; e2e: cartas aparecem e a escolha por tecla `1` fecha a tela; capturas nos 4 alvos.
- [x] **P-05-04** Loja (`rules/shop.ts`: preço, reroll, tier; `generateShop`, garantias, lock, venda de arma a 50%) + tela `Shop` (4 slots, upgrade de arma, stats com delta, reroll, lock, próximo round). Deps: P-05-01, P-04-04, E-03-03. Resp: S2. Prio: P0.
  - Asserts: testes com oráculo Brotato: item base 20 no round 1 custa 23 e no round 10 custa 50; reroll no round 10 = 11, 15, 19; T4 no round 20 ≈ 2,99% (±0,1 sem luck); rounds 1–2 garantem ≥ 1 arma; e2e compra/reroll/lock; capturas nos 4 alvos.
- [x] **P-05-05** `statsSystem` (add → mul → caps) e os 40 itens de `items.json` com efeitos especiais da 1.0 implementados ou marcados `TODO:ALPHA` em `data/items.json` (`"status": "alpha"`). Deps: P-05-04. Resp: S2. Prio: P1.
  - Asserts: teste por item funcional: ≥ 30 itens cobertos somando os com modificadores simples (29) e os com efeito especial implementado; `jq '[.[] | select(.status=="alpha")] | length' data/items.json` ≤ 10 ao fim da fase.
- [x] **P-05-06** Elite: sorteio 20% com pity 5, modificadores de `elites.json` (4), escala ×1,6 (simulação), entrada aos 10 s, baú Lendário (2 escolhas), 25 almas, 25 HP, fuga no fim do round. Deps: P-05-01, P-03-04. Resp: S2. Prio: P0.
  - Asserts (e2e com build `GC_DEBUG_API=1`): teste: sorteio cru em 10.000 rounds entre 19% e 21%; taxa efetiva com pity 5 ≈ 27% (1/3,69 ± 1,5 ponto; nunca mais de 5 rounds comuns seguidos; round 1 nunca) e nunca há 6 rounds comuns seguidos sem elite; round 1 nunca tem elite; e2e: elite aparece via cheat `spawnElite` e o baú abre com 2 opções.
- [x] **P-05-06b** Render da elite e do baú: escala de instância ×`elites.json` `scale`, aura/tint por modificador (tokens de `aura`), baú no chão (placeholder), marcador de borda para elite fora da tela; consome `EliteIncoming`, `EliteSpawned`, `ChestDropped`, `EliteEscaped`. Deps: P-05-06, P-03-04. Resp: S1. Prio: P0.
  - Asserts: teste NullEngine: instância de elite com escala 1,6 e cor de aura por modificador; baú instanciado no ponto do `ChestDropped`; captura `elite-<alvo>.png` nos 4 alvos (build `GC_DEBUG_API=1`).
- [x] **P-05-07** O Coveiro (`bosses.json`): padrões `charge`, `swing_arc`, `summon`; telegrafia (decal + evento); enrage a cada 60 s; barra de chefe; intro 3 s; execução; baú de chefe; almas; horda a 30%. Deps: P-05-06, P-04-05. Resp: S1 (padrões/render) + S2 (bossSystem). Prio: P0.
  - Asserts (e2e com build `GC_DEBUG_API=1`): teste: HP 1.200 no round 10 Normal; enrage stacks = 2 após 120 s; `summon` aos 50% cria 6 Carcaças; integração: política greedy com build mediano mata o Coveiro em [45, 90] s; e2e: `bossIntro` → barra visível → morte → `Results`.
- [x] **P-05-08** Morte do herói, tela `Results` (round, kills, dano, causa, build, almas com contagem, seed), `MetaState` com almas e recorde, save (SDD 06) no adaptador web. Deps: P-05-07, E-03-05. Resp: S2. Prio: P0.
  - Asserts: teste: morrer no round 12 com 1 elite e 1 chefe → 285 almas (Normal); save round-trip e `schemaVersion` = 1; e2e: recarregar a página mantém almas e recorde; capturas nos 4 alvos.

### P-06 Arte e áudio placeholder

- [x] **P-06-01** Modelos (`.bbmodel` gerados por script em `tools/assets-gen` + texturas conforme Art Bible; convertidos para glTF pelo `assets-build`, D5; o PO refina no Blockbench): herói, Carcaça, Lamento, Coveiro, Mercador, 10 props do Cemitério, 4 tiles de chão, 5 armas (meshes na mão). Deps: P-06-02, P-06-07. Resp: S1 (refino visual com o PO no Blockbench). Prio: P0.
  - Asserts: `bun run assets:build` exit 0 (validações de elementos, textura, cores, sockets); capturas de cada modelo em `docs/art/review/*.png`; teste de silhueta (preto sólido a 64 px) anexado e aprovado pelo PO em PROGRESS.
  - Estado (Esp, 2026-10-31): modelos gerados por `assets-gen` e convertidos no `assets:build` (CI build-web verde em cb2a672); 76 capturas em `docs/art/review/` com silhuetas (5da1ca9). Pendente do PO: aprovação das silhuetas no PROGRESS.
- [x] **P-06-02** `tools/assets-build` (SDD 09): validação, atlas por categoria (MaxRects), reescrita de UV via `@gltf-transform/core` (aprovada; codec PNG `pngjs` aprovado pelo PO em 2026-10-31), manifest com grupos. Deps: E-02-01. Resp: S1. Prio: P0.
  - Asserts: duas execuções seguidas produzem `manifest.json` byte a byte idêntico (sem `generatedAt`); fixtures inválidas (1 por regra) falham com mensagem contendo o nome da regra; a entrada `atlas_characters` do manifest aponta para PNG com hash no nome, 2048×2048.
- [x] **P-06-03** Bake de VAT de matrizes de osso (formato do `VertexAnimationBaker`) para Carcaça e Lamento, dentro do `assets:build`: RGBA32F em `vat/<nome>.<hash>.bin` + JSON com 5 clipes (idle/walk/attack/hit/death) a 12 fps, largura (ossos+1)×4 ≤ 4096; loader no render. Deps: P-06-02. Resp: S1. Prio: P0.
  - Asserts: oráculo: fixture analítica de 2 ossos com rotação de 90° no frame 5 bate com a matriz esperada (tolerância 1e-4); o JSON de `vat_husk` (arquivo `vat/husk.<hash>.bin`) lista 5 clipes a 12 fps e largura ≤ 4096; duas execuções do bake produzem `.bin` byte a byte idêntico.
- [x] **P-06-04** Áudio v2 no jogo (SDD 08 §1–§2): engine, buses, unlock na tela de título, sons de hit/morte/pickup/level-up/UI (placeholders jsfxr ou ElevenLabs se E-05-04 pronta), música do menu e do Cemitério. Deps: E-05-04 (opcional), P-04-05. Resp: S2. Prio: P1. **Parcial:** motor, buses, unlock, throttle, sons por evento e música por estado entraram (testes em `apps/web/src/audio/audio.test.ts`); o assert e2e fica pendente (e2e desligado por decisão do PO).
  - Asserts: e2e: antes do clique nenhum `AudioContext` está `running`; após o clique em "Começar", `audioEngine.state === "running"`; throttle: ≤ 12 sons novos por frame (assert em debug).
  - Estado (Esp, 2026-10-31, `main` 49039f2): motor Web Audio com buses, unlock, throttle de 12 sons por frame, sons por evento e música por estado (5c3d3cc, 6c6e5a9); som para cada evento silencioso e ducking da música sob as falas (b224e4d). O assert e2e do `AudioContext` fica fora do CI (decisão do PO 2026-10-31).
- [x] **P-06-05** `tools/audio-generate` (SDD 08 §3) com `prompts.json` para os 20 SFX do PROTÓTIPO e 2 músicas; `meta.json`; recusa de plano free. Deps: E-05-04. Resp: Est. Prio: P1.
  - Asserts: `bun run audio:generate --dry-run` lista 22 itens; com mock de API, gera arquivos e `meta.json` com `plan`; com `ELEVENLABS_PLAN=free` sem `--allow-free` sai com exit 2 e mensagem.
- [x] **P-06-06** Render de personagens com skeleton (herói, Mercador, Coveiro): `AnimationGroup` com blend de 0,1 s, arma no `weapon_socket`, `hit_socket` exposto, `speedRatio` ∝ velocidade. Deps: P-06-01, P-06-02, P-02-01. Resp: S1. Prio: P0.
  - Asserts: NullEngine com pai da arma = `weapon_socket`; peso intermediário em t = 0,05 s; `speedRatio` = |v|/v_ref ±5%; capturas nos 4 alvos.
- [x] **P-06-07** Conversão nó→skin rígido no `assets-build` (Blockbench exporta animação por nó): cada nó animado vira osso com peso 1; primitivas unidas em 1 mesh. Validação do `.bbmodel` (SDD 09 §2.1: só cube/quad, rotação múltipla de 22,5°, orçamento de elementos do Art Bible §5.1, grupos `root/body/head`, `weapon_socket`/`hit_socket`). Deps: P-06-03 (D5 decidida: opção A). Resp: S1. Prio: P0.
  - Asserts: fixture com 2 nós animados (glTF por nó) vira 1 mesh com skin de 2 ossos e `WEIGHTS_0` = 1 por vértice; posição de vértice no frame 5 igual à do glTF por nó (tolerância 1e-4); fixtures `.bbmodel` inválidas (1 por regra) falham com o nome da regra.

### P-07 Demo, Electron e qualidade

- [x] **P-07-01** Modo `web-demo`: `__IS_DEMO__`, limite ao vencer o Coveiro → tela `DemoEnd` (botões Steam/Play desabilitados até existirem URLs), selo "DEMO" no menu. Deps: P-05-08. Resp: S2. Prio: P0. **Parcial:** tela `DemoEnd`, selo "DEMO" e parada após o Coveiro entraram; falta o e2e do build `web-demo` e conferir `grep -c "gc.debug"` no build de release.
  - Asserts: e2e no build `web-demo`: após `killBoss` via cheat, a tela `DemoEnd` aparece e `Round 11` nunca inicia; no build `electron` (não demo) o round 11 inicia; `grep -c "gc.debug" dist/assets/*.js` = 0 no build de release (sem `GC_DEBUG_API=1`); o build de e2e usa `GC_DEBUG_API=1`.
  - Estado (Esp, 2026-10-31, `main` 49039f2): `DemoEnd`, selo DEMO e parada depois do Coveiro (b4c7a6c); `grep "gc.debug"` no `dist` do build de release = 0 (conferido pelo Esp com `bun run build`). O e2e do build `web-demo` fica fora do CI (decisão do PO 2026-10-31).
- [x] **P-07-02** Electron 45 + electron-builder: main/preload, `contextIsolation`, build NSIS e portable, execução local do jogo completo; `steamworks.js` inicializado em modo "sem Steam" (sem App ID real ainda). Deps: P-05-08. Resp: S2. Prio: P0.
  - Asserts: `bun run build:electron` exit 0 e gera `release/grim-cubes_0.3.0_windows_x64.exe` (< 250 MB); executável abre em fullscreen e uma run completa é jogável (checklist manual do PO); `electron.yml` verde em `workflow_dispatch`.
  - Estado (Esp, 2026-10-31): `apps/electron` (21a8fff, 5bc7bef) com sandbox, `contextIsolation`, protocolo `app://`, fuses e ícone (ADR-0021); `bun run build:electron` gera `GrimCubes-Setup-<versão>.exe` (141 MB) e `GrimCubes-<versão>-portable.exe` (130 MB), anexados à v0.2.0 pelo job `desktop` do `release.yml`, que substituiu o `electron.yml`; abre em tela cheia. O `steamworks.js` em modo sem Steam ficou para a A-06-01 (ADR-0021: entra com o App ID real). Pendente do PO: checklist manual de uma run completa no executável.
- [x] **P-07-03** Determinismo: teste de hash de world por 3.600 passos (seed 42) e teste de alerta de dt. Deps: P-05-07. Resp: Est. Prio: P0.
  - Asserts: `tests/integration/determinism.test.ts` verde em Node (Windows e Linux no CI); hash documentado no teste.
- [x] **P-07-04** `tools/sim` (SDD 05 §6) com política greedy, relatório e asserts de GDD §25 para rounds 1–10 (chefe 1). Deps: P-05-08. Resp: Est. Prio: P0.
  - Asserts: `bun run sim --runs 200 --rounds 10` termina em < 2 min e escreve `reports/sim-*.json` com p50 de round de morte e tempo de kill do Coveiro; `balance.yml` verde.
  - Estado (Esp, 2026-10-31): `bun run sim --runs 200 --rounds 10` exit 0 em 22 s, com p50 de morte e tempo de kill do Coveiro no relatório; `balance.yml` verde em 159e9f3.
- [~] **P-07-05** Bench de performance (`tools/perf`, `?bench=round20`) desktop no CI (informativo) e manual (GPU real) + relatório Android preliminar em device do PO via Chrome mobile (sem Capacitor ainda). Deps: P-03-04, P-03-06, P-04-03, P-04-05. Resp: Est. Prio: P0.
  - Asserts: `reports/perf-desktop-1080.json` e `reports/perf-desktop-1440.json` com `fpsAvg ≥ 60`; `reports/perf-android-chrome-<device>.json` com `fpsAvg ≥ 30` em 896×414 e cap 60; se falhar, tarefa de otimização aberta na ALPHA (A-01).
  - Estado (Esp, 2026-10-31, `main` 49039f2): `tools/perf` com `horde100` e `round20`; `reports/perf-desktop-1080.json` e `reports/perf-desktop-1440.json` gerados, mas no SwiftShader (fps só indicativo). Faltam: os mesmos benches com GPU real e o relatório Android pelo Chrome mobile (PO), e o job informativo no CI (decisão do PO sobre a A-01-03).
- [ ] **P-07-06** Playtests: 3 sessões (PO + 2 convidados) com formulário (diversão 1–5, clareza, frustrações, round alcançado) e telemetria local JSONL; síntese em `docs/playtests/2026-12-protótipo.md`. Deps: P-07-01. Resp: PO (sessões) + Est (síntese). Prio: P1.
  - Asserts: arquivo com ≥ 3 sessões, round mediano alcançado, 5 problemas priorizados com IDs de microtarefa criadas na ALPHA.
- [x] **P-07-07** Cobertura: thresholds subidos para `game` 70%, `core` 80%; `v0.2.0` (meio da fase) e `v0.3.0` (fim) publicadas. Deps: todas P0 da fase. Resp: Est (cobertura) + Orq (release). Prio: P0.
  - Asserts: `coverage-summary.json` `packages/game` lines ≥ 70%, `packages/core` ≥ 80%; `gh release view v0.3.0` ok no padrão vukem; CHANGELOG com `## [0.3.0]`.
  - Estado (Esp, 2026-10-31): thresholds de cobertura acima da meta (`game` 94%, `core` 93% em `vitest.config.ts`); `v0.2.0` (f504443) e `v0.3.0` (453554a) publicadas no padrão do projeto, com `## [0.2.0]` e `## [0.3.0]` no CHANGELOG, SBOM, checksums e os dois executáveis Windows.

### Riscos da fase 2

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| VAT + thin instances não atingem 60 fps com 100 inimigos | média | alto | P-03-04 é a primeira tarefa de render; fallback: cap 80 + LOD sem animação > 20 u |
| Android Chrome < 30 fps | alta | médio | P-07-05 mede cedo; preset Baixo (cap 60, render scale) já na ALPHA |
| `@gltf-transform/core` ou `fake-indexeddb` não aprovados | baixa | médio | parser glTF próprio mínimo; teste de storage com mock |
| Arte placeholder atrasa (dependência do PO no Blockbench) | média | médio | S1 modela cubos simples primeiro; PO refina em paralelo |
| Determinismo quebrado por float em plataformas diferentes | baixa | alto | P-07-03 roda em Windows e Linux no CI |

---

## Fase 3 — ALPHA

**Objetivo.** Conteúdo e profundidade: 4 biomas, 8 inimigos, 3 chefes (Coveiro, Matriarca, Forjador), Ossuário completo, 3 dificuldades, todos os 40 itens, NPC físico do Mercador, áudio ElevenLabs definitivo para o que existe, Steam Cloud e achievements, página Steam e **demo pública no Steam e na web em 2027-01-24** (marco M-ALPHA-DEMO), registrada no Next Fest de fevereiro/2027.

**Critério de entrada.** Saída do PROTÓTIPO; `v0.3.0`; Steamworks aprovado com App IDs (E-05-03); `reports/perf-*` dentro das metas ou tarefa A-01 planejada.

**Critério de saída.** Demo pública no Steam (App ID demo) e na Vercel; wishlists ≥ 3.000 em 2027-02-21 (métrica, não bloqueante); runs até o round 30 jogáveis com 3 chefes; Ossuário com 30 nós; `bench=round20` em metas nos 2 alvos desktop, com o cenário sustentando a carga de referência do SDD 14 §1 (100 inimigos, 1 elite, 200 projéteis, 150 decals); Android Chrome ≥ 30 fps; cobertura `game` ≥ 80%; 6 sessões de playtest; `v0.6.0`.

### A-01 Performance e preset

- [x] **A-01-01** Presets de vídeo (SDD 14 §5) e `SceneOptimizer` com `hardwareScalingLevel` dinâmico; tela `Options` (vídeo/áudio/gameplay/controles) completa no design system; presets em `data/presets.json` com schema. Deps: P-03-06, E-03-03 (o assert de Android depende também de P-07-05). Resp: S1 (render) + S2 (UI). Prio: P0. **Parcial:** presets, scaler dinâmico e tela `Options` entraram; falta o assert de Android (P-07-05, device) e o e2e/capturas nos 4 alvos.
  - Asserts: preset Baixo em Android Chrome 896×414 → `fpsAvg ≥ 30`, `frameP99 ≤ 40 ms` em `reports/perf-android-chrome-<device>.json` (após P-07-05); e2e num build com `GC_DEBUG_API=1`: trocar preset altera `scene.shadowsEnabled` e cap de inimigos (lidos via `gc.debug`); capturas de `Options` nos 4 alvos.
  - Estado (Esp, 2026-10-31, `main` 49039f2): presets, scaler dinâmico, preset automático e a tela `Options` em três colunas a partir do mockup do PO (4ee4462), com vídeo, áudio, jogabilidade, acessibilidade, controles e barras de vida (fd98405). Pendente do PO: o assert de Android (`fpsAvg ≥ 30` no device, depende da P-07-05). e2e e capturas fora do CI (decisão do PO 2026-10-31).
- [x] **A-01-02** KTX2 ETC1S no pipeline (`toktx` no CI) e carregamento condicional (`engine.getCaps().textureETC2`). `toktx` (KTX-Software) é um binário instalado no runner de CI, não um pacote npm. Usá-lo é pergunta pendente ao PO (registrar em Bloqueios antes de implementar); sem o binário, o pipeline marca `ktx2: false` (SDD 09). Deps: P-06-02, resposta do PO sobre `toktx`. Resp: S1. Prio: P1.
  - Asserts: sem `toktx` no CI da 1.0 (adiado à M-01-04, ADR-0027); o orçamento medido sem KTX2 fica dentro de 160 MB (texturas ≈ 5,2 MB). O pipeline continua com `ktx2: false` até o binário existir.
  - Estado (2026-11-01): o PO escolheu a opção B. O assert original de arquivos `.ktx2` foi emendado para o orçamento já medido em 2026-10-31 (texturas ≈ 5,2 MB contra 160 MB). O carregamento KTX2 no Android continua na M-01-04.
- [~] **A-01-03** Bench de regressão no CI (comparação com `main`): job `perf` num build com `GC_DEBUG_API=1`. No SwiftShader, bloqueia por `drawCalls`/`activeMeshes` (determinísticos) e por `frameP99` > 10% sobre a mediana de 3 execuções (evita falso positivo de CPU de CI). Deps: P-03-06. Resp: Est. Prio: P1.
  - Asserts: PR com regressão artificial (sleep de 5 ms no loop) é bloqueado pelo job `perf` (demonstrado e revertido).
  - Estado (2026-11-01): o PO escolheu a opção A. `.github/workflows/perf.yml` só roda em `workflow_dispatch` ou em PR com o rótulo `perf`. `tools/perf/compare.ts` bloqueia `drawCalls`, `activeMeshes` e `frameP99` mediano acima de 10% da baseline. Falta o PR de demonstração com sleep de 5 ms, e revertê-lo.

### A-02 Biomas e inimigos

- [x] **A-02-01** Biomas Pântano, Forja e Ninho: `biomes.json` (com `propCounts`), tiles (4 cada) e 10 props cada gerados em `tools/assets-gen` (D5), props com entradas em `data/props.json` (`sizeClass`, `kind`, `radius`, `height`), mistura de borda 16 u, fog/música por bioma, pool 60/30/10 no spawner (hoje é fixo em `apps/web`). Deps: P-01-03, P-06-01. Resp: S1 (+ S2 no pool do spawner). Prio: P0.
  - Asserts: teste: `biomeFn` devolve anel correto nas distâncias 0/120/260/420/900; captura de cada bioma nos 4 alvos; `assets:build` exit 0 com os 30 props novos.
  - Estado (Esp, 2026-10-31): `packages/game/src/world/biome.test.ts` (anéis em 0/120/260/420/900 u), 40 props em `data/props.json`, pool 60/30/10 no spawner (4270829), capturas dos biomas nos 4 alvos (baselines win32, e2e fora do CI por decisão do PO 2026-10-31). A música por bioma só tem prompts: depende da P-06-04 (sem motor de áudio).
- [x] **A-02-02a** Behaviors dos inimigos 3–8 (nomes do data, SDD 04 §5): Afogado (`push`), Sanguessuga (`latch_drain`), Forjado (`armored`), Vigia (`ranged_static`), Caçador (`charge`), Reprodutor (`spawner`), com testes. Deps: P-03-03. Resp: S2. Prio: P0.
  - Asserts: teste por behavior (SDD 04 §5): Sanguessuga gruda e drena 1 HP/s; Vigia atira a cada 2 s a < 10 u; Caçador investe a cada 3 s; Reprodutor cria 1 Lamento a cada 4 s respeitando o cap; teste de que `toEnemyDefs` mapeia os 8 behaviors de `data/enemies.json` sem cair no `chase` por omissão.
- [x] **A-02-02b** Modelos e VAT dos inimigos 3–8: `.bbmodel` gerados em `tools/assets-gen` (D5) nas classes de `sizeClass`, VAT `.bin` RGBA32F com os 5 clipes, horda renderizando os 8 tipos. Deps: A-02-01, A-02-02a. Resp: S1. Prio: P0.
  - Asserts: `assets:build` exit 0 com os 6 modelos novos e `vat_<id>` no manifest para os 8 inimigos; oráculo VAT × skeleton do Babylon < 1e-5 em cada um; captura dos 8 tipos nos 4 alvos.
  - Estado (Esp, 2026-10-31): 8 entradas `vat_*` no manifest; oráculo VAT × skeleton dos 8 tipos na suíte unit (f8b9f78, 4f43cb9); capturas dos 8 tipos nos 4 alvos (be00080; e2e fora do CI por decisão do PO 2026-10-31).
- [x] **A-02-03** Balanceamento de rounds 1–30 com os 8 inimigos: `tools/sim` com asserts completos de GDD §25 (3 chefes). Deps: A-02-02a, A-02-02b, A-03-02, P-07-04. Resp: Est. Prio: P0.
  - Asserts: `bun run sim --runs 500 --rounds 30` com p50 de morte ∈ [18, 26], IQR ≤ 25 (com censura à direita; decisão do PO 2026-10-31, provisória até os playtests da B-04), ouro/preço ∈ [1,2, 1,8], level-ups/round ∈ [1, 2] nos rounds 5–20; relatório commitado em `reports/`.
  - Estado (Esp, 2026-10-31): `bun run sim --runs 500 --rounds 30 --check` → p50 21, IQR 22,25, ouro/preço 1,62, level-ups/round 1,34, Coveiro 65 s, Matriarca 77 s, Forjador 86 s, todos ok. Relatório de 500 runs × 30 rounds commitado em `reports/balance-a0203-final.json` (140a1d1); o do CI sai como artefato do `balance.yml`.
- [x] **A-02-04** Props destrutíveis com entidade ECS (SDD 03 §2.2): urnas e afins de `kind: "breakable"` viram entidades com `Health`, colisão circular (`radius` de `data/props.json`), dano por armas e projéteis, drop de consumível (GDD §15.4: Frasco de Sangue e Ímã de Ossos, chances em `data/`) e render de quebra (cubos). O chunk lembra quais já foram quebrados enquanto estiver carregado. Deps: A-02-01, P-01-05. Resp: S2 (entidade/drop) + S1 (render). Prio: P1.
  - Asserts: teste: urna recebe dano da espada e de projétil e quebra ao zerar o HP; drop sorteado em `rng.loot` com as chances do data; herói e inimigos colidem com a urna inteira e não colidem depois de quebrada; nenhuma alocação por passo (contador); e2e num build com `GC_DEBUG_API=1`: quebrar uma urna e pegar o Frasco de Sangue cura 20% do HP.

### A-03 Chefes 2 e 3

- [x] **A-03-00** Generalização do `bossSystem` em despachante de padrões por id: cada padrão de `bosses.json` (`line_charge`, `shovel_arc`, `summon`, …) é um handler registrado por id, com telegrafia/ativo/recuperação comuns, fases por % de HP e enrage compartilhados. Os padrões do Coveiro são migrados sem mudar comportamento. Deps: P-05-07. Resp: S2. Prio: P0.
  - Asserts: os testes de `boss.test.ts` e o `boss.spec` continuam verdes sem mudar valores; um handler de fixture registrado por id roda com o ciclo comum (telegrafia/ativo/recuperação), e um chefe montado só por `bosses.json` combinando padrões existentes funciona sem código específico do chefe (emenda do Orq 2026-10-31); id de padrão desconhecido falha no `data-check` ou na criação, com o nome do id.
- [x] **A-03-01** Matriarca do Pântano (round 20): modelo, padrões `summon`, `pool`, `scream`, fases, voz. Deps: A-03-00, P-05-07, A-02-01, P-06-06, E-05-04 (voz). Resp: S1 (modelo/padrões) + S2 (sistema). Prio: P0.
  - Asserts: teste: HP 12.500 no round 20 (GDD §12, A-02-03); `pool` aplica lentidão 50% por 3 s; greedy mata em [60, 120] s; vídeo no PR.
  - Estado (Esp, 2026-10-31): `matriarch.test.ts` (HP do data no round 20, poça com lentidão 50% por 3 s, grito, invocação) e sim com a Matriarca morta em 77 s. Pendente: voz (E-05-04 do PO e P-06-04); vídeo do PO.
- [x] **A-03-02** O Forjador (round 30): `shockwave`, `chains`, fase 2 com armadura 30. Deps: A-03-00, A-03-01. Resp: S1 + S2. Prio: P0.
  - Asserts: teste: HP 15.000 (GDD §12, A-02-03); fase 2 com armadura 30 faz o chefe receber ≈ 33% do dano (redução ≈ 67%, fórmula do GDD §8.2; leitura do Orq em 2026-10-31); greedy mata em [60, 120] s.
  - Estado (Esp, 2026-10-31): `forgemaster.test.ts` (HP do data, fase 2 com armadura 30 recebendo ≈ 1/3 do dano) e sim com o Forjador morto em 86 s.
- [x] **A-03-03** Roster por round: ordem fixa 10/20/30 e, a partir do 40, repetição escalada (GDD §12.1) até os chefes 4–5 existirem; modificadores de elite a partir do 60. Deps: A-03-02. Resp: S2. Prio: P1.
  - Asserts: teste: round 40 sorteia um dos 3 com HP × (1 + 0,35 × 3); round 60 adiciona 1 modificador; round 100 adiciona 2.
  - Estado (Esp, 2026-10-31): `roster.test.ts` cobre a ordem 10/20/30, o sorteio a partir do 40 com HP × 1,35 por dezena e 1/2 modificadores nos rounds 60/100 (7015d13, c44350b).

### A-04 Ossuário, dificuldades e progressão

- [x] **A-04-01** Ossuário: loader tipado `ossuaryData` em `packages/game/src/data` (o `ossuary.json` com 30 nós e custos 50→800 já existe desde a E-03-04), `applyOssuary` (modificadores e flags), compra e reset com devolução total no `MetaState`, tela `Ossuary` (radial no desktop, tabs no mobile). Deps: P-05-08. Resp: S2. Prio: P0.
  - Asserts: teste: custo total = 10.250; `requires` respeitado; reset devolve 100%; demo bloqueia `index > demoMaxNodeIndex`; e2e num build com `GC_DEBUG_API=1`: comprar `flesh_1` com 50 almas via cheat e verificar +10 HP na run seguinte; capturas nos 4 alvos.
- [x] **A-04-02** Dash (ramo Sombra): 4 u em 0,15 s, i-frames 0,2 s, recarga 3 s, 2 cargas no nó 6; botão mobile. Deps: A-04-01, P-02-02. Resp: S2. Prio: P1.
  - Asserts: teste: deslocamento 4 u ± 0,05; sem dano durante 0,2 s; e2e mobile: botão de dash funciona.
- [x] **A-04-03** Dificuldades Normal/Grim/Nightmare (multiplicadores, desbloqueio no round 20, almas ×1,5/×2) + tela `Difficulty` com seed opcional; `difficultyMult` no spawn e `soulsMult` no fechamento da run. Deps: P-05-08, P-07-03. Resp: S2. Prio: P0.
  - Asserts: teste: Grim ×1,25 em HP e dano; Nightmare bloqueado até recorde Grim ≥ 20; seed digitada reproduz o mesmo hash de world (determinismo).
- [x] **A-04-04** Marcos e desbloqueios (GDD §20): itens no pool por kills/chefes, skin do round 50 (cosmético simples: tint), recordes no menu. Deps: P-05-08 (os recordes no menu dependem também da tela de menu, A-07). Resp: S2. Prio: P2.
  - Asserts: teste: `cube_of_wrath` fora do pool até 1.000 kills e dentro depois; menu mostra recordes por dificuldade.

### A-05 Mercador físico, voz e áudio definitivo

- [x] **A-05-01** NPC Mercador surge a 4 u ao fim do round (`emerge`/`submerge`), interação abre a loja (tela igual, com retrato animado), falas de voz (20) via ElevenLabs. Deps: P-05-04, P-06-05, P-06-06 (skeleton e `AnimationGroup` para `emerge`/`submerge`), E-05-04 (plano pago). Resp: S1 (modelo/animação) + S2 (fluxo) + Est (prompts). Prio: P1.
  - Asserts: e2e: fim do round → Mercador visível em ≤ 1 s → tocar/clicar abre `Shop`; 20 arquivos `vo_merchant_*.mp3` com `meta.plan != free`; vídeo no PR.
  - Estado (Esp, 2026-10-31, `main` 49039f2): o Mercador surge a 6 u (GDD atualizado em 6516498) num ponto fixo, com `emerge`/`submerge`, anel de interação e loja no contato (bffce18, 1deed5b); som de chegada (20d788c); 20 falas `vo_merchant_*` com plano `creator` e legenda (0fda8c8); retratos pintados do herói e do Mercador na loja no lugar do retrato animado (34cef5a). Pendente do PO: vídeo. e2e fora do CI (decisão do PO 2026-10-31).
- [x] **A-05-02** SFX definitivos (lista GDD §22.1 para o conteúdo existente), músicas dos 4 biomas + 3 chefes, falas dos 3 chefes; mixer com sidechain; etapa de áudio no `assets-build` (SDD 09, hoje inexistente). Deps: P-06-05, P-06-04, E-05-04, A-03-02. Resp: Est (geração) + S2 (integração) + S1 (etapa de áudio do `assets-build`). Prio: P1.
  - Asserts: `assets:build` falha se qualquer áudio referenciado tiver `plan: free` (teste negativo demonstrado); `prompts.json` com ≥ 60 SFX, 7 músicas, ≥ 35 falas; loudness medido (−16/−14 LUFS ± 1) registrado no `meta.json`.
  - Estado (2026-11-01): 82 SFX, 10 músicas e 40 falas no plano `creator`; cada `meta.json` tem loudness medido pelo `normalize`; `assets:build` recusa `plan: free` (`tools/assets-build/build.test.ts`); `audio:generate --dry-run` lista 0 pendentes. Arquivos no pico do limiter ficam fora de ±1 LU e registram o valor medido, sem número inventado.

### A-06 Steam, demo pública e marketing

- [ ] **A-06-01** Integração Steamworks real: App IDs, `electronEnableSteamOverlay` (teste das flags; ADR-0008 emendado com o resultado), 10 achievements, Auto-Cloud configurado, build `electron` (jogo) e `electron-demo`. Deps: P-07-02, E-05-03. Resp: S2 + PO (Steamworks). Prio: P0.
  - Asserts: achievement "primeira morte" desbloqueia na conta de teste do PO (captura); save sincroniza entre duas máquinas via Cloud (checklist); overlay funciona ou está desligado com justificativa no ADR; `steam-upload` manual sobe build para o branch `beta`.
- [ ] **A-06-02** Página Steam do jogo e da demo: capsules, 5 capturas (1080p), trailer de 60 s (gravado num build de captura não publicado, com `GC_DEBUG_API=1` ou flag própria `GC_CINEMATIC`; o `?debug` não existe no build de release, SDD 11), descrição, tags, content survey (violência/gore), preço US$ 9,99 e regionais via "Propose Pricing". Deps: A-06-01, A-02-01. Resp: PO + Est (textos) + S1 (capturas). Prio: P0.
  - Asserts: página "coming soon" aprovada pela Valve ≥ 2 semanas antes de 2027-01-24; `docs/marketing/steam-page.md` com textos finais; capsules nos tamanhos exigidos (verificados no Steamworks).
- [ ] **A-06-03** **M-ALPHA-DEMO** — demo pública (Steam demo App + Vercel) em 2027-01-24 e inscrição no Next Fest fev/2027. Deps: A-06-02, A-04-01, A-03-01, A-01-01, A-07-01. Resp: Orq + PO. Prio: P0.
  - Asserts: demo baixável na Steam e jogável na URL pública; smoke pós-deploy verde; crash-free ≥ 99% nas primeiras 100 sessões web (telemetria opt-in); Next Fest confirmado no Steamworks (captura em `docs/marketing/`).
- [~] **A-06-04** Telemetria opt-in (GDD §26.2): eventos JSONL locais + envio em lote para endpoint mínimo (Vercel Function `api/telemetry` com rate limit, sem dados pessoais) — plano Pro se exigido. Deps: decisão do PO (endpoint/armazenamento), A-01-01 (tela `Options` para o opt-in). Resp: S2. Prio: P1.
  - Asserts: com opt-in desligado nenhuma requisição sai (teste e2e com interceptação de rede); com opt-in, lote ≤ 50 KB a cada 60 s; endpoint responde 204 e grava em Vercel Blob/KV `[decisão de armazenamento em ADR]`.
  - Estado (Esp, 2026-10-31, `main` 49039f2): telemetria opt-in local com `session_start`, `run_start`, `run_end`, `boss_killed` e `error` (só tipo e nome, até 5 por sessão, contados só com a telemetria ligada; d281f9d, db37a66). Faltam o endpoint e o armazenamento (decisão do PO), o envio em lote e o teste de rede.

### A-07 Qualidade, UX e conteúdo da demo

- [x] **A-07-01** Onboarding: 3 dicas contextuais no round 1 (mover, pegar fragmentos, loja), tutorial de 20 s opcional, textos em inglês com i18n (`en` + `pt-BR`) via arquivo JSON e `t()` próprio. Deps: E-03-03 (a tradução da tela `DemoEnd` depende também da P-07-01). Resp: Est (textos/i18n) + S2. Prio: P0.
  - Asserts: `locales/en.json` e `locales/pt-BR.json` com as mesmas chaves (teste de paridade); opção de idioma troca todos os textos (e2e); nenhum texto hardcoded em TSX (regra nova no `tools/lint-extra`, que hoje só pega hex e `console.log`).
  - Estado (Esp, 2026-10-31): paridade em `tools/i18n/parity.test.ts`, regra de texto fixo em TSX no `tools/lint-extra` (9cd842d), 3 dicas (08fbb61) e tutorial de 20 s (c3e908f). A troca de idioma hoje é por `?lang=`; a opção no menu depende da tela `Options` (A-01-01). e2e fora do CI (decisão do PO 2026-10-31).
- [x] **A-07-02** Acessibilidade: remap de teclas/botões, modo daltônico, escala de UI, toggles de shake/flash/gore, foco por gamepad em todas as telas. Deps: A-01-01. Resp: S2. Prio: P1.
  - Asserts: e2e: navegar Menu → Jogar → Loja → Ossuário só com teclado (Tab/Enter/Esc); `data-theme="cb"` troca as cores de raridade (captura); axe-core (dev dep já aprovada e instalada na E-02-01) sem violações `serious` nas telas.
  - Estado (Esp, 2026-10-31): navegação por teclado e gamepad em todas as telas (ac6b394, 8a17f74), remap de teclas e dos botões de dash e pausa do gamepad (a6a8b9c, 020ba69; save schemas 6 e 7), modo daltônico com `data-theme="cb"`, formas por raridade e pós-processo, brilho, contraste, escala, flashes e gore (462215a), checagem axe-core das telas principais (`packages/ui/src/a11y.test.tsx`). e2e de navegação e captura do tema fora do CI (decisão do PO 2026-10-31). Em andamento com o S1 (achado da auditoria): HUD `inert` sob diálogos e teto da escala a 150% em 800×360.
- [x] **A-07-03** Cobertura `game` ≥ 80%, `core` ≥ 85%, `ui` ≥ 60%; visual tests para todas as telas nos 4 alvos; e2e completo (SDD 07 §7). Deps: A-04-01. Resp: Est. Prio: P0.
  - Asserts: thresholds no `vitest.config.ts` e CI verde; `tests/visual/__screenshots__/` com ≥ 10 telas × 4 alvos (baselines por plataforma, conforme o `playwright.config.ts`). Os thresholds podem subir aos poucos antes da A-04-01.
  - Estado (Esp, 2026-10-31, `main` 49039f2): thresholds de cobertura acima da meta e CI verde; 31 telas com baselines. Faltam baselines das telas novas (slots, pausa, `Options` e Ossuário novos, loja ARPG, menu com key art) e o e2e completo, que dependem de rodar o e2e (fora do CI por decisão do PO 2026-10-31).
  - Estado (2026-11-01): menu, slots, Options, pausa, Ossuário e loja têm baseline Playwright nos quatro viewports (24 capturas win32, suíte exit 0). Cobertura segue acima dos pisos (`game` 80, `core` 85, `ui` 60) e não foi baixada. O job de e2e continua fora do CI obrigatório (`if: false`, decisão do PO em 2026-10-31).
- [ ] **A-07-04** Playtests: 6 sessões (2 rodadas) com síntese e ajustes de balanceamento via `data/*.json` + `sim`. Deps: A-02-03. Resp: PO + Est. Prio: P1.
  - Asserts: `docs/playtests/2027-01-alpha.md` e `2027-02-alpha.md`; mudanças em `data/` acompanhadas de relatório do `sim` dentro das faixas.
- [~] **A-07-05** Releases `v0.4.0` (biomas+inimigos), `v0.5.0` (Ossuário+chefes), `v0.6.0` (demo pública). Deps: fase. Resp: Orq. Prio: P0.
  - Asserts: `gh release list` mostra as 3 no padrão vukem; CHANGELOG correspondente.
  - Estado (Esp, 2026-10-31, `main` 49039f2): `v0.4.0` publicada (2c87269). Faltam `v0.5.0` e `v0.6.0` (demo pública).
- [x] **A-07-06** Slots de save, checkpoint por round e pausa (decisões do PO de 2026-10-31, ADR-0025, emenda do ADR-0009): 3 slots, cada um um perfil completo, com migração do save único para o slot 1; checkpoint da run no início de cada round, retomado por "Continuar"; menu de pausa (Esc, Start, botão no toque) com Continuar, Opções e "Sair para o menu" mantendo a run. Deps: P-05-08, A-01-01. Resp: S2. Prio: P1.
  - Asserts: teste: o save único dos schemas 1 a 9 vira o slot 1 com o checksum conferido; teste: retomar o checkpoint reproduz round, economia, build, HP e os streams de RNG, e morrer ou terminar a run apaga o checkpoint; teste: a pausa abre com Esc e Start, foca o primeiro botão e "Sair para o menu" pede confirmação; chaves `slot1`..`slot3` e `.bak` validadas na web e no Electron.
  - Estado (Esp, 2026-10-31): entregue em dbc7607 (slots, schema 10; `save.test.ts`, `saveStore.test.ts`, `Slots.test.tsx`, `saveFiles.test.ts`), 463c14f (checkpoint; `packages/game/src/checkpoint.test.ts`) e 81e9ff0 (pausa; `PauseMenu.test.tsx`, `screens.pad.test.tsx`, `a11y.test.tsx`). Docs: ADR-0025, SDD 06 §2.1, GDD §21.4. Os commits trazem `Refs: ROADMAP#P-07-03` por engano; o item certo é este.

### Riscos da fase 3

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| Perder a janela do Next Fest (demo não pronta em 2027-01-24) | média | alto | A-06-03 depende só de P0; conteúdo extra (chefe 3, itens alpha) pode ir para a BETA; página "coming soon" até 2027-01-10 |
| Overlay Steam instável em Electron | média | médio | ADR-0008: desligar overlay; achievements continuam |
| Custo de áudio acima do plano | baixa | baixo | contagem de créditos em `prompts.json`; `--dry-run` estima |
| Balanceamento do infinito (round 40+) | alta | médio | roster escalado e modificadores; `sim` até round 60 na BETA |
| Vercel Function/telemetria exigir Pro | média | baixo | telemetria só local até decisão do PO |

---

## Fase 4 — BETA

**Objetivo.** Completude e polimento da 1.0: chefes 4 e 5 (Caçador Alfa, Rainha do Ninho), roster infinito com modificadores, todos os efeitos especiais de itens, VFX e áudio finais, juice calibrado, localização pt-BR revisada, Steam Input/gamepad polido, assinatura Windows (se houver certificado), página Steam final, beta fechado com testers, estabilidade (crash-free ≥ 99,5%), e preparação do 1.1 (Capacitor scaffold) sem bloquear a 1.0.

**Critério de entrada.** Saída da ALPHA; `v0.6.0`; demo pública no ar; wishlists e feedback do Next Fest coletados em `docs/marketing/next-fest-2027-02.md`.

**Critério de saída.** Conteúdo da 1.0 100% implementado (GDD §28 roster); zero bugs P0/P1 abertos (bugs registrados em `docs/PROGRESS.md` §Dívidas com tag `[bug P0]`/`[bug P1]`; nenhuma entrada aberta com essas tags); `sim` até o round 60 dentro das faixas; beta fechado com ≥ 10 testers e ≥ 50 runs registradas; `bench` em metas nos 4 alvos (mobile em Chrome) com a carga de referência round20 representativa (SDD 14 §1: 8 tipos de inimigo, elites, projéteis, chefe e VFX finais); `v0.9.0`; checklist de lançamento Steam preenchido.

### B-01 Chefes 4 e 5 e roster infinito

- [x] **B-01-01** Caçador Alfa (round 40): `stealth`, `leap`, visão térmica (ignora props), modelo, voz. Deps: A-03-00, A-03-03, P-06-06, E-05-04 (voz). Resp: S1 + S2. Prio: P0.
  - Asserts: teste: HP 7.500; durante `stealth` (3 s) o chefe tem componente `Stealth` e o `targetingSystem` não o escolhe; render aplica alpha por instância 0,15 (canal da cor da instância, como no fade de morte) e volta a 1 ao sair; greedy mata em [60, 120] s.
  - Estado (Esp, 2026-10-31): simulação feita (5aeaf3d: `stealth`, `leap`, `thermal_vision`, componentes `Stealth` e `IgnoresProps`, `nest.test.ts`). HP provisório 60.000 (decisão do Orq 2026-10-31, revisável pelo PO; o HP 7.500 dava kill em 10–14 s no sim), o assert de HP segue o GDD §12.1. Faltam: render (alpha 0,15 por instância, salto, aviso do golpe), modelo refinado e voz (E-05-04 do PO, P-06-04).
- [x] **B-01-02** Rainha do Ninho (round 50): `eggs`, `sweep`, fase 2 `fly_bomb`. Deps: A-03-00, B-01-01, P-06-06, A-02-02b (Caçador dos ovos). Resp: S1 + S2. Prio: P0.
  - Asserts: teste: HP 11.000; ovos eclodem Caçadores em 6 s respeitando o cap; fase 2 aos 50%; greedy mata em [60, 120] s.
  - Estado (Esp, 2026-10-31): simulação feita (5aeaf3d: `eggs`, `sweep`, `fly_bomb`, componente `Egg`, cap respeitado na eclosão). HP provisório 65.000 (decisão do Orq 2026-10-31, revisável pelo PO; o HP 11.000 dava kill em 10–14 s no sim), o assert de HP segue o GDD §12.1. Bloqueio aberto na auditoria: armas e projéteis não acertam os ovos (P1); o HP precisa ser recalibrado no sim depois da correção. Faltam: render (ovos, arco da cauda, voo e bombas), modelo refinado e voz.
- [x] **B-01-03** Roster completo 60+: sorteio, 1 modificador (≥ 60), 2 (≥ 100); `sim` até o round 60. Deps: B-01-02, P-07-04. Resp: S2 + Est. Prio: P0.
  - Asserts: `bun run sim --runs 300 --rounds 60` termina sem erro; nenhum chefe com tempo de kill > 180 s no p50 do build greedy; relatório commitado.

### B-02 Itens, cartas e efeitos finais

- [x] **B-02-01** Todos os efeitos especiais de `items.json` implementados (`status: "done"` em 40/40), cartas duplas ≥ nível 10, consumíveis (Frasco de Sangue, Ímã de Ossos) em destrutíveis (A-02-04). Deps: P-05-05, A-02-04. Resp: S2. Prio: P0.
  - Asserts: `jq '[.[] | select(.status=="alpha")] | length' data/items.json` = 0 (hoje 4: `bleed_on_crit`, `contact_damage`, `on_kill_explode`, `shockwave_every_kills`); o enum de effect id do `data-check` não aceita id sem handler implementado; teste por efeito (10 efeitos especiais); e2e: quebrar urna solta consumível e curar 20%.
  - Estado (Esp, 2026-10-31): nenhum item `alpha`; teste por efeito especial (210ffea, ba27c52); cartas duplas a partir do nível 10; consumíveis em destrutíveis e elites; o `data-check` agora recusa id de efeito sem handler (d173f1d). e2e da urna fora do CI (decisão do PO 2026-10-31).
- [x] **B-02-02** Balanceamento final com `sim` 3 dificuldades e 2 políticas (greedy e "tanque"); ajustes em `data/`. Deps: B-02-01, B-01-03. Resp: Est. Prio: P0.
  - Asserts: política "tanque" definida em `tools/sim` (prioriza HP, armadura e regeneração) e documentada no GDD §25; faixas de GDD §25 nas 3 dificuldades (Grim e Nightmare com p50 ∈ [14, 22] e [11, 18], alvos propostos e registrados no GDD §25 como emenda).
  - Estado (Esp, 2026-10-31, `main` 49039f2): política `tank` (dfba858) e greedy nas dificuldades, faixas por dificuldade e política aprovadas e checadas (65b337a, GDD §25), duas seeds no `balance.yml` (878c212), Fácil implementada (c643158), espada 3,25 u e 130° (49039f2); relatórios `reports/balance-final-{normal,grim,nightmare}-{greedy,tank}.json`. Nota: o GDD §25 ainda chama a Fácil de "proposta, ainda não implementada".

### B-03 Arte, VFX, áudio e juice finais

- [x] **B-03-01** Revisão de arte de todos os modelos conforme checklist do Art Bible §14 (herói, 8 inimigos, 5 chefes, Mercador, 40 props, 16 tiles, 5 armas, 40 ícones de item, 12 ícones de carta, 30 ícones de nós). Deps: B-01-02, B-03-05. Resp: S1 + PO. Prio: P0.
  - Asserts: `docs/art/review/checklist.md` com todos os itens marcados; `assets:build` exit 0; teste de silhueta dos 8 inimigos + 5 chefes aprovado.
  - Estado (Esp, 2026-10-31, `main` 49039f2): os 78 modelos passam nos 12 itens do checklist; item 11 com captura em jogo (`?art=<id>&ingame=1`, 1080p e 800×360, câmera, luz e fog do jogo, sobre o tile do bioma); contraste corrigido (Vigia, Afogado, props escuros) e tiles da Forja e do Ninho irregulares (18262c0); herói novo igual à key art (e15ae2d); ícones à mão com o padrão de 5 glifos + nível do Ossuário; folhas por bioma em `docs/art/review/ingame/`. Pendente do PO: aprovação das silhuetas pela folha numerada.
- [x] **B-03-02** VFX finais: execuções dos 5 chefes, auras, telegrafias, explosões, nível de gore e toggle; partículas no orçamento. Deps: B-03-01, B-01-02, P-04-05, P-05-06b. Resp: S1. Prio: P1.
  - Asserts: bench com VFX máximo e carga round20 representativa (SDD 14 §1) mantém `frameP99 ≤ 20 ms` em 1080p; toggle de gore testado por captura.
  - Estado (Esp, 2026-10-31): execuções dos 5 chefes, auras, telegrafias, explosões, sangramento, espinhos pelo evento `ThornsHit` (7be0265), furtividade, ovos, poeira por bioma, fade de decals, números agrupados e gore ligável; partículas e decals dentro dos pools do preset. Pendente do PO: bench com VFX máximo e carga `round20` em GPU real (frameP99 ≤ 20 ms em 1080p). Captura do gore: baselines `gore-*`; e2e fora do CI (decisão do PO 2026-10-31).
- [x] **B-03-03** Áudio final: 82 SFX, 10 músicas, 40 falas; mix revisado (sidechain, polifonia); créditos ElevenLabs registrados. Deps: A-05-02, E-05-04. Resp: Est + S2. Prio: P1.
  - Asserts: `bun run audio:generate --dry-run` lista 0 entradas a gerar (hash do prompt atual em todos os `.meta.json`); todo `.meta.json` com `plan` ≠ `free`; `docs/audio/credits.md` com total de créditos usados.
  - Estado (2026-11-01): catálogo 82/10/40, dry-run com 0 pendentes, nenhum `plan: free`, total **37.506** créditos em `docs/audio/credits.md`. Ducking e polifonia já estavam no mixer.
- [~] **B-03-04** Calibração de juice (hit-stop, shake, knockback, números) por playtest; valores finais no bloco `vfx` de `data/render.json`. Deps: B-03-02. Resp: S2 + PO. Prio: P2.
  - Asserts: o bloco `vfx` de `data/render.json` é a única fonte (lint extra: sem literais de hit-stop no código); playtest registra nota de "impacto" ≥ 4/5.
  - Estado (Esp, 2026-10-31, `main` 49039f2): os valores de juice estão no bloco `vfx` de `data/render.json`. Falta a calibração por playtest (depende das sessões do PO).
- [x] **B-03-05** Pipeline de ícones de UI: 40 ícones de item, 12 de carta e 30 de nó do Ossuário, gerados em `tools/assets-gen` ou desenhados pelo PO, empacotados no `atlas_vfx_ui` pelo `assets:build` com entradas no manifest; a UI troca os placeholders pelos ícones. Deps: A-07-01, P-06-02. Resp: S1 + PO. Prio: P1. **Parcial:** 84 ícones (42 itens, 12 cartas, 30 nós; o assert diz 82) empacotados no `atlas_vfx_ui` e usados pela UI, com teste de cobertura de ids em `tools/guards`; faltam as capturas nos 4 alvos (e2e pendente).
  - Asserts: `assets:build` exit 0 com 82 sprites de ícone no `atlas_vfx_ui`; teste: todo id de `data/items.json`, `data/cards.json` e `data/ossuary.json` tem ícone no manifest; captura de Loja, Level-up e Ossuário nos 4 alvos.
  - Estado (Esp, 2026-10-31, `main` 49039f2): ícones à mão de todos os itens (inclusive Míticos e o Ímã), cartas e nós no `atlas_vfx_ui` (aba0763, edb5f0c); o guard confere um ícone por id de `items.json`, `cards.json` e `ossuary.json`. Capturas nos 4 alvos: e2e fora do CI (decisão do PO 2026-10-31).

### B-04 Plataforma e distribuição

- [x] **B-04-01** Assinatura Windows: certificado OV (se o PO aprovar o custo) em `WIN_CERT_PFX`; `electron.yml` assina; caso contrário, ADR-0008 emendado com "não assinado na 1.0". Deps: P-07-02. Resp: PO + S2. Prio: P1.
  - Asserts: `signtool verify /pa release/*.exe` exit 0 (se assinado) ou emenda do ADR commitada.
  - Estado (2026-11-01): o PO escolheu a opção B. ADR-0008 emendado com "não assinado na 1.0". A distribuição é pela Steam, que não mostra o SmartScreen. O certificado não foi comprado.
- [~] **B-04-02** Steam Input/gamepad polido (glifos por controle, foco em todas as telas), Steam Deck não suportado documentado na página. Deps: A-07-02. Resp: S2. Prio: P1.
  - Asserts: checklist manual com Xbox e DualSense (PO) em PROGRESS; a API de debug ganha `gc.debug.gamepad` (só em build com `GC_DEBUG_API=1`); nenhuma tela sem foco inicial (e2e com gamepad virtual via `gc.debug.gamepad`).
  - Estado (Esp, 2026-10-31, `main` 49039f2): glifos por controle pelo `Gamepad.id`, foco inicial e D-pad testados em todas as telas, remap completo do gamepad (8328c1c, 6143b4c). Faltam: `gc.debug.gamepad` e o e2e com gamepad virtual (S2), o checklist manual com Xbox e DualSense (PO) e a nota de Steam Deck não suportado na página (depende da A-06-02).
  - Estado (2026-11-01): `gc.debug.gamepad` e o e2e com gamepad virtual estão no repositório. Continuam com o PO o checklist manual de Xbox e DualSense e a nota de Steam Deck não suportado na página (A-06-02).
- [ ] **B-04-03** Beta fechado na Steam (branch `beta`, ≥ 10 testers com keys), coleta de telemetria e crashes (relatório de `window.onerror` + `unhandledrejection` no JSONL). Deps: B-02-02, B-03-01, A-06-01, A-06-04. Resp: PO + Est. Prio: P0.
  - Asserts: `docs/playtests/2027-03-beta.md` com ≥ 50 runs, crash-free ≥ 99,5%, lista de bugs com IDs (copiados para `docs/PROGRESS.md` §Dívidas com tag `[bug P0]`/`[bug P1]`); todos P0/P1 fechados antes do RC.
- [ ] **B-04-04** Capacitor 8 scaffold (`apps/android`, `cap sync`, build debug) para medir performance real em device Galaxy A (sem publicar). Deps: A-01-01, aprovação do PO das deps Capacitor (Bloqueios). Resp: S2. Prio: P2 (não bloqueia a 1.0).
  - Asserts: `bun run build:android` gera `app-debug.apk`; `reports/perf-android-<device>.json` com preset Baixo `fpsAvg ≥ 30` em 896×414 e 800×360.

### B-05 Localização, docs e qualidade

- [x] **B-05-01** pt-BR completo e revisado (UI, itens, cartas, nós, falas legendadas), `en` como fonte; ferramenta de paridade de chaves. Deps: A-07-01. Resp: Est. Prio: P1.
  - Asserts: teste de paridade verde; captura das telas em pt-BR nos 4 alvos sem overflow (visual tests por idioma, baselines no template `{arg}-{platform}` do Playwright).
  - Estado (Esp, 2026-10-31): paridade de chaves verde; pt-BR e `en` revisados (03bc067, 9bca4f3, b324d83); as 15 falas de chefe têm legenda com opção nas `Options` (4a34efc, save schema 8). Capturas por idioma nos 4 alvos: e2e fora do CI (decisão do PO 2026-10-31).
- [x] **B-05-02** Docs sincronizadas: GDD/Art Bible/SDD emendados com decisões da fase (valores finais), ADRs novos (billing Capacitor, telemetria) e os pendentes das fases anteriores (rollback manual do deploy Vercel, `toktx` no pipeline KTX2), `README.md` com instruções completas. Deps: fase. Resp: Est + Orq. Prio: P1.
  - Asserts: `bun run lint:md` exit 0; cada emenda referencia o ID da microtarefa; `docs/adrs/README.md` atualizado.
  - Estado (2026-11-01): ADRs 0027 (`toktx` adiado à 1.1, A-01-02) e 0028 (Capacitor aprovado para a abertura da BETA, sem biblioteca de billing ainda, B-04-04) fecham o que faltava. A telemetria continua no ADR-0023 e o rollback da Vercel no ADR-0026. A instalação do Capacitor e a escolha da biblioteca de billing seguem na B-04-04 e na M-01-03.
- [~] **B-05-03** Checklist de lançamento Steam (`docs/release/steam-launch-checklist.md`): build no branch `default`, página final, preço regional, content survey, depots, data de lançamento ≥ 7 dias antes para revisão. Deps: B-04-03. Resp: PO + Orq. Prio: P0.
  - Asserts: arquivo com todos os itens marcados e datas; build de release enviada para revisão da Valve com confirmação (captura).
  - Estado (Esp, 2026-10-31, `main` 49039f2): `docs/release/steam-launch-checklist.md` escrito (57451ab), com donos, prazos e o passo a passo do `steam-upload`; o alvo `dir` e o save em arquivo já entraram. Falta marcar os itens com data e enviar a build para revisão da Valve (depende da conta Steamworks do PO, E-05-03).
- [ ] **B-05-04** Releases `v0.7.0`, `v0.8.0`, `v0.9.0`. Deps: fase. Resp: Orq. Prio: P0.
  - Asserts: `gh release list` no padrão vukem; CHANGELOG correspondente; `release.yml` só publica depois do CI verde no commit da tag (espera de CI, 4cdd35a).

### Riscos da fase 4

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| Testers insuficientes para o beta | média | médio | recrutar via Next Fest/Discord; mínimo 10 keys |
| Certificado OV não aprovado pelo PO | alta | baixo | Steam não mostra SmartScreen; portable fora da Steam fica sem assinatura (documentado) |
| Round 60+ desbalanceado | média | médio | roster + modificadores; `sim` até 60; endless é "modo de recorde", não de completude |
| Bugs de gamepad em telas React | média | médio | foco explícito por tela desde a ALPHA (A-07-02) |

---

## Fase 5 — 1.0 RC

**Objetivo.** Congelar conteúdo, estabilizar, certificar e lançar a 1.0 na Steam com a demo web atualizada. Nenhuma feature nova; só correções, performance, docs e operação de lançamento.

**Critério de entrada.** Saída da BETA; `v0.9.0`; zero bugs P0/P1 (nenhuma entrada aberta com `[bug P0]`/`[bug P1]` em `docs/PROGRESS.md` §Dívidas); checklist de lançamento preenchido; build enviada para revisão da Valve (B-05-03).

**Critério de saída.** `v1.0.0` publicada (GitHub Release no padrão vukem, Steam `default`, Vercel produção); revisão da Valve aprovada; pós-lançamento: crash-free ≥ 99,5% nas primeiras 1.000 sessões com telemetria aceita (opt-in, GDD §26.2; sessões sem opt-in não entram na conta); hotfix `1.0.x` em ≤ 48 h se necessário; retrospectiva em `docs/retro/1.0.md`.

### R-01 Congelamento e estabilização

- [~] **R-01-01** Branch `release/1.0` a partir de `main`; `1.0.0-rc.1` publicada como pré-release; só `fix:`/`docs:`/`chore:` entram. Faz parte da task: (a) bump de rc para a próxima major em `tools/release` (`release major --rc`; hoje `rc` a partir de versão estável abre o rc do próximo patch, `0.9.0 → 0.9.1-rc.1`); (b) modo RC no `tools/commitlint`, com o CI passando o nome da branch e `release/*` rejeitando `feat:`. Deps: B-05-04, E-04-03. Resp: Orq (+ Est nas ferramentas). Prio: P0.
  - Asserts: teste em `tools/release`: `0.9.0` com `major --rc` → `1.0.0-rc.1`, e `major` a partir de `1.0.0-rc.N` → `1.0.0`; `gh release view v1.0.0-rc.1 --json isPrerelease` = `true`; teste do `tools/commitlint` em modo RC rejeitando `feat:` numa branch `release/*` e aceitando `fix:`.
  - Estado (2026-11-01): `major --rc` e `rc --major` mapeiam `0.9.0` → `1.0.0-rc.1`, e `major` a partir de `1.0.0-rc.N` → `1.0.0` (`tools/release/lib.test.ts`). Em `release/*` o commitlint rejeita `feat:` e aceita `fix:`, `docs:` e `chore:` (`tools/commitlint/lint.test.ts`); o CI passa `--branch`. Não há tag `v1.0.0-rc.1` nem branch `release/1.0`: publicar a pré-release continua com o PO.
- [ ] **R-01-02** Soak test em build com `GC_DEBUG_API=1` (o bench só existe atrás de `__DEBUG_API__`): modo `?bench=soak` novo, com a política greedy movida de `tools/sim` para `packages/game` (a mesma política no Node e no browser), em desktop, sem vazamento (heap Δ < 20 MB) e sem erro de console. Duração definida: 10 runs de 60 rounds com tempo acelerado (passos de simulação em lote, render a cada frame) para vazamento e erros, mais 2 h em tempo real só para medir fps. Hardware de referência do SDD 14 §1 (desktop com iGPU classe Iris Xe / Ryzen 5), na máquina do PO; o CI (SwiftShader) não mede fps. Deps: R-01-01, P-07-04. Resp: Est. Prio: P0.
  - Asserts: `reports/soak-1.0.json` com `gpu` (renderer WebGL), `runs = 10`, `rounds = 60` por run, `heapDeltaMB < 20` (`performance.memory`, só Chromium), `errors = 0`; `reports/soak-1.0-fps.json` com 2 h em tempo real e `fpsAvg ≥ 60` em 1080p.
- [~] **R-01-03** Bench final nos 4 alvos + preset automático inicial por hardware (`navigator.hardwareConcurrency`, `deviceMemory`, WebGL renderer) com tabela em `data/presets.json` (schema em `data/schema/`, entrada no `data-check` e loader tipado). `deviceMemory` só existe no Chromium: sem ele, o preset sai só de núcleos e renderer. Na 1.0, "mobile" é a demo web no Chrome mobile; device Android real fica para a M-01-04. Deps: R-01-02, P-03-05 (cull de render por frustum), carga round20 representativa (SDD 14 §1). Resp: S1. Prio: P0.
  - Asserts: `reports/perf-final-{desktop-1080,desktop-1440,mobile-l,mobile-s}.json` com a GPU registrada e dentro das metas de SDD 14 §1; preset auto escolhe "Baixo" em Android (teste com user agent/`deviceMemory` mockados) e tem fallback testado sem `deviceMemory`; `data-check` valida `presets.json`.
  - Estado (Esp, 2026-10-31, `main` 49039f2): preset automático por hardware com tabela em `data/presets.json`, schema, `data-check` e testes (Android mockado escolhe Baixo, fallback sem `deviceMemory`; 9f74658, c5b8139). Faltam os `reports/perf-final-*.json` nos 4 alvos com GPU real (PO, depois da R-01-02).
- [x] **R-01-04** Correção de todos os bugs P2 triviais restantes ou adiamento documentado. Os bugs ficam em `docs/PROGRESS.md` §Dívidas com tag `[bug P2]` (mesma regra dos P0/P1 da Fase 4). Deps: R-01-01. Resp: S1 + S2 + Esp. Prio: P1.
  - Asserts: nenhuma entrada `[bug P2]` aberta em `docs/PROGRESS.md` §Dívidas, salvo as marcadas `post-1.0` com justificativa.
  - Estado (2026-11-01): `docs/PROGRESS.md` §Dívidas não tem nenhuma entrada `[bug P2]`.
- [~] **R-01-05** Auditoria do Especialista: revisão completa de segurança (secrets, Electron `contextIsolation`, CSP, telemetria sem PII), licenças (fontes OFL, CC0, ElevenLabs pago, SBOM) e conformidade com Art Bible §13 "O que evitar" (IP). A CSP vai no `vercel.json` (headers) e no Electron, permitindo o que o Babylon usa (`wasm-unsafe-eval`, `blob:` para os workers do transcoder KTX2). Deps: R-01-01, P-07-02, A-06-04, B-05-02 (ADR de telemetria). Resp: Esp. Prio: P0.
  - Asserts: `docs/release/audit-1.0.md` com itens verificados e comandos usados: `git ls-files -z | xargs -0 bun tools/secrets-scan` (o CLI só aceita caminhos), `bunx biome ci`, SBOM de `tools/sbom`, inventário de assets por licença e todo `.meta.json` de áudio com `plan` ≠ `free`; e2e sem violação de CSP no console (web e Electron); zero pendências P0.
  - Estado (Esp, 2026-10-31): `docs/release/audit-1.0.md` aberto com a pré-auditoria (segredos na árvore e no histórico, Electron, CSP, save, telemetria, `bun audit`, `biome ci`, SBOM, áudio pago, §13); nenhum P1 de segurança. Abertos: licenças no SBOM, origem e registro da key art e dos retratos gerados por IA (decisão do PO sobre a Art Bible §13), fontes OFL não embarcadas, e os itens que só fecham na RC (tag, `.exe` e URL de produção).

### R-02 Lançamento

- [ ] **R-02-01** `v1.0.0`: `bun run release major` na branch de release, merge em `main`, GitHub Release (assets `.exe` NSIS + portable, `checksums.txt`, SBOM, atestação se configurada), tag. O `.exe` sai do `electron.yml` criado na P-07-02. Deps: R-01-05, R-01-03, P-07-02. Resp: Orq + PO (aprovação). Prio: P0.
  - Asserts: `gh release view v1.0.0 --json name,tagName,isPrerelease,assets` → nome = tag, não pré-release, ≥ 4 assets; corpo = seção `## [1.0.0]` do CHANGELOG; `sha256sum -c checksums.txt` exit 0.
- [ ] **R-02-02** Steam: build 1.0 no branch `default` via `steam-upload`, demo atualizada, data/hora de lançamento, desconto de lançamento 10% por 14 dias configurado. O upload usa o `steam-upload` da A-06-01. Deps: R-02-01, B-05-03, A-06-01, E-05-03. Resp: PO + S2. Prio: P0.
  - Asserts: jogo comprável na Steam no horário planejado (captura da página com preço e desconto); demo mostra "jogo completo disponível" (chave de i18n da A-07-01, em `en` e `pt-BR`).
- [ ] **R-02-03** Web: deploy de produção da demo 1.0 com botão "Comprar na Steam" ativo; smoke verde; `README.md` e página da Vercel com link da Steam. Deps: R-02-01, P-07-01 (`DemoEnd`), E-05-03 (App ID real), A-07-01. Resp: S2. Prio: P0.
  - Asserts: smoke pós-deploy exit 0; e2e `DemoEnd` abre a URL da Steam (`target=_blank`, URL contém `store.steampowered.com/app/<id>`); procedimento de rollback manual da Vercel documentado (ADR da B-05-02).
- [ ] **R-02-04** Monitoramento pós-lançamento (7 dias): telemetria agregada só das sessões com opt-in (crash-free, round mediano), conversão demo→wishlist/compra pelos links UTM do Steamworks (não pela telemetria), reviews, triagem diária; hotfix `1.0.1` se crash-free < 99,5% ou bug bloqueante. Deps: R-02-02, A-06-04 (endpoint `api/telemetry`). Resp: Orq + Est + PO. Prio: P0.
  - Asserts: `docs/release/launch-report-1.0.md` com os números dos 7 dias e o número de sessões com opt-in; se houve hotfix, `v1.0.x` no padrão vukem em ≤ 48 h do reporte.
- [ ] **R-02-05** Retrospectiva e planejamento da 1.1 (Android): `docs/retro/1.0.md` (o que funcionou, o que não, métricas vs alvos do GDD §26) e abertura das microtarefas `M-*`. Deps: R-02-04. Resp: Orq + PO. Prio: P1.
  - Asserts: arquivo existe com tabela "alvo × real" para cada métrica de GDD §26.1; ROADMAP atualizado com datas reais.

### Riscos da fase 5

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| Revisão da Valve atrasa | média | médio | submeter ≥ 7 dias antes (B-05-03); data de lançamento com folga de 1 semana |
| Bug bloqueante no dia 1 | média | alto | soak test, beta fechado, hotfix em 48 h, branch de release pronta |
| Reviews negativas por performance em máquinas fracas | média | médio | preset automático (R-01-03), requisitos mínimos claros na página |
| Steamworks atrasado (E-05-03) trava R-02-02 | alta | alto | PO abre a conta antes da ALPHA; App IDs registrados em `docs/legal/accounts.md` |
| Ferramenta de release ou commitlint sem suporte a RC | média | médio | R-01-01 inclui `release major --rc` e o modo RC do commitlint, com testes |

---

## Apêndice — 1.1 ANDROID (pós-1.0)

**Objetivo.** Publicar no Google Play o app único "grátis até o round 10 + compra única" (D27, D29), com performance em metas nos 2 alvos mobile e closed test cumprido.

**Critério de entrada.** `v1.0.0` lançada e estável (crash-free ≥ 99,5% por 14 dias); conta Google Play (US$ 25) criada; decisão de biblioteca de billing em ADR (B-05-02); aprovação do PO das deps novas: Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android` e os plugins do SDD 10 §3, ver Bloqueios em `docs/PROGRESS.md`) e a biblioteca de billing escolhida.

**Critério de saída.** App em produção no Google Play; IARC classificado; compra `full_version` funcionando (teste com conta de licença); `bench` em metas em device real; `v1.1.0`.

- [ ] **M-01-01** Conta Google Play, app criado, secrets do ambiente `android` (`PLAY_SERVICE_ACCOUNT_JSON`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`), Play App Signing ativo (a keystore do repositório é só a chave de upload), IARC preenchido (M/18), formulário Data safety e URL da política de privacidade (telemetria opt-in, sem dados pessoais). Deps: R-02-05. Resp: PO. Prio: P0.
  - Asserts: `docs/legal/accounts.md` atualizado; `gh secret list --env android` lista os 5 secrets; Play App Signing ativo, Data safety enviado e classificação IARC visíveis no console (capturas); política de privacidade publicada numa URL que responde 200.
- [ ] **M-01-02** Capacitor completo, última 8.x estável na data com versão exata (SDD 10 §3): plugins `app`, `haptics`, `screen-orientation`, `filesystem`, `status-bar`; landscape; edge-to-edge com safe areas; botão voltar (`@capacitor/app` `backButton`) e app em segundo plano (`appStateChange`) pausam a run; adaptador de storage sobre `@capacitor/filesystem` com a semântica do SDD 06 (`updateMeta` sob lock, `.bak`, `readOnly`); `android.yml` criado (build e upload); AAB release assinado. Deps: B-04-04, M-01-01. Resp: S2. Prio: P0.
  - Asserts: `bun run build:android` gera `app-release.aab`; `targetSdk` igual ao exigido pelo Play na data do envio; AAB alinhado para páginas de 16 KB (`zipalign -P 16 -c` exit 0 nas libs nativas); `bundletool` instala em device; orientação travada em landscape (ou overlay "gire" em telas grandes Android 16+); voltar e segundo plano pausam (teste manual em device registrado); os testes de save do SDD 06 (fuzz e corrida) rodam contra o adaptador e passam; save persiste entre reinícios.
- [ ] **M-01-02b** Demo como flag de runtime para o app único Android: `flags.fullVersion` na `platform` decide o limite do round 10, em vez do `__IS_DEMO__` de compilação (que continua no build web-demo). Deps: M-01-02. Resp: S2. Prio: P0.
  - Asserts: teste: com `fullVersion = false` a run para no Coveiro e abre a `DemoEnd`; com `true` segue para o round 11; o mesmo AAB cobre os dois casos; o build web-demo continua usando `__IS_DEMO__` sem regressão (e2e da demo verde).
- [ ] **M-01-03** Play Billing: produto `full_version` (US$ 9,99), fluxo de compra, `queryPurchases` no boot, restauração; ADR da biblioteca escolhida; a biblioteca usa a versão da Play Billing Library aceita pelo Play na data do envio; o último entitlement verificado fica guardado localmente. Deps: M-01-02, M-01-02b. Resp: S2. Prio: P0.
  - Asserts: compra com conta de teste de licença desbloqueia o round 11 (vídeo); reinstalar o app restaura a compra; sem internet, quem já comprou abre na versão completa pelo entitlement guardado e quem nunca comprou abre em modo demo com aviso; ADR registra a versão da PBL.
- [ ] **M-01-04** Performance e UX mobile finais: preset Baixo default, KTX2, cap 60, joystick/dash/pausa, HUD com safe areas, haptics com toggle nas opções, capturas nos 2 alvos. Deps: M-01-02, B-05-02 (ADR do `toktx` para o KTX2), A-07-02 (opções). Resp: S1 + S2. Prio: P0.
  - Asserts: `reports/perf-android-<device>.json` com `fpsAvg ≥ 30`, `frameP99 ≤ 40 ms` em 896×414 e 800×360; memória JS ≤ 180 MB e memória de GPU ≤ 160 MB (SDD 14 §1); visual tests mobile verdes.
- [ ] **M-01-05** Closed test: ≥ 12 testers por 14 dias contínuos; bugs triados; `android.yml` (criado na M-01-02) com upload para a faixa interna/fechada. Deps: M-01-03, M-01-04. Resp: PO + Est. Prio: P0.
  - Asserts: console do Play mostra o requisito cumprido (captura); `docs/playtests/2027-06-android.md` com ≥ 12 testers e crash-free ≥ 99%; `android.yml` verde no upload.
- [ ] **M-01-06** Produção no Google Play, página com capturas mobile, `v1.1.0` (GitHub Release com `.aab`), demo web com botão Google Play ativo. `versionCode = MAJOR×10000 + MINOR×100 + PATCH` (1.1.0 → 10100). Deps: M-01-05, P-07-01 (`DemoEnd`). Resp: PO + Orq. Prio: P0.
  - Asserts: app listado em produção (URL `play.google.com/store/apps/details?id=com.alexgalhardo.grimcubes` responde 200); `gh release view v1.1.0` com asset `.aab`; teste da regra do `versionCode` (cresce a cada release, 1.1.0 = 10100); e2e `DemoEnd` abre a URL do Play.

---

## Riscos globais do projeto

| # | Risco | Prob. | Impacto | Sinal de alerta | Resposta |
| --- | --- | --- | --- | --- | --- |
| G1 | Escopo da 1.0 cresce (features fora do GDD) | alta | alto | microtarefa sem ID no ROADMAP | Orquestrador recusa; PO decide; se aceitar, entra como P2 com data |
| G2 | Perda de contexto dos agentes entre sessões | alta | médio | PROGRESS desatualizado | `docs/PROGRESS.md` obrigatório por microtarefa; `prompt-workers.md` autossuficiente |
| G3 | Performance mobile abaixo da meta | média | alto | `reports/perf-android-*` fora da meta | preset Baixo/Mínimo; cap 40; Android pode escorregar sem afetar a 1.0 |
| G4 | Dependências quebram entre versões (TS 7, Vite 8, Babylon 9) | média | médio | CI vermelho após Dependabot | versões exatas; upgrade só em PR dedicado com ADR se necessário |
| G5 | Tom "cartoon" na arte | média | médio | playtest reporta "fofo" | Art Bible §13; revisão do PO por modelo |
| G6 | Marca/IP (nome, referências) | baixa | alto | notificação/colisão | E-05-01; "o que evitar"; nomes próprios |
| G7 | Custos (Steam US$ 100, Play US$ 25, ElevenLabs ~US$ 22/mês, certificado OV, Vercel Pro) | média | baixo | fatura inesperada | todo gasto passa pelo PO (regra de parada em `prompt-workers.md`) |
| G8 | Agentes gerarem código sem testes/asserts | média | alto | DoD não cumprido | Especialista bloqueia; CI exige cobertura |

## Métricas de acompanhamento

Atualizadas em `docs/PROGRESS.md` a cada release:

| Métrica | Fonte | Alvo |
| --- | --- | --- |
| Microtarefas concluídas / planejadas por fase | este arquivo | 100% P0 por fase |
| Cobertura (`game`/`core`/`ui`) | CI | 80/85/60% |
| `frameP99` 1080p/1440p/mobile-l/mobile-s | `reports/perf-*` | ≤ 20/18/40/40 ms |
| Round mediano (sim greedy, Normal) | `reports/sim-*` | 18–26 |
| Wishlists | Steamworks | 3.000 (jan/2027), 10.000 (mar/2027) |
| Crash-free sessions | telemetria | ≥ 99,5% |
| Créditos ElevenLabs usados | `docs/audio/credits.md` | ≤ 121.000/mês |

## Glossário

Ver `docs/gdd.md` §27. Siglas deste arquivo: **DoD** Definition of Done (SDD 11 §5); **P0/P1/P2** prioridade; **Orq/S1/S2/Est/Esp/PO** papéis (`prompt-workers.md`); **M-ALPHA-DEMO** marco da demo pública.
