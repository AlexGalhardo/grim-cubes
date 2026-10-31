# PROGRESS

Atualizado: 2026-10-31 (fuso do PO) | Versão: 0.1.0 (publicada, tag `v0.1.0` em eb12bc2; `main` 4a4f19b) | Fase: 2 — PROTÓTIPO (itens da ALPHA adiantados em paralelo) | Sessão: #2

Meta do PO (2026-10-31): implementar o ROADMAP até o fim sem interrupções; tarefas `Resp: PO` ficam em Bloqueios e os agentes seguem com o resto. Hooks lefthook instalados em `.git` (valem para todos os worktrees).

## Agentes

| Agente | Tarefa atual | Branch | Estado | Desde | Lock |
| --- | --- | --- | --- | --- | --- |
| Orq | integra as branches dos agentes na `main`; CHANGELOG | main | em andamento | — | — |
| S1 | R-01-03 (ligar `pickAutoPreset` no `main.tsx`) → render dos chefes 4 e 5 | — | implementando | — | — |
| S2 | B-01-01 Caçador Alfa e B-01-02 Rainha do Ninho (parte de simulação) | `feat/B-01-01-hunter-alpha-queen` | implementando | — | — |
| Est | testes de UI com `en` (Notice, nomes de chefe) → próximo `[ ]` de Resp Est sem dependência do PO | — | implementando | — | — |
| Art | herói no Blockbench via MCP (`docs/art/briefs/hero.md`) | — | implementando | — | — |
| Esp | reconciliação do ROADMAP (§15.1) → auditoria de eb12bc2..HEAD | main (sem git) | em andamento | — | `ROADMAP.md`, `docs/PROGRESS.md` |

As linhas de S1, S2, Esp e Orq refletem as últimas mensagens do Orq e podem estar defasadas; o Orq confirma ao integrar.

Estado (2026-10-31): `origin/main` está em eb12bc2 e é a **v0.1.0 publicada** (release no GitHub, tag `v0.1.0`). Entraram nela i18n (`t()`, `locales/en.json` e `pt-BR.json`, regra de lint contra texto fixo na UI), as dicas do round 1, `rc-major` no `tools/release`, thresholds de cobertura por pacote e o timeout do data-check. **Por decisão do PO, o e2e (Playwright) está desligado no CI** (CI rápido): os specs e as baselines continuam no repositório e rodam localmente; não gere baselines nem rode e2e sem o Orq pedir. A `feat/A-01-03-perf-ci` (job de bench no CI, +10 a 15 min) não entra por enquanto, pela mesma razão. Já existem o Coveiro e a Matriarca (padrões por id, A-03-00), os 8 behaviors de inimigo, elites com render, Ossuário com dash e bônus da Ruína, dificuldades, marcos, VFX (P-04-05), culling por frustum e os headers de segurança da Vercel.

Dívida operacional: com 4 agentes rodando testes ao mesmo tempo, a CPU satura e o `pre-push` falha por timeout de worker (a suíte isolada passa). Solução adotada: janela de push (um agente por vez) e timeout de 20 s nos testes de simulação e determinismo (a2cdbad); o oráculo do VAT ainda pode estourar 5 s sob carga. Não contornar o hook.

Risco: conversor `.bbmodel` validado só contra o próprio pipeline e o Babylon; falta golden contra um export real do Blockbench (quando o PO refinar o 1º modelo).

Blockbench MCP: o servidor está instalado (skill `blockbench-art` e agente `blockbench-artist` existem), mas **o plugin do Blockbench não responde**; em investigação. Até lá, os modelos seguem gerados por `bun run assets:gen`.

Pendência do PO: secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Deployment Protection → Protection Bypass for Automation; e `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET`) para o smoke pós-deploy (E-04-04). Continua pendente em 2026-10-31 08:51: sem ele, o smoke de produção (que agora também falha com a API de debug viva, ff185d9) não roda.

Vercel: build corrigido (3721471: `--config apps/web/vite.config.ts` + `vercel.json`); deploy de produção `grim-cubes-fc7qzglh5` **Ready**; URL de produção responde 302 (proteção SSO mantida, decisão B). Desde 6370507, o `vercel.json` traz CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e COOP, e revalida o `manifest.json` (os demais assets seguem `immutable`). O projeto `grim-cubes` na Vercel não tem variáveis de ambiente (conferido pela API em 2026-10-31), então `GC_DEBUG_API` fica desligado em produção.

Dívida: pós-processo ffmpeg do `audio-generate` (SDD 08 §3: LUFS, trim, pitch de chefes).

## Concluídas (últimas 20)

