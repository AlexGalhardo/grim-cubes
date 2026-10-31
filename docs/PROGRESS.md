# PROGRESS

Atualizado: 2026-10-31 08:51 (fuso do PO) | Versão: 0.0.0 (v0.1.0 ainda não publicada) | Fase: 2 — PROTÓTIPO (itens da ALPHA adiantados em paralelo) | Sessão: #1

Meta do PO (2026-10-31): implementar o ROADMAP até o fim sem interrupções; tarefas `Resp: PO` ficam em Bloqueios e os agentes seguem com o resto. Hooks lefthook instalados em `.git` (valem para todos os worktrees).

## Agentes

| Agente | Tarefa atual | Branch | Estado | Desde | Lock |
| --- | --- | --- | --- | --- | --- |
| Orq | merges em `wip/orq-merge`; commits; PROGRESS | wip/orq-merge | em andamento | 08:51 | — |
| S1 | P-06-06 (rig de personagem) → A-02-01 (biomas Pântano, Forja e Ninho) | — | implementando | 08:51 | — |
| S2 | P-07-04 (sim com loja) → A-03-02 (O Forjador) → A-03-03 (roster por round) | — | implementando | 08:51 | — |
| Est | baselines finais do e2e → `rc-major` no `tools/release` (R-01-01) → i18n (A-07-01) → cobertura | — | implementando | 08:51 | — |
| Esp | docs (CHANGELOG, PROGRESS) → auditoria a cada merge | — | em andamento | 08:51 | `CHANGELOG.md`, `docs/PROGRESS.md` |

Estado (2026-10-31 08:51): `origin/main` está em b899d7b, vermelha até as baselines do e2e entrarem (ver Dívidas). O trabalho integrado está em `origin/wip/orq-merge` (6180a55). Na última verificação em cópia limpa (bf90035), typecheck, `biome ci`, `data:check`, `lint:md` e `bun run test` (84 arquivos, 483 testes) ficaram verdes. Já existem o Coveiro e a Matriarca (padrões por id, A-03-00), os 8 behaviors de inimigo, elites com render, Ossuário com dash e bônus da Ruína, dificuldades, marcos, VFX (P-04-05), culling por frustum e os headers de segurança da Vercel.

Dívida operacional: com 4 agentes rodando testes ao mesmo tempo, a CPU satura e o `pre-push` falha por timeout de worker (a suíte isolada passa). Solução adotada: janela de push (um agente por vez) e timeout de 20 s nos testes de simulação e determinismo (a2cdbad); o oráculo do VAT ainda pode estourar 5 s sob carga. Não contornar o hook.

Risco: conversor `.bbmodel` validado só contra o próprio pipeline e o Babylon; falta golden contra um export real do Blockbench (quando o PO refinar o 1º modelo).

Pendência do PO: secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Deployment Protection → Protection Bypass for Automation; e `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET`) para o smoke pós-deploy (E-04-04). Continua pendente em 2026-10-31 08:51: sem ele, o smoke de produção (que agora também falha com a API de debug viva, ff185d9) não roda.

Vercel: build corrigido (3721471: `--config apps/web/vite.config.ts` + `vercel.json`); deploy de produção `grim-cubes-fc7qzglh5` **Ready**; URL de produção responde 302 (proteção SSO mantida, decisão B). Desde 6370507, o `vercel.json` traz CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e COOP, e revalida o `manifest.json` (os demais assets seguem `immutable`). O projeto `grim-cubes` na Vercel não tem variáveis de ambiente (conferido pela API em 2026-10-31), então `GC_DEBUG_API` fica desligado em produção.

Dívida: pós-processo ffmpeg do `audio-generate` (SDD 08 §3: LUFS, trim, pitch de chefes).

## Concluídas (últimas 20)

Fonte: itens `[x]` do ROADMAP em `origin/wip/orq-merge` (6180a55), ordenados pelo commit mais recente de cada ID.

