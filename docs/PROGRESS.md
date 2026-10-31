# PROGRESS

Atualizado: 2026-10-31 (fuso do PO) | Versão: 0.2.0 (publicada, tag `v0.2.0` em f504443; `main` 0127843; a v0.2.1 sai com o rebalanceamento f763a6b) | Fase: 2 — PROTÓTIPO (ALPHA e BETA adiantadas em paralelo) | Sessão: #2

Meta do PO (2026-10-31): implementar o ROADMAP até o fim sem interrupções; tarefas `Resp: PO` ficam em Bloqueios e os agentes seguem com o resto. Hooks lefthook instalados em `.git` (valem para todos os worktrees).

## Agentes

| Agente | Tarefa atual | Branch | Estado | Desde | Lock |
| --- | --- | --- | --- | --- | --- |
| Orq | integra as branches na `main`; v0.2.1 com o rebalanceamento do regen | main | em andamento | — | — |
| S1 | fila de polimento de VFX da auditoria (espinhos por evento, furtividade, ovos, fade de decals, poeira por bioma, números de dano, consumíveis) e o cast do `vision.ts` | — | implementando | — | — |
| S2 | P1 do `padNav` (botão segurado ao abrir diálogo), `vision` na tela `Options` com save, fuses do Electron, evento `ThornsHit`, P3 do Electron e do `release.yml` | — | implementando | — | — |
| Est | guards (`tools/guards`, na `main`) → próximo `[ ]` de Resp Est sem dependência do PO | — | implementando | — | — |
| Art | refino do Mercador de Ossos (retrato) e checklist B-03-01 | — (checkout da `main`) | implementando | — | `assets/src/models/npc/**` |
| Esp | auditoria de ad9736c..0127843 e este PROGRESS → standby | main (sem git) | em standby | — | `docs/PROGRESS.md` |

As linhas refletem as últimas mensagens do Orq; o Orq confirma ao integrar.

Estado (2026-10-31): a **v0.2.0** está publicada (GitHub Release `v0.2.0`, f504443), com o build Windows (instalador NSIS e portable, sem assinatura) anexado pelo job `desktop` do `release.yml`. Desde a v0.1.0 entraram: chefes 4 e 5 (simulação e render), roster até o round 60+, motor de áudio com 78 arquivos ElevenLabs (plano Creator), tela de título, `Options`, `DemoEnd` e selo DEMO, velocidade 1x/2x/3x (vale em todos os builds, recordes contam), tutorial e dicas, ícones na UI, preset de vídeo automático, telemetria opt-in (só log local; save schema 4), navegação por teclado e gamepad nos diálogos, regen de vida pela fórmula do GDD, Electron 45 com sandbox e protocolo `app://`, e os modelos refinados no Blockbench via MCP. A v0.2.0 saiu com o `balance.yml` vermelho (p50 31 depois da correção do regen); o f763a6b rebalanceou o `hp_regen` só em dados e o check voltou a passar (p50 24,5 local); entra na v0.2.1. **O e2e (Playwright) segue fora do CI por decisão do PO**: specs e baselines ficam no repositório e só rodam quando o Orq pedir.

Dívida operacional: com vários agentes rodando testes ao mesmo tempo, a CPU satura e o `pre-push` pode estourar timeout (a suíte isolada passa). Janela de push (um agente por vez) e timeout de 20 s nos testes de simulação e determinismo; não contornar o hook. Cherry-pick de base antiga já apagou correções duas vezes (59eb086, restaurado em fdddb95 e 78ae69b): o Esp roda a cada auditoria um script que procura linhas adicionadas que sumiram do HEAD.

Vercel: deploy de produção Ready; a URL responde 302 (proteção SSO mantida, decisão B). O `vercel.json` traz CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e COOP, revalida o `manifest.json` e serve `/assets/audio/`. Sem variáveis de ambiente no projeto, então `GC_DEBUG_API` fica desligado em produção.

## Concluídas (últimas 20)

Fonte: IDs dos rodapés `Refs: ROADMAP#` de eb12bc2 a 0127843, do commit mais recente para o mais antigo; até 3 commits por ID. O estado de cada tarefa é o checkbox do ROADMAP (`[~]` = parcial, ver a linha de Estado do item).

