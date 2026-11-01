# SDD 12 — CI/CD (GitHub Actions)

Actions pinadas por versão (`docs/web-search.md` §5.1): `actions/checkout@v7`, `oven-sh/setup-bun@v2`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`, `actions/cache@v6`, `github/codeql-action@v4`. Concurrency por ref (`cancel-in-progress` só em `pull_request`; runs de `main` nunca são cancelados). Runners `ubuntu-latest` (Linux) para tudo exceto Electron (`windows-latest`).

## 1. Workflows

| Arquivo | Gatilho | Jobs |
| --- | --- | --- |
| `ci.yml` | `pull_request`, `push` em `main` | `gate` (outputs `web`/`e2e` pela presença de `apps/web/vite.config.ts` e `playwright.config.ts`, porque `hashFiles` não funciona em `if` de job) e, em paralelo depois dele, `lint` (`biome ci`, markdownlint, lint-extra, data:check), `typecheck`, `unit` (`vitest run --project "unit*" --coverage`, artefato `coverage/`), `integration` e `build-web` (`data:check`, `assets:build`, vite build web-demo com `GC_DEBUG_API=1`, artefato `dist/`; esse `dist` só serve ao e2e) → `e2e` (container `mcr.microsoft.com/playwright:v1.64.1-noble`, Bun via `npm install -g bun@<versão>` porque a imagem não tem `unzip`, usa `dist/`; dividido em 4 shards paralelos com `--shard=N/4`, um runner por shard, porque o SwiftShader satura um runner com um navegador só e mais workers no mesmo runner não aceleram; artefato `playwright-report-N`). O job `visual` separado não existe: as capturas rodam dentro do e2e. Cache de `~/.bun/install/cache` por `hashFiles('bun.lock')`. |
| `balance.yml` | `pull_request` com mudanças em `data/**` ou `packages/game/**`; `workflow_dispatch` | `sim` (500 runs × 3 dificuldades; publica relatório Markdown como comentário no PR; falha fora das faixas). Provisório até P-07-04 (não existe). |
| `assets.yml` | `pull_request` com mudanças em `assets/src/**` | `assets-build` (valida e gera duas vezes; falha se as saídas divergirem, sem comparar com arquivos versionados, porque `public/assets/` é ignorado pelo git). Provisório: ainda não existe; hoje o `assets:build` roda dentro do `build-web` do `ci.yml`, e o determinismo é coberto pelos testes unitários. |
| `deploy-web.yml` | `deployment_status` (o deploy é feito pela integração GitHub da Vercel: preview por PR, produção em `main`) | `smoke` só quando o deploy de `Production` termina com `success`: container Playwright, `bun run test:smoke -- --url <target_url>` com `VERCEL_AUTOMATION_BYPASS_SECRET`, artefato `reports/smoke.png`. Não faz `vercel deploy` nem rollback automático (rollback é manual, pelo dashboard ou `vercel rollback`). |
| `electron.yml` | `workflow_dispatch`, tag `v*` | `build-win` em `windows-latest`: `bun run build:electron`, assina se `WIN_CERT_PFX` existir, artefato `release/*.exe`; job opcional `steam-upload` (manual, `environment: steam`, `steamcmd`). Provisório até P-07-02. |
| `android.yml` (1.1) | `workflow_dispatch`, tag `v*` | `bundle` (JDK 17, Android SDK 36, `bun run build:android`, assina AAB com `ANDROID_KEYSTORE`), artefato `.aab`; upload para Play interno via `r0adkll/upload-google-play` `[versão a fixar na fase BETA]`. Provisório até M-01-02. Hoje `build:android` gera só o APK de debug; o job assinado ainda não existe. |
| `release.yml` | tag `v*` | job único com `contents: write` e `actions: read`: checkout sem credenciais persistidas, `setup-bun` pinado por SHA, confere tag = `v` + versão do `package.json`, exige CI verde no commit da tag, build (`data:check` e, se houver app web, `bun run build`), `bun tools/sbom/index.ts --out release-assets` (SBOM + `checksums.txt`), notas = `bun tools/release/index.ts notes <versão>`, `gh release create --verify-tag` (`--prerelease` em `-rc.N`). Os assets `.exe`/`.aab` entram com P-07-02/M-01-02. A checagem de CI verde ainda corre contra o próprio CI do commit da tag; a espera pelo run é provisória até a correção do Est. |
| `codeql.yml` | semanal (segunda, 03:17 UTC) + PR | análise estática JS/TS (`github/codeql-action@v4`, `build-mode: none`), `permissions: {}` no topo e só `actions: read`, `contents: read` e `security-events: write` no job |
| `update-snapshots.yml` | `workflow_dispatch` | gera as baselines Linux de `tests/visual/__screenshots__/` no container de CI e as publica como artefato para commit. Provisório: ainda não existe (a correção das baselines por plataforma está com o Est). |

## 2. Cache e tempo

- `setup-bun@v2` só instala o Bun; o cache de dependências é `actions/cache@v6` em `~/.bun/install/cache` com chave `hashFiles('bun.lock')`; `bun install --frozen-lockfile`.
- Playwright: imagem oficial evita `install --with-deps`.
- Alvo: `ci.yml` < 10 min; `balance.yml` < 12 min; `electron.yml` < 20 min.

## 3. Segredos e ambientes

| Secret | Uso | Ambiente |
| --- | --- | --- |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | deploy web | `production` |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_PLAN` | `audio:generate` manual (`workflow_dispatch` com aprovação) | `audio` (required reviewers: PO) |
| `WIN_CERT_PFX`, `WIN_CERT_PASSWORD` | assinatura Windows | `release` |
| `STEAM_BUILD_ACCOUNT`, `STEAM_CONFIG_VDF`, `STEAM_APP_ID`, `STEAM_DEMO_APP_ID` | upload Steam | `steam` (required reviewers: PO) |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON` | Android | `android` |

Regras: ambientes com `required reviewers` para qualquer job que gaste dinheiro ou publique; `permissions` mínimos por job (`contents: read` default; `contents: write` só em `release.yml`); nenhum secret em logs (`::add-mask::`); `persist-credentials: false` no checkout de jobs com escrita; Dependabot para actions e npm com `versioning-strategy: increase` e PRs semanais (versões exatas mantidas), provisório até E-01-06 (`.github/dependabot.yml` ainda não existe). Secrets em uso hoje: `VERCEL_AUTOMATION_BYPASS_SECRET` (smoke) e o `GITHUB_TOKEN` do release. Os `VERCEL_TOKEN/ORG_ID/PROJECT_ID` da tabela não são usados enquanto o deploy for pela integração da Vercel.

## 4. Proteção de branch

`main` protegida: PR obrigatório, `ci.yml` verde, 1 aprovação (o Orquestrador, na prática o PO ou o Especialista conforme `prompt-workers.md`), histórico linear (squash ou rebase), sem force-push, tags só por `release`. A configuração no GitHub é provisória até E-01-06 (ação do PO); hoje o Orq integra direto em `main` depois da revisão do Especialista.