| ID | Data | Agente | Commit | Observação |
| --- | --- | --- | --- | --- |
| P-04-01 | 2026-10-31 | S2 | 6180a55 | knockback escrito pelo dano aplicado ao movimento dos inimigos |
| E-04-04 | 2026-10-31 | Est (+ Esp) | ff185d9 | smoke falha com a API de debug viva (`?debug=1`); actions pinadas por SHA; Dependabot (bun e GitHub Actions) |
| A-04-01 | 2026-10-31 | S2 | bf90035, 5cce96f, 460a352 | bônus da Ruína: reroll de cartas por run, Incomum garantido só na oferta inicial, 2 lendários `exclusiveTo` conferidos no `data-check` |
| P-03-05 | 2026-10-31 | S1 (+ S2 no sim) | ac44b46, a514770, 7d89669 | cull de 40 u sem drop (nunca elite/chefe); render por frustum real da câmera; sim com o mesmo cull |
| E-02-07 | 2026-10-31 | S2 | 92f6135 | `secrets-scan` falha com flag desconhecida e caminho inexistente (achado da revisão de segurança) |
| A-02-02a | 2026-10-31 | S2 | 3224aa4, 8f123f7, f53bc0b | 6 behaviors do data; contador do Reprodutor por passo; dreno da Sanguessuga por eventos com killer, `PlayerHit` marcado como leak |
| P-05-06 | 2026-10-31 | S2 | 5640a2d, 44f9cd7 | baús sem itens alpha; elites que escapam reportadas; `ChestOpened` com a posição do baú |
| A-04-02 | 2026-10-31 | S2 | 2ceb682 | dash do Ossuário (cargas, i-frames, botão touch); `dashSystem` na ordem real do SDD 02 §2.3 |
| P-03-06 | 2026-10-31 | S1 | 45399e2, a2cdbad | orçamento de CPU na simulação da horda; timeout de 20 s nos testes longos de sim |
| A-04-03 | 2026-10-31 | S2 | 3b7ac70 | dificuldades Normal/Grim/Nightmare, tela de dificuldade e seed, recordes por dificuldade |
| P-03-02 | 2026-10-31 | S2 | d5c9fcc | spawns fora dos props bloqueantes |
| P-04-06 | 2026-10-31 | S1 | e10d4c6, affd535 | render de pilhas de fragmentos e projéteis; pilhas de combate fora do ímã nas capturas |
| E-03-04 | 2026-10-31 | Est | be2740b | regras cruzadas, enum de effect id, limites do herói e checagem data → assets |
| E-02-06 | 2026-10-31 | Est | fea93ae, db5fded | baselines por plataforma (win32 e linux), captura só da UI, relógio congelado |
| P-07-03 | 2026-10-31 | Est | 947f5b7 | teste de determinismo com `hashWorld` (seed 42, 3.600 passos) |
| P-05-08 | 2026-10-31 | S2 | 98cef15, fabaee5 | runs mescladas no save sob lock; duas cópias corrompidas guardadas |
| E-03-01 | 2026-10-31 | S1 + S2 | d57699e | store publica sem copiar o set de listeners (fecha a parte que faltava) |
| P-02-03 | 2026-10-31 | S1 | ab76b1d | materiais de props com fade descongelados; opacidade de slot reciclado zerada; alturas dos modelos |
| P-01-05 | 2026-10-31 | S1 | 227d00b | constantes de steering em `world.json`; scratch de candidatos maior; overlaps |
| P-05-05 | 2026-10-31 | S2 | c7401d0 | effect ids sem código falham alto |

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

1. Fechar a fase 1:
   - Est: baselines finais do e2e para a `main` voltar a ficar verde.
   - Orq: release `v0.1.0` (E-04-03, `bun run release minor --publish`), que depende da `main` verde.
   - Em aberto: E-03-02 (input + HUD), E-04-02 (`vercel.json`; a CSP e os headers já entraram em 6370507, falta o assert de produção, que depende do bypass do PO), E-05-05 e E-01-06 (o Dependabot já entrou em ff185d9).
2. Fechar a fase 2: P-04-05 (VFX), P-07-01 (modo demo e `DemoEnd`), P-07-02 (Electron) e P-07-04 (sim com loja e `availableItems`, S2).
3. ALPHA em paralelo:
   - S1: A-02-01 (biomas).
   - S2: A-03-02 (O Forjador) e A-03-03 (roster por round).
   - Est: R-01-01 (`rc-major` no `tools/release`) e A-07-01 (i18n, com o inventário de chaves do Esp).
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
- `origin/main` (b899d7b) segue vermelha até as baselines do e2e entrarem (Est, baselines finais). Até lá, o trabalho integrado e verificado está em `origin/wip/orq-merge`.
