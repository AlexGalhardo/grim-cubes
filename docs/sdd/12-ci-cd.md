# SDD 12 — CI/CD (GitHub Actions)

Actions pinadas por versão (`docs/web-search.md` §5.1): `actions/checkout@v7`, `oven-sh/setup-bun@v2`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`, `actions/cache@v6`, `github/codeql-action@v4`. Concurrency por ref (`cancel-in-progress` só em `pull_request`; runs de `main` nunca são cancelados). Runners `ubuntu-latest` (Linux) para tudo exceto Electron (`windows-latest`).

## 1. Workflows

| Arquivo | Gatilho | Jobs |
| --- | --- | --- |
| `ci.yml` | `pull_request`, `push` em `main` | `lint` (biome ci, markdownlint, lint-extra, data:check) → `typecheck` → `unit` (vitest + cobertura, artefato `coverage/`) → `integration` → `build-web` (vite build web-demo, artefato `dist/`) → `e2e` (container `mcr.microsoft.com/playwright:v1.64.1-noble`, usa `dist/`, artefato `playwright-report/`) → `visual` (só se `packages/ui/**` mudou) |
| `balance.yml` | `pull_request` com mudanças em `data/**` ou `packages/game/**`; `workflow_dispatch` | `sim` (500 runs × 3 dificuldades; publica relatório Markdown como comentário no PR; falha fora das faixas) |
| `assets.yml` | `pull_request` com mudanças em `assets/src/**` | `assets-build` (valida e gera; gera duas vezes e falha se as saídas divergirem (determinismo), sem comparar com arquivos versionados: `public/assets/` é ignorado pelo git; era: a saída é commitada) |
| `deploy-web.yml` | `deployment_status` com `state == success` e `environment == Production` (nome usado pela integração Vercel; **a confirmar no 1º deploy real**) | `smoke` (Playwright, `bun run test:smoke -- --url <target_url>`) contra a URL do deploy. O deploy e o preview por PR são feitos pela integração Vercel/GitHub, não por este workflow; com a Deployment Protection ativa, o smoke usa `VERCEL_AUTOMATION_BYPASS_SECRET` (headers `x-vercel-protection-bypass` e `x-vercel-set-bypass-cookie`, enviados só à mesma origem). **Dívida:** rollback automático (`vercel rollback`) em caso de smoke vermelho não está implementado. |
| `electron.yml` | `workflow_dispatch`, tag `v*` | `build-win` em `windows-latest`: `bun run build:electron`, assina se `WIN_CERT_PFX` existir, artefato `release/*.exe`; job opcional `steam-upload` (manual, `environment: steam`, `steamcmd`) |
| `android.yml` (1.1) | `workflow_dispatch`, tag `v*` | `bundle` (JDK 17, Android SDK 36, `bun run build:android`, assina AAB com `ANDROID_KEYSTORE`), artefato `.aab`; upload para Play interno via `r0adkll/upload-google-play` `[versão a fixar na fase BETA]` |
| `release.yml` | tag `v*` | cria GitHub Release no padrão vukem (SDD 13): corpo = seção do CHANGELOG, assets = `.exe`, `.aab` (quando houver), `checksums.txt`, SBOM (`bun tools/sbom`) |
| `codeql.yml` | semanal + PR | análise estática JS/TS (CodeQL) |

## 2. Cache e tempo

- `setup-bun` com cache habilitado; `bun install --frozen-lockfile`.
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

Regras: ambientes com `required reviewers` para qualquer job que gaste dinheiro ou publique; `permissions` mínimos por job (`contents: read` default; `contents: write` só em `release.yml`); nenhum secret em logs (`::add-mask::`); Dependabot para actions e npm com `versioning-strategy: increase` e PRs semanais (versões exatas mantidas).

## 4. Proteção de branch

`main` protegida: PR obrigatório, `ci.yml` verde, 1 aprovação (o Orquestrador, na prática o PO ou o Especialista conforme `prompt-workers.md`), histórico linear (squash ou rebase), sem force-push, tags só por `release`.
