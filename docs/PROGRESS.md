# PROGRESS

Atualizado: 2026-11-01 (fuso do PO) | Versão: 0.5.0 (publicada, tag `v0.5.0` em ce352ff) | Fase: 2 — PROTÓTIPO (ALPHA e BETA adiantadas em paralelo) | Sessão: #2

Meta do PO (2026-10-31): implementar o ROADMAP até o fim sem interrupções; tarefas `Resp: PO` ficam em Bloqueios e os agentes seguem com o resto. Hooks lefthook instalados em `.git` (valem para todos os worktrees).

## Agentes

| Agente | Tarefa atual | Branch | Estado | Desde | Lock |
| --- | --- | --- | --- | --- | --- |
| Orq | integra as branches na `main`; distribui as pendências da reconciliação de 2026-10-31 | main | em andamento | — | — |
| S1 | fila do Orq (pendências da reconciliação: loudness e etapa de áudio no `assets:build`, bench) | — | aguardando | — | — |
| S2 | fila do Orq (`gc.debug.gamepad`, telas novas, ADR do checkpoint com o Orq) | — | aguardando | — | — |
| Est | fila do Orq (SFX e música que faltam, nota da Fácil no GDD §25) | — | aguardando | — | — |
| Art | fila do Orq; silhuetas aguardando o PO | — (checkout da `main`) | aguardando | — | — |
| Esp | reconciliação completa do ROADMAP e este PROGRESS → standby | main (sem git) | em standby | — | `ROADMAP.md`, `docs/PROGRESS.md` |

As linhas refletem as últimas mensagens do Orq; o Orq confirma ao integrar.

Estado (2026-10-31): a **v0.4.0** está publicada (GitHub Release `v0.4.0`, 2c87269), com SBOM, checksums e o build Windows. Desde a v0.3.0 entraram: Mercador num ponto fixo com anel, chegada sonora e 20 falas legendadas; loja ARPG, `Options` em três colunas e Ossuário em colunas a partir dos mockups do PO; retratos pintados; menu com key art; 3 slots de save e checkpoint no início de cada round (Continuar); menu de pausa; Fácil, Normal e Difícil abertas desde o início e barras de vida ligáveis; save em arquivo no Electron com pasta fixa e alvo `dir`; glifos por controle, foco por D-pad e remap completo do gamepad; telas baixas compactas com o HUD escondido sob os diálogos; herói novo igual à key art, revisão do §14 com capturas em jogo e tiles irregulares; luz nova e `atlas_terrain`; áudio final em duas rodadas com loudness; `--check` com duas seeds e faixas por dificuldade e política (`tank`); 5 raridades com Mítico e o Ímã de Ossos; espada de 3,25 u e 130°. **O e2e (Playwright) segue fora do CI por decisão do PO.** Em 2026-11-01 entraram cinco magias automáticas de tier 4 (Seta do Ossuário, Círculo de Ossos, Relâmpago de Almas, Minas Sepulcrais, Pulso de Cinzas), que disparam sozinhas na run, e as baselines Playwright de menu, slots, Options, pausa, Ossuário e loja nos quatro viewports. A tag `v0.5.0` (ce352ff) fecha essa leva. O que resta no ROADMAP está na lista de asserts abertos abaixo; nada disso fecha sem o PO, hardware, loja ou uma tag.

Dívida operacional: com vários agentes rodando testes ao mesmo tempo, a CPU satura e o `pre-push` pode estourar timeout (a suíte isolada passa). Janela de push (um agente por vez) e timeouts maiores nos testes pesados; não contornar o hook. Cherry-pick de base antiga já apagou correções duas vezes (59eb086, restaurado em fdddb95 e 78ae69b): o Esp roda a cada auditoria um script que procura linhas adicionadas que sumiram do HEAD.

Vercel: deploy de produção Ready; a URL responde 302 (proteção SSO mantida, decisão B). O `vercel.json` traz CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e COOP, revalida o `manifest.json` e serve `/assets/audio/`. Sem variáveis de ambiente no projeto, então `GC_DEBUG_API` fica desligado em produção.

## Concluídas (últimas 20)