Fonte: IDs dos rodapés `Refs: ROADMAP#` em `origin/main` (3754bd2), ordenados pelo commit mais recente de cada ID; a coluna Commit lista até 3 commits (o mais novo primeiro) e a Observação é o assunto do mais novo. O estado de cada tarefa é o checkbox do ROADMAP.

| ID | Data | Resp | Commit | Observação |
| --- | --- | --- | --- | --- |
| R-01-01 | 2026-10-31 | Orq | 3754bd2, 59a2781 | docs(progress): record v0.1.0, e2e out of the CI, the Blockbench MCP status and the current queues |
| B-05-01 | 2026-10-31 | Est | 1167186 | feat(i18n): review the English names that came from ids |
| A-07-01 | 2026-10-31 | Est | c3e908f, 08fbb61, 9cd842d | feat(ui): add the optional 20 s tutorial (move, kill, collect) |
| A-02-04 | 2026-10-31 | S2 | 733347c, 1a61e35 | test(integration): re-anchor the seed-42 hash for breakable props and the A-02-03 data |
| E-03-04 | 2026-10-31 | Est | 5884211, be2740b, c19101c | test(data-check): allow 20 s for the self-test of every negative case |
| A-07-03 | 2026-10-31 | Est | 73f3c12 | test(coverage): set per-package thresholds just under the measured values |
| B-03-01 | 2026-10-31 | S1 + PO | fc4eb99, d6bbc59, 994ae5c | feat(art): reshape the Drowned and Hunter placeholders and paint 1 px AO on every texture |
| B-03-05 | 2026-10-31 | S1 + PO | f98b61c, ddaab57 | feat(assets): add the 84 generated UI icon stand-ins |
| P-06-01 | 2026-10-31 | S1 | 5da1ca9, 0f46944, 1ddea1d | docs(art): regenerate the review captures and silhouettes for all 74 models |
| A-02-03 | 2026-10-31 | Est | 6143170, f1c00e2, d0247de | test(game): read boss HP and contact damage from data after the A-02-03 tuning |
| E-02-06 | 2026-10-31 | Est | c268896, d97a5ea, f0f05a2 | ci(e2e): stop running the e2e job on push, PRs and releases |
| A-01-01 | 2026-10-31 | S1 | a59d43a, 0788bf0 | docs(sdd): record the presets file, the dynamic scaler and the KTX2 path in SDD 14 and 09 |
| A-01-02 | 2026-10-31 | S1 | 6fba0d7, b7cf36f | feat(render): load KTX2 atlases when listed and supported, with local decoder and PNG fallback |
| A-02-02b | 2026-10-31 | S1 | 4f43cb9, be00080, 4075cd4 | test(vat): require the walk clip to move in the enemy oracle |
| B-03-02 | 2026-10-31 | S1 | 71eadf2, fcb476c, 56a9fc6 | chore(perf): record the bench with empty meshes disabled |
| A-03-03 | 2026-10-31 | S2 | c44350b, 7015d13 | feat(render): tint the boss rig with its modifier auras and lengthen its charge line |
| A-02-01 | 2026-10-31 | S1 | 6f39c68, 6653667, 4270829 | test(e2e): add win32 baselines for the biome border and the eight-type horde |
| P-07-05 | 2026-10-31 | Est | 892c66c, f1cb685, af3dbde | chore(sim): drop the tuning script that slipped into the pool commit |
| E-04-04 | 2026-10-31 | Est | 81efecc, ff185d9, 93ffc9b | feat(ui): show the build version bottom-left and shard the CI e2e job |
| P-06-06 | 2026-10-31 | S1 | 09eea97, a8455af, 7cee91b | fix(render): bring the hero rig out of the death pose on Revived |

## Bloqueios (precisam do PO)