| ID | Data | Resp | Commit | Observação |
| --- | --- | --- | --- | --- |
| B-03-01 | 2026-10-31 | Art | 0127843, ec02764, cd275ce | ícone do app, Sanguessuga mais fina, máscaras `_e.png` e checklist B-03-01 |
| B-03-02 | 2026-10-31 | S1 | e1e1795, 9516bef, c59c7d9 | ganchos de debug `fx` e `setSpeed` para capturas e margem a 3x |
| A-02-03 | 2026-10-31 | Orq + Est | f763a6b, f745697, 53e14e4 | rebalanceamento do `hp_regen` depois da correção do regen |
| B-02-01 | 2026-10-31 | S1 | ad9736c | gotas de sangramento e espinhos no acerto de Espinhos |
| P-07-02 | 2026-10-31 | S2 | 21a8fff | shell Electron 45, instalador e portable Windows |
| A-07-03 | 2026-10-31 | Est | 0860494, b31bace, 52570e4 | testes de render e guards de arquivos, áudio e contagem de testes |
| R-01-03 | 2026-10-31 | S1 | f4c63ef, 5c47c81, cbfeff4 | benches 1080/1440 depois das correções de instâncias e retrato |
| P-05-02 | 2026-10-31 | S2 | 126c910 | `hp_regen` aplicado ao herói a cada passo |
| A-06-04 | 2026-10-31 | S2 | 14e32b8, 9a6507e | telemetria opt-in com lista fechada de eventos e save schema 4 |
| A-07-02 | 2026-10-31 | S2 | ac6b394 | navegação por teclado e gamepad nos diálogos, foco visível |
| A-02-01 | 2026-10-31 | S1 | fffaa8d, e06898d, 1ffed8f | herói virado para o alvo sem alocar por frame |
| B-01-03 | 2026-10-31 | S2 + Est | 96de426, 2d8b076 | roster completo 60+ |
| B-05-02 | 2026-10-31 | Est + Orq | 2eb98fe, 4507229, 18b8c2f | divergências de GDD e Art Bible corrigidas |
| A-05-01 | 2026-10-31 | S1 + S2 | e32c04f, 6048e8b, d117eb2 | retrato do Mercador por render target |
| A-04-04 | 2026-10-31 | S2 | e5f2a6d | tela de título com recordes e `mus_menu` |
| P-06-04 | 2026-10-31 | S2 | 6c6e5a9, 217f11b, 5c3d3cc | motor de áudio, sons por evento e música |
| A-05-02 | 2026-10-31 | Est + S2 | 36aac16, a496f6f, cff9fe1 | áudio definitivo regenerado, versões antigas em `assets/audio-archive` |
| B-01-02 | 2026-10-31 | S1 + S2 | 78ae69b, fdddb95, 59eb086 | Rainha do Ninho; correções restauradas depois do cherry-pick |
| P-07-01 | 2026-10-31 | S2 | b4c7a6c | `DemoEnd`, selo DEMO e fim da demo após o Coveiro |
| A-01-01 | 2026-10-31 | S1 + S2 | 7795aff, 65eb4aa, 233fcb7 | `Options`, preset aplicado e velocidade 1x/2x/3x |

## Bloqueios (precisam do PO)