Fonte: IDs dos rodapés `Refs: ROADMAP#` de eb12bc2 a 49039f2, do commit mais recente para o mais antigo; até 3 commits por ID. O estado de cada tarefa é o checkbox do ROADMAP (`[~]` = parcial, ver a linha de Estado do item).

| ID | Data | Resp | Commit | Observação |
| --- | --- | --- | --- | --- |
| B-02-02 | 2026-10-31 | Est + Orq | 49039f2, d4e589c, c643158 | espada 3,25 u e 130°, Fácil, faixas por dificuldade e política |
| B-02-01 | 2026-10-31 | S2 | edb5f0c, d173f1d, 7be0265 | raridade Mítica, 4 itens Míticos e o Ímã de Ossos |
| P-05-05 | 2026-10-31 | S2 | 1cda484, e692a01 | 5 raridades com tokens e formas para daltônicos; efeito `pull_fragments` |
| A-01-01 | 2026-10-31 | S1 + S2 | fd98405, 7795aff, 65eb4aa | barras de vida ligáveis no save |
| P-07-03 | 2026-10-31 | S2 | 81e9ff0, 463c14f, dbc7607 | pausa, checkpoint por round e 3 slots (o `Refs` aponta para a P-07-03, que é determinismo; sem item próprio no ROADMAP) |
| B-03-01 | 2026-10-31 | Art | e15ae2d, 18262c0, 810e34a | herói igual à key art, contraste e tiles irregulares |
| B-03-03 | 2026-10-31 | Est + S2 | 8290871, b224e4d | áudio final, ducking, polifonia e loudness (`[~]`) |
| P-07-02 | 2026-10-31 | S2 | 9cedf38, 0755169, e58bc43 | pasta de dados fixa igual à das builds anteriores, save em arquivo |
| A-05-01 | 2026-10-31 | S2 + S1 | 20d788c, 0fda8c8, 1deed5b | Mercador fixo, chegada sonora e 20 falas |
| B-04-02 | 2026-10-31 | S2 | 8328c1c | glifos por controle e foco por D-pad (`[~]`) |
| B-05-03 | 2026-10-31 | Esp | 57451ab | checklist de lançamento Steam (`[~]`) |
| A-07-02 | 2026-10-31 | S2 | 6143b4c, 47bc29d, baaf846 | reroll e velocidade no gamepad, telas baixas |
| A-01-02 | 2026-10-31 | S1 | cef29b3, f6a1a56 | orçamento de memória sem KTX2 (`[~]`) |
| A-02-02b | 2026-10-31 | S1 | 878ff7b, 22f8418 | variantes de inimigos |
| B-05-01 | 2026-10-31 | Est + S2 | 4a34efc, b324d83, 9bca4f3 | legendas e revisão do pt-BR e do `en` |
| P-04-05 | 2026-10-31 | S1 | 6033d1d, a393cff, 8d68a74 | pools do preset ao vivo e bench com e sem VFX |
| A-02-03 | 2026-10-31 | Est + Orq | c8aff28, f763a6b, f745697 | rebalanceamento depois da auditoria de stats |
| A-02-01 | 2026-10-31 | S1 | ce636e1, fffaa8d, e06898d | atlas emissivo |
| B-03-02 | 2026-10-31 | S1 | 1162c51, a0af935, f635613 | polimento de VFX |
| B-05-02 | 2026-10-31 | Esp + Orq | f0b2a61, 2eb98fe, 4507229 | ADRs 0021–0024 e README (`[~]`) |

## Bloqueios (precisam do PO)

### Decisões pendentes

O PO aprovou em 2026-11-01 as recomendações. O que cabia no repositório foi feito. O que exige conta, pagamento, segredo, hardware ou playtest continua aqui.

Fechadas no repositório:

1. **`toktx` (A-01-02), opção B.** KTX2 adiado à 1.1 (ADR-0027). O assert passou a ser o orçamento já medido.
2. **Capacitor 8, opção A.** Dependências aprovadas para a abertura da BETA, versões estáveis exatas, sem instalar nesta release (ADR-0028). O scaffold (B-04-04) e o billing (M-01-03) esperam essa fase.
3. **Job de perf (A-01-03), opção A.** `.github/workflows/perf.yml` só em `workflow_dispatch` e em PR com rótulo `perf`.
4. **Telemetria (A-06-04).** Continua só no log local até antes do Next Fest (ADR-0023). O endpoint não foi criado.
5. **Proteção da `main` (E-01-06), opção A.** Segue sem proteção enquanto a integração é direta na `main`.
6. **Assinatura Windows (B-04-01), opção B.** ADR-0008 emendado: não assinado na 1.0; distribuição pela Steam.
7. **Nome "Grim Bargain".** O id `grim_pact` permanece; o nome em inglês na UI passou a ser Grim Bargain.
8. **Regen de vida.** Valores atuais mantidos até o playtest.

Ainda manuais:

1. **Steamworks (E-05-03, US$ 100).** Abrir a conta, pagar e registrar os App IDs. Bloqueia A-06 e a demo na Steam.
2. **Secret `VERCEL_AUTOMATION_BYPASS_SECRET`.** Criar na Vercel e no GitHub para o smoke de produção.
3. **Bench com GPU real e Chrome mobile (P-07-05).** `BENCH_GPU=1 bun run test:perf` na máquina do desenvolvedor, uma vez por release.
4. **Ações manuais.** Silhuetas (59d5a42); vídeos (P-01-04, P-04-05, A-03-01); Xbox e DualSense (B-04-02); uma run no executável Windows (P-07-02); domínios (E-05-02); secret `ELEVENLABS_API_KEY` no ambiente `audio`.

### Asserts ainda abertos (2026-11-01)

Cada id abaixo continua `[ ]` ou `[~]` no ROADMAP. O assert que falta depende do PO, de hardware, de loja ou de publicar uma tag. Não há JSON de perf, playtest nem App ID inventado para fechá-los.

- **E-01-06** `[~]`: o PO escolheu manter a `main` sem proteção (2026-11-01) enquanto os agentes integram direto. `dependabot.yml` existe; a proteção com o check `ci` continua desligada de propósito.
- **E-05-02**: RDAP de `grimcubes.com` com o registrante e `docs/legal/domains.md`.
- **E-05-03**: `docs/legal/accounts.md` com App IDs da Steam e os secrets `STEAM_APP_ID` / `STEAM_DEMO_APP_ID`.
- **E-05-04** `[~]`: secret `ELEVENLABS_API_KEY` no ambiente `audio` do GitHub (`gh secret list --env audio`).
- **P-07-05** `[~]`: bench com GPU real e relatório Android no Chrome mobile do PO.
- **P-07-06**: `docs/playtests/2026-12-protótipo.md` (3 sessões).
- **A-01-03** `[~]`: job `perf` escrito (dispatch ou rótulo `perf`); falta o PR com sleep de 5 ms que o job bloqueia, e o revert.
- **A-06-01**: Steamworks real, 10 achievements, Auto-Cloud e os dois builds Electron.
- **A-06-02**: página Steam (capsules, 5 capturas, trailer, preço).
- **A-06-03**: demo pública em 2027-01-24 e inscrição no Next Fest.
- **A-06-04** `[~]`: endpoint e envio em lote da telemetria (hoje só log local).
- **A-07-04**: `docs/playtests/2027-01-alpha.md` e `2027-02-alpha.md`.
- **A-07-05** `[~]`: `v0.5.0` publicada (ce352ff). Falta `v0.6.0` (demo pública).
- **B-03-04** `[~]`: calibração de juice por playtest no bloco `vfx` de `data/render.json`.
- **B-04-02** `[~]`: checklist manual de Xbox e DualSense e a nota de Steam Deck na página.
- **B-04-03**: `docs/playtests/2027-03-beta.md` com ≥ 50 runs e crash-free ≥ 99,5%.
- **B-04-04** `[~]`: APK de debug na GitHub Release `v0.5.0`. Falta `reports/perf-android-<device>.json` no aparelho do PO.
- **B-05-03** `[~]`: submissão do build à Valve (o checklist existe; o envio não).
- **B-05-04**: releases `v0.7.0`, `v0.8.0` e `v0.9.0`.
- **R-01-01** `[~]`: ferramenta pronta (`major --rc`, commitlint em `release/*`); falta publicar a tag `v1.0.0-rc.1` (`gh release view`).
- **R-01-02**: `reports/soak-1.0.json` (GPU, 10×60) e `reports/soak-1.0-fps.json` (2 h, fps ≥ 60) na máquina do PO.
- **R-01-03** `[~]`: `reports/perf-final-*.json` nos 4 alvos com GPU real.
- **R-01-05** `[~]`: pendências da `docs/release/audit-1.0.md` que só fecham na RC (tag, `.exe`, URL de produção) e o registro de licenças no SBOM.
- **R-02-01**: tag `v1.0.0` e GitHub Release com os binários.
- **R-02-02**: upload Steam da 1.0 no branch `default`.
- **R-02-03**: deploy da demo 1.0 com o botão "Comprar na Steam".
- **R-02-04**: monitoramento dos 7 dias pós-lançamento.
- **R-02-05**: `docs/retro/1.0.md`.
- **M-01-01**: conta Google Play, secrets `android` e Data safety.
- **M-01-02**: Capacitor 8 completo e AAB assinado.
- **M-01-02b**: `flags.fullVersion` no app Android.
- **M-01-03**: Play Billing do produto `full_version`.
- **M-01-04**: preset Baixo, KTX2 e capturas nos 2 alvos mobile.
- **M-01-05**: closed test com ≥ 12 testers por 14 dias.
- **M-01-06**: produção no Google Play e `v1.1.0`.