- [x] 2026-10-31 — Dependências de dev `@gltf-transform/core`, `fake-indexeddb`, `axe-core`, `jsdom`, `@testing-library/react`: **aprovadas** (versão estável atual, exata, ao instalar em E-02-01).
- [x] 2026-10-31 — Worktrees permanentes `../grim-cubes-s1|s2|est` e execução paralela de S1, S2 e Est: **aprovados** (autorização durável; ver `prompt-workers.md` §6).
- [x] 2026-10-31 — `LICENSE` proprietária ("All rights reserved", com nota de terceiros em `docs/legal/third-party.md`): **aprovada e criada na raiz**; E-01-02 só valida.
- [x] 2026-10-31 — Nomes diegéticos (Carrasco, Mercador de Ossos, Ossuário, chefes, biomas) e dash só via Ossuário: **confirmados** (D34).
- [x] 2026-10-31 — Codec PNG para `tools/assets-build`: **A) `pngjs` aprovado** (dev, versão estável exata ao instalar em P-06-02).
- [x] 2026-10-31 — Projeto Vercel criado pelo PO: `galhardos-projects/grim-cubes` (`prj_mv76W0cMpGLPnJAZEq7secqZK8Z1`), já conectado ao Git (domínio `grim-cubes-git-main-…`); repositório local ligado com `vercel link`. Último deploy de produção em `ERROR` (esperado: sem `vercel.json`/build até E-02-04/E-04-02).
- [x] 2026-10-31 — ElevenLabs: PO colocou `ELEVENLABS_API_KEY` em `.env` local.
- [x] 2026-10-31 — E-05-01 marca: **manter "Grim Cubes"** (PO consultou; recomendação aceita). Registrado em `docs/legal/trademark-screening.md`; números de processo pendentes antes do anúncio público.
- [ ] 2026-10-31 — E-05-03 Steamworks (US$ 100): ação manual do PO, depois. — bloqueia: ALPHA (A-06). Única pendência que só o PO pode fazer.
- [ ] 2026-10-31 — A-01-02 (KTX2 para mobile) precisa do binário `toktx` (KTX-Software, Apache-2.0) instalado no runner do CI (não é pacote npm). Opções: A) instalar `toktx` com versão fixa no job `build-web` (recomendado; só CI, sem dependência de runtime); B) adiar KTX2 para a fase 1.1 (Android) e manter PNG. — bloqueia: A-01-02. Continua aberto em 2026-10-31 08:51: o ADR do `toktx` está na B-05-02, e a M-01-04 (KTX2 no Android) depende dele.
- [ ] 2026-10-31 — B-04-04 (Android, fase 1.1): Capacitor 8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android` e plugins do SDD 10 §3) são dependências novas fora da lista aprovada na E-02-01. Opções: A) aprovar na abertura da fase BETA, versões estáveis exatas (recomendado); B) adiar para a 1.1 conforme o calendário. — bloqueia: B-04-04, M-01-*. Continua aberto em 2026-10-31 08:51: o critério de entrada do apêndice Android (ROADMAP) exige essa aprovação e também a da biblioteca de billing.
- [x] 2026-10-31 — E-05-04: **plano Creator** (recomendação aceita). Ambiente `audio` criado no GitHub com a variável `ELEVENLABS_PLAN=creator`. Falta o secret: a leitura de `.env` é bloqueada por regra do PO, então o PO roda `! bun -e "process.stdout.write(process.env.ELEVENLABS_API_KEY ?? '')" | gh secret set ELEVENLABS_API_KEY --env audio` e acrescenta `ELEVENLABS_PLAN=creator` ao `.env`. Geração real (8.500 créditos estimados) só sob pedido.
- [x] 2026-10-31 — Vercel: **B escolhida (recomendação aceita): manter a proteção; o smoke usa bypass token (E-04-04); desligar só em produção ao publicar a demo.** `ssoProtection` está em `all_except_custom_domains`, o que exige login Vercel até no domínio de produção `*.vercel.app`; a demo pública e o smoke (E-04-04) precisam de acesso anônimo. Opções: A) desligar proteção só em produção (`prod_deployment_urls_and_all_previews` → manter previews protegidos); B) manter e usar bypass token no smoke; C) domínio próprio. Recomendação: B agora (nada público antes da demo), A ao publicar a demo. — bloqueia: E-04-02 assert de produção, E-04-04.
- [x] 2026-10-31 — D1 câmera (GDD §5, ADR-0017): **PO escolheu A (2026-10-31).** `beta` do `ArcRotateCamera` é medido do zênite; 0,96 rad = 35° de elevação, não 55°. A) beta 0,611 rad (55°, intenção do GDD; anel de spawn 22–30 u fica fora da tela) — recomendado; B) manter 0,96 (35°; inimigos nascem à vista). — bloqueia: P-02-01.
- [x] 2026-10-31 — D3 densidade de props (GDD §6.3): **PO escolheu A (2026-10-31).** com a regra de corredor cabem no máximo 8–9 bloqueantes por chunk 4×4. A) 4–8 bloqueantes — recomendado; B) manter 4–10 e afrouxar corredor para "≤ 3 vizinhos". — bloqueia: P-01-01.
- [x] 2026-10-31 — D5 fluxo de arte (Art Bible §8/§10): **PO escolheu A (2026-10-31).** A) `.bbmodel` como fonte gerado por script e convertido para glTF pelo `assets-build` (PO refina no Blockbench) — recomendado; B) export manual de glTF pelo Blockbench. — bloqueia: P-06-01.
- [x] 2026-10-31 — Dependência nova: **A aprovada (recomendação aceita); E-02-04 mesclada (f4ac22b).** `@types/react` 19.3.0 e `@types/react-dom` 19.3.0 (devDeps exatas). React 19 não traz tipos; sem elas nenhum `.tsx` passa no typecheck (HUD, `ui/App`, design system). Opções: A) aprovar (recomendado; só tipos, mesmo mantenedor DefinitelyTypes do ecossistema React); B) escrever declarações mínimas próprias (frágil). — bloqueia: E-02-04 (branch pronta), E-02-06, E-03-02, E-03-03, toda UI.
- [x] 2026-10-31 — Aprovação retroativa: **A aprovada.** `@types/pngjs` 6.0.5 (dev, só tipos do `pngjs` já aprovado) entrou em `main` com a P-06-02 sem aprovação explícita (achado do Esp). Opções: A) aprovar (recomendado); B) remover e declarar tipos mínimos em `tools/assets-build`. — não bloqueia nada.
- [x] 2026-10-31 — Concept arts novas (`references/concept-arts/*.png`, 17 MB): **fora do git** (repositório público; sem Git LFS para não adicionar ferramenta). Ficam locais; `.gitignore` ignora os PNG da pasta, o `README.md` dela continua versionado.

## Próximos

1. Fase 1 fechada: `v0.1.0` publicada. Em aberto: E-03-02 (input + HUD), E-04-02 (o assert de produção depende do bypass do PO) e E-01-06.
2. Fechar a fase 2: P-07-01 (modo demo e `DemoEnd`), P-07-02 (Electron) e P-07-04 (sim com loja e `availableItems`, S2).
3. ALPHA em paralelo:
   - S1: captura determinística do Coveiro, A-02-01 (biomas).
   - S2: A-03-02 (O Forjador) e A-03-03 (roster por round).
   - Est: integrar o tutorial (A-07-01) e a revisão do copy `en` (B-05-01); A-07-03 pendente só dos testes visuais por tela, que dependem do e2e no CI.
4. PO: secret `VERCEL_AUTOMATION_BYPASS_SECRET`, E-05-03 (Steamworks), `toktx` e Capacitor (ver Bloqueios).

## Dívidas e observações

- `.env` existe localmente com `ELEVENLABS_API_KEY`; está no `.gitignore`. Nunca commitar.
- Fontes dos percentuais de tela (D31) são secundárias e não verificadas; revisar antes de citar publicamente.
- `grill-me` aponta para a skill `grilling` inexistente; `interview-me` foi usada no brainstorming.
- [idle] Revisão S1 (2026-10-31) das fases 1–2: 25 achados. Aplicados no ROADMAP pelo Orq os da fase 1 (ciclo E-03-02 ↔ E-02-06, tarefa nova E-03-06 de ECS, versões e `@babylonjs/inspector` em E-02-01, `createEngine` assíncrono só WebGL2 + `NullEngine`, valores de ouro de rng/loop, protocolo de fps). Os da fase 2 (câmera `beta`, histerese de chunks, contagem de props, chão por bioma, atlas de chão, VAT em PNG 8 bits, oráculo do VAT, bench antes de P-03-04, números em `data/world.json`/`data/render.json`, donos de `core/spatial` e origin shifting) serão aplicados pelo Orq ao abrir a fase 2.
- Contratos a combinar antes de E-03-01: assinaturas de `core/rng` (`mulberry32`, `hash32` variádico com i32 negativo), `core/store`, `core/logger`, `window.gc` tipado (`ready`, `debug` fora de produção), `render.createEngine(): Promise<Engine>`.
- `reports/` não está no `.gitignore` de propósito: `reports/perf-*.json` e `sim-*.json` são evidência de asserts.
- Dívida operacional (CPU saturada no `pre-push`): ver o parágrafo no topo. Janela de push entre agentes e timeout de 20 s nos testes de simulação e determinismo (a2cdbad); falta dar o mesmo timeout ao oráculo do VAT (`tools/bake-vat/babylon-oracle.test.ts`).
- `tools/sim` ainda roda sem loja e sem `availableItems` (marcos e exclusivos do Ossuário); o balanceamento simulado ignora o pool real até a P-07-04. O cull de 40 u já entrou no sim (7d89669).
- Bloqueios do PO ainda abertos que travam o ROADMAP: `toktx` (A-01-02, M-01-04) e Capacitor (B-04-04, M-01-*); ver Bloqueios.
- Copy `en`: os nomes de dados vêm do id em Title Case, revisados em `feat/A-07-01-tutorial` (armas, chefes, itens com posse); o resto ainda é provisório e passa pela B-05-01.
- A `wip/orq-merge` deixou de ser o ponto de integração: tudo o que importava está na `main`.