- [x] 2026-10-31 — Dependências de dev `@gltf-transform/core`, `fake-indexeddb`, `axe-core`, `jsdom`, `@testing-library/react`: **aprovadas** (versão estável atual, exata, ao instalar em E-02-01).
- [x] 2026-10-31 — Worktrees permanentes `../grim-cubes-s1|s2|est` e execução paralela de S1, S2 e Est: **aprovados** (autorização durável; ver `prompt-workers.md` §6).
- [x] 2026-10-31 — `LICENSE` proprietária ("All rights reserved", com nota de terceiros em `docs/legal/third-party.md`): **aprovada e criada na raiz**; E-01-02 só valida.
- [x] 2026-10-31 — Nomes diegéticos (Carrasco, Mercador de Ossos, Ossuário, chefes, biomas) e dash só via Ossuário: **confirmados** (D34).
- [x] 2026-10-31 — Codec PNG para `tools/assets-build`: **A) `pngjs` aprovado** (dev, versão estável exata ao instalar em P-06-02).
- [x] 2026-10-31 — Projeto Vercel criado pelo PO: `galhardos-projects/grim-cubes` (`prj_mv76W0cMpGLPnJAZEq7secqZK8Z1`), já conectado ao Git (domínio `grim-cubes-git-main-…`); repositório local ligado com `vercel link`. Último deploy de produção em `ERROR` (esperado: sem `vercel.json`/build até E-02-04/E-04-02).
- [x] 2026-10-31 — ElevenLabs: PO colocou `ELEVENLABS_API_KEY` em `.env` local.
- [x] 2026-10-31 — E-05-01 marca: **manter "Grim Cubes"** (PO consultou; recomendação aceita). Registrado em `docs/legal/trademark-screening.md`; números de processo pendentes antes do anúncio público.
- [ ] 2026-10-31 — Regeneração de vida (pergunta ao PO, sem bloqueio): para o `--check` voltar a passar com a cura de `hp_regen` real, itens e carta ficaram fracos (+0,5 regen nos três itens, +0,25 na carta). A alternativa é manter itens maiores e subir o `hpRegenFirstPoint` em `data/hero.json` (hoje 0,2 HP/s, GDD §8); o jogador sentiria mais cada ponto, mas o balanço muda de novo. Fica como está até o playtest; decidir depois dele.
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
- [ ] 2026-10-31 — Secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Deployment Protection → Protection Bypass for Automation; `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET`) para o smoke pós-deploy medir o 200 da produção. — bloqueia: assert de produção da E-04-02 e o smoke da E-04-04.
- [ ] 2026-10-31 — Job de perf no CI (`feat/A-01-03-perf-ci`, a3bf307): +10 a 15 min por run. Opções: A) aprovar só em `workflow_dispatch` e em PR com rótulo `perf`; B) recusar e manter o bench manual. — bloqueia: A-01-03.
- [ ] 2026-10-31 — Bench com GPU real na máquina do PO (`BENCH_GPU=1 bun run test:perf`) e relatório Android pelo Chrome mobile. — bloqueia: asserts de fps da E-03-02, P-03-04, P-07-05 e A-01-01.
- [ ] 2026-10-31 — Endpoint e armazenamento da telemetria (Vercel Function + Blob/KV; plano Pro se exigido). Hoje a telemetria opt-in só escreve no log local. — bloqueia: A-06-04 (envio em lote).
- [ ] 2026-10-31 — Proteção da `main` no GitHub (E-01-06): exige mudar o fluxo de integração sem PR (`prompt-workers.md` §6). Opções: A) manter sem proteção enquanto os agentes integram direto; B) proteger e passar a integrar por PR.
- [ ] 2026-10-31 — Assinatura de código do build Windows (certificado pago). Os .exe da v0.2.0 saem sem assinatura e o SmartScreen avisa. Opções: A) assinar antes da demo pública; B) depender só do Steam (sem aviso pelo cliente Steam). — bloqueia: distribuição fora da Steam.
- [ ] 2026-10-31 — Nome do item "Grim Pact" (convive com a dificuldade "Grim"; alternativa "Grim Bargain").
- [ ] 2026-10-31 — Ações manuais pendentes: aprovação das silhuetas (P-06-01), vídeos dos itens (P-01-04, P-04-05, A-03-01), teste manual do gamepad (P-02-02) e checklist de uma run completa no Electron (P-07-02).

## Próximos

1. v0.2.1: rebalanceamento do regen (f763a6b) com o `balance.yml` verde.
2. S2: P1 do `padNav` (A do controle segurado ao abrir um diálogo clica sozinho), `vision` (brilho, contraste, daltonismo, flashes) na `Options` com save schema 5, fuses do Electron, evento `ThornsHit`, P3 do Electron (`decodeURIComponent`, `setPermissionCheckHandler`, `will-redirect`) e checksums dos .exe no release; ícone do app no `electron-builder.yml` e favicon na web.
3. S1: máscaras `_e.png` no `assets-build` (`emissiveTexture`, Art Bible §7), fila de VFX da auditoria, cast do `vision.ts`.
4. Art: commitar `tools/assets-gen/checklist.ts` e o teste (hoje fora do git) e marcar o item 12 do checklist como "não se aplica"; seguir o refino do Mercador.
5. Est: próximo `[ ]` de Resp Est; recalibrar no sim se a carta de `+0,5 regen` mudar.
6. PO: ver Bloqueios.

## Dívidas e observações

- `.env` existe localmente com `ELEVENLABS_API_KEY`; está no `.gitignore`. Nunca commitar.
- Fontes dos percentuais de tela (D31) são secundárias e não verificadas; revisar antes de citar publicamente.
- `reports/` guarda evidência de asserts (`perf-*.json`, `balance-*.json`); os `sim-*.json` regenerados por run ficam no `.gitignore`.
- Oráculo do VAT (`tools/bake-vat/babylon-oracle.test.ts`) ainda sem o timeout de 20 s dos testes pesados.
- `assets/audio-archive/` fica no git (17 MB); se passar de 50 MB, o Orq pergunta ao PO.
- Regen fracionário: a carta dá `+0,5` ponto, e a fórmula do GDD §8 (0,2 + 0,09 × (pontos − 1)) foi pensada para pontos inteiros (0,5 ponto cura 0,155 HP/s, 78% de um ponto inteiro). Decidir entre carta inteira com constantes menores ou fórmula contínua.
- As 28 máscaras `_e.png` existem, mas o `assets-build` ainda não as lê; o item 9 do checklist B-03-01 passa sem que o emissivo chegue ao jogo.
- Pós-processo ffmpeg do `audio-generate` (SDD 08 §3: LUFS, trim, pitch de chefes).
- Risco: conversor `.bbmodel` validado contra o próprio pipeline e o Babylon; os modelos refinados no Blockbench 5 passam pelo leitor de `groups` separado (4a4f19b).