### Registro

- [x] 2026-10-31 — Imagens 2D geradas por IA (key art do menu, retratos da loja e mockups em `references/concept-arts/`): **PO escolheu aceitar e registrar a origem.** Art Bible §13 emendada (UI e marketing podem ser 2D de IA com o prompt versionado em `prompt-*.md`; modelos 3D só no Blockbench), registro em `docs/legal/third-party.md`, item de declaração no checklist da Steam e na auditoria `docs/release/audit-1.0.md`.
- [x] 2026-10-31 — Dependências de dev `@gltf-transform/core`, `fake-indexeddb`, `axe-core`, `jsdom`, `@testing-library/react`: **aprovadas** (versão estável atual, exata, ao instalar em E-02-01).
- [x] 2026-10-31 — Worktrees permanentes `../grim-cubes-s1|s2|est` e execução paralela de S1, S2 e Est: **aprovados** (autorização durável; ver `prompt-workers.md` §6).
- [x] 2026-10-31 — `LICENSE` proprietária ("All rights reserved", com nota de terceiros em `docs/legal/third-party.md`): **aprovada e criada na raiz**; E-01-02 só valida.
- [x] 2026-10-31 — Nomes diegéticos (Carrasco, Mercador de Ossos, Ossuário, chefes, biomas) e dash só via Ossuário: **confirmados** (D34).
- [x] 2026-10-31 — Codec PNG para `tools/assets-build`: **A) `pngjs` aprovado** (dev, versão estável exata ao instalar em P-06-02).
- [x] 2026-10-31 — Projeto Vercel criado pelo PO: `galhardos-projects/grim-cubes` (`prj_mv76W0cMpGLPnJAZEq7secqZK8Z1`), já conectado ao Git (domínio `grim-cubes-git-main-…`); repositório local ligado com `vercel link`. Último deploy de produção em `ERROR` (esperado: sem `vercel.json`/build até E-02-04/E-04-02).
- [x] 2026-10-31 — ElevenLabs: PO colocou `ELEVENLABS_API_KEY` em `.env` local.
- [x] 2026-10-31 — E-05-01 marca: **manter "Grim Cubes"** (PO consultou; recomendação aceita). Registrado em `docs/legal/trademark-screening.md`; números de processo pendentes antes do anúncio público.
- [x] 2026-11-01 — Regeneração de vida: **PO manteve os valores atuais** (+0,5 nos itens, +0,25 na carta) até o playtest.
- [ ] 2026-10-31 — E-05-03 Steamworks (US$ 100): ação manual do PO, depois. — bloqueia: ALPHA (A-06). Única pendência que só o PO pode fazer.
- [x] 2026-11-01 — A-01-02 `toktx`: **PO escolheu B.** KTX2 adiado à 1.1 (ADR-0027). O assert passou a ser o orçamento medido sem KTX2. A M-01-04 continua aberta.
- [x] 2026-11-01 — B-04-04 Capacitor: **PO escolheu A.** Dependências aprovadas para a abertura da BETA, versões estáveis exatas (ADR-0028). Não foram instaladas nesta release. A biblioteca de billing continua sem escolha (M-01-03).
- [x] 2026-10-31 — E-05-04: **plano Creator** (recomendação aceita). Ambiente `audio` criado no GitHub com a variável `ELEVENLABS_PLAN=creator`. Falta o secret: a leitura de `.env` é bloqueada por regra do PO, então o PO roda `! bun -e "process.stdout.write(process.env.ELEVENLABS_API_KEY ?? '')" | gh secret set ELEVENLABS_API_KEY --env audio` e acrescenta `ELEVENLABS_PLAN=creator` ao `.env`. Geração real (8.500 créditos estimados) só sob pedido.
- [x] 2026-10-31 — Vercel: **B escolhida (recomendação aceita): manter a proteção; o smoke usa bypass token (E-04-04); desligar só em produção ao publicar a demo.** `ssoProtection` está em `all_except_custom_domains`, o que exige login Vercel até no domínio de produção `*.vercel.app`; a demo pública e o smoke (E-04-04) precisam de acesso anônimo. Opções: A) desligar proteção só em produção (`prod_deployment_urls_and_all_previews` → manter previews protegidos); B) manter e usar bypass token no smoke; C) domínio próprio. Recomendação: B agora (nada público antes da demo), A ao publicar a demo. — bloqueia: E-04-02 assert de produção, E-04-04.
- [x] 2026-10-31 — D1 câmera (GDD §5, ADR-0017): **PO escolheu A (2026-10-31).** `beta` do `ArcRotateCamera` é medido do zênite; 0,96 rad = 35° de elevação, não 55°. A) beta 0,611 rad (55°, intenção do GDD; anel de spawn 22–30 u fica fora da tela) — recomendado; B) manter 0,96 (35°; inimigos nascem à vista). — bloqueia: P-02-01.
- [x] 2026-10-31 — D3 densidade de props (GDD §6.3): **PO escolheu A (2026-10-31).** com a regra de corredor cabem no máximo 8–9 bloqueantes por chunk 4×4. A) 4–8 bloqueantes — recomendado; B) manter 4–10 e afrouxar corredor para "≤ 3 vizinhos". — bloqueia: P-01-01.
- [x] 2026-10-31 — D5 fluxo de arte (Art Bible §8/§10): **PO escolheu A (2026-10-31).** A) `.bbmodel` como fonte gerado por script e convertido para glTF pelo `assets-build` (PO refina no Blockbench) — recomendado; B) export manual de glTF pelo Blockbench. — bloqueia: P-06-01.
- [x] 2026-10-31 — Dependência nova: **A aprovada (recomendação aceita); E-02-04 mesclada (f4ac22b).** `@types/react` 19.3.0 e `@types/react-dom` 19.3.0 (devDeps exatas). React 19 não traz tipos; sem elas nenhum `.tsx` passa no typecheck (HUD, `ui/App`, design system). Opções: A) aprovar (recomendado; só tipos, mesmo mantenedor DefinitelyTypes do ecossistema React); B) escrever declarações mínimas próprias (frágil). — bloqueia: E-02-04 (branch pronta), E-02-06, E-03-02, E-03-03, toda UI.
- [x] 2026-10-31 — Aprovação retroativa: **A aprovada.** `@types/pngjs` 6.0.5 (dev, só tipos do `pngjs` já aprovado) entrou em `main` com a P-06-02 sem aprovação explícita (achado do Esp). Opções: A) aprovar (recomendado); B) remover e declarar tipos mínimos em `tools/assets-build`. — não bloqueia nada.
- [x] 2026-10-31 — Concept arts novas (`references/concept-arts/*.png`, 17 MB): **fora do git** (repositório público; sem Git LFS para não adicionar ferramenta). Ficam locais; `.gitignore` ignora os PNG da pasta, o `README.md` dela continua versionado.
- [ ] 2026-10-31 — Secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Deployment Protection → Protection Bypass for Automation; `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET`) para o smoke pós-deploy medir o 200 da produção. — bloqueia: assert de produção da E-04-02 e o smoke da E-04-04.
- [x] 2026-11-01 — Job de perf: **PO escolheu A.** `.github/workflows/perf.yml` só em `workflow_dispatch` e em PR com rótulo `perf`. O PR de demonstração (sleep de 5 ms) ainda não rodou.
- [ ] 2026-10-31 — Bench com GPU real na máquina do PO (`BENCH_GPU=1 bun run test:perf`) e relatório Android pelo Chrome mobile. — bloqueia: asserts de fps da E-03-02, P-03-04, P-07-05 e A-01-01.
- [x] 2026-11-01 — Telemetria: **PO confirmou o log local** até antes do Next Fest (ADR-0023). O endpoint em lote (A-06-04) continua aberto.
- [x] 2026-11-01 — Proteção da `main` (E-01-06): **PO escolheu A.** Sem proteção enquanto os agentes integram direto. Ligar a proteção continua sendo ação manual, se o fluxo passar a ser por PR.
- [x] 2026-11-01 — Assinatura Windows (B-04-01): **PO escolheu B.** Não assinado na 1.0 (ADR-0008). Distribuição pela Steam.
- [x] 2026-11-01 — Nome do item: **PO escolheu "Grim Bargain".** O id continua `grim_pact`.
- [ ] 2026-10-31 — Ações manuais pendentes: aprovação das silhuetas (P-06-01), vídeos dos itens (P-01-04, P-04-05, A-03-01), teste manual do gamepad (P-02-02) e checklist de uma run completa no Electron (P-07-02).

## Próximos

1. Orq: distribuir as pendências sem dependência do PO da reconciliação de 2026-10-31 (tabela no relatório do Esp).
2. Orq + S2: ADR de emenda do ADR-0009 para os 3 slots e o checkpoint por round, e um item do ROADMAP para slots, checkpoint e pausa (hoje com `Refs` na P-07-03).
3. Orq: `v0.6.0`, a demo pública (A-07-05), quando o conteúdo dela estiver fechado.
4. PO: o que ficou manual em Bloqueios (Steamworks, secrets, bench na GPU, silhuetas, domínios, gamepad físico, run no executável).

## Dívidas e observações

- `.env` existe localmente com `ELEVENLABS_API_KEY`; está no `.gitignore`. Nunca commitar.
- Fontes dos percentuais de tela (D31) são secundárias e não verificadas; revisar antes de citar publicamente.
- `reports/` guarda evidência de asserts (`perf-*.json`, `balance-*.json`); os `sim-*.json` regenerados por run ficam no `.gitignore`.
- `assets/audio-archive/` fica no git (17 MB); se passar de 50 MB, o Orq pergunta ao PO.
- Pós-processo ffmpeg do `audio-generate` (SDD 08 §3: LUFS, trim, pitch de chefes).
- `bun audit` (2026-10-31): 3 vulnerabilidades só em ferramentas de desenvolvimento, fora do bundle do jogo: `re2js` 2.8.6 (alta, DoS) e `katex` 0.16.47 (baixa) via `markdownlint-cli2`; `minimatch` (moderada, DoS) via `electron-builder`. Subir `markdownlint-cli2` e `electron-builder` para a primeira versão estável com a correção, com versão exata (sem dependência nova). Conferir a cada release com `bun audit`.
- Risco: conversor `.bbmodel` validado contra o próprio pipeline e o Babylon; os modelos refinados no Blockbench 5 passam pelo leitor de `groups` separado (4a4f19b).
- Dívida (P3, Esp): HSTS (`Strict-Transport-Security`) no `vercel.json` só quando houver domínio próprio; no domínio `*.vercel.app` a Vercel já o aplica. Não fazer antes disso.
