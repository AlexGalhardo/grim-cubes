# PROGRESS

Atualizado: 2026-10-31 12:00 (fuso do PO) | Versão: 0.0.0 | Fase: 1 — ESTRUTURA (fase 2 adiantada em paralelo) | Sessão: #1

Meta do PO (2026-10-31): implementar o ROADMAP até o fim sem interrupções; tarefas `Resp: PO` ficam em Bloqueios e os agentes seguem com o resto. Hooks lefthook instalados em `.git` (valem para todos os worktrees).

## Agentes

| Agente | Tarefa atual | Branch | Estado | Desde | Lock |
| --- | --- | --- | --- | --- | --- |
| Orq | merges; CI de main; PROGRESS | main | em andamento | 12:00 | — |
| S1 | P-06-01 etapa 3–4: horda e props glb no `apps/web`, capturas | feat/P-06-01-assets-gen | implementando | 12:00 | `apps/web/**` |
| S2 | P-04-04 tiers/SMG/MG → P-05-04 loja → P-05-05 itens → P-05-08 resultados | feat/P-04-04-* | implementando | 12:00 | `data/**` |
| Est | E-05-05, sync de docs (E-04-04/SDD 12), snapshots por plataforma, gate do release, harness `tools/sim` | chore/E-05-05-validate | implementando | 12:00 | docs/sdd/11–12, ADR-0019, `playwright.config.ts`, `.github/**`, `tools/sim/**` |
| Esp | standby → auditoria a cada merge | — | revisando | 12:00 | — |

Estado de `main` (6b44270): 276 testes unitários + 8 e2e (4 alvos × boot e level-up); CI verde em `main` com e2e real. A run já roda no browser (spawn, combate, drops, XP, level-up, chunks, origin shift); inimigos ainda invisíveis até a S1 ligar a horda com os modelos gerados (P-06-01). Concluídas desde as 09:30: P-01-01, P-02-02, P-03-04 (espelho X corrigido), P-04-03, P-05-02, P-05-03, P-06-01, P-06-07, E-02-06, E-04-01, E-04-04, E-03-01. Release v0.1.0 bloqueada até o gate do `release.yml` esperar o CI (Est).

Dívida operacional: com 4 agentes rodando testes ao mesmo tempo, o `pre-push` às vezes falha por timeout de CPU/worker (refazer o push resolve; a suíte isolada roda em ~5 s). Não contornar o hook.

Risco: conversor `.bbmodel` validado só contra o próprio pipeline e o Babylon; falta golden contra um export real do Blockbench (quando o PO refinar o 1º modelo).

Pendência do PO: secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Deployment Protection → Protection Bypass for Automation; e `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET`) para o smoke pós-deploy (E-04-04).

Vercel: build corrigido (3721471: `--config apps/web/vite.config.ts` + `vercel.json`); deploy de produção `grim-cubes-fc7qzglh5` **Ready**; URL de produção responde 302 (proteção SSO mantida, decisão B).

Dívida: pós-processo ffmpeg do `audio-generate` (SDD 08 §3: LUFS, trim, pitch de chefes).

## Concluídas (últimas 20)

| ID | Data | Agente | Commit | Observação |
| --- | --- | --- | --- | --- |
| E-02-07 | 2026-10-31 | S2 (Orq verificou) | 8add02b | lefthook (biome, markdown, data, secrets, commitlint, typecheck e unit no pre-push); lint-extra ignora `engines` |
| E-03-04 | 2026-10-31 | Est + Esp | 15b6038 | preço por tier 20/40/80/160 (decisão do Orq, meio das faixas do GDD §15.1); raio dos inimigos pelo Art Bible §5.1; `data/hero.json` |
| P-06-02 | 2026-10-31 | S1 (Orq verificou; Esp audita) | 278d2ec | `pngjs` 7.0.0 + `@types/pngjs` 6.0.5; `KHR_materials_unlit` reescrito à mão (sem `@gltf-transform/extensions`) |
| P-01-02 | 2026-10-31 | S1 (Orq verificou; Esp audita) | 00d1dc2 | gerador injetado (P-01-01 aguarda D3); pool 81, slots 9×9 |
| Auditoria fase 1 | 2026-10-31 | Esp → Orq | 0ab5190 | furos de camada fechados (subcaminhos do Babylon, imports relativos, override de render); `types: ["bun"]`; teste SMHasher `0xB0F57EE3` |
| E-02-05 | 2026-10-31 | Est (Orq verificou; Esp audita pós-merge) | 36f1f7d | Vitest 5 `projects` unit/unit-ui/integration; istanbul json-summary |
| E-02-03 | 2026-10-31 | S2 (Orq verificou; Esp audita pós-merge) | 9b5b11a | Biome `preset: recommended`, camadas por override, barrel do Babylon proibido, plugin GritQL contra `Math.random` |
| E-02-02 | 2026-10-31 | S2 (Orq verificou; Esp audita pós-merge) | d76a6d1 | `skipLibCheck` (Babylon + `exactOptionalPropertyTypes`); `typecheck` = `bun check -b` (89ae8e4, pedido do PO) |
| E-03-01 (parcial: core, render) | 2026-10-31 | S1 | d8b8d08 | falta `game/loop`, `ui/App`, `platform/detect` (S2); 25 testes verdes |
| E-02-01 | 2026-10-31 | S2 (Orq verificou asserts; Esp audita pós-merge) | e154a99 | 394 pacotes; TS 7.0.2 com `tsc` ok; jsdom 30.1.3, @testing-library/react 16.3.3, @gltf-transform/core 4.5.1, fake-indexeddb 6.2.7, axe-core 4.14.0 |
| E-01-05 | 2026-10-31 | Orq | a59cf07 | tabela de comandos adicionada ao `AGENTS.md` |
| E-01-04 | 2026-10-31 | Orq | a59cf07 | seções obrigatórias presentes; markdownlint ok |
| E-01-03 | 2026-10-31 | Est + Esp | f14a65b | rodapé `[Unreleased]` ancorado em `compare/2775e6e...HEAD` (sem tag); reescrever na v0.1.0 (E-04-03) |
| E-01-02 | 2026-10-31 | S2 + Esp | abe4492 | `.gitattributes` LF + binários; `PROMPT.md` renormalizado para LF; `*.pfx` ignorado |
| E-01-01 | 2026-10-31 | Orq (aprovado pelo PO, inline) | 2775e6e | `git init -b main`, remoto `origin`, push; scan de segredos limpo |
| DOCS | 2026-10-31 | Diretor (sessão de documentação) | — | Etapas 1–6 da documentação; ver CHANGELOG `[Unreleased]` |
| PO-OK | 2026-10-31 | PO | — | 4 bloqueios aprovados; `LICENSE` criada; concept arts em `references/concept-arts/` |

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
- [x] 2026-10-31 — E-05-04: **plano Creator** (recomendação aceita). Ambiente `audio` criado no GitHub com a variável `ELEVENLABS_PLAN=creator`. Falta o secret: a leitura de `.env` é bloqueada por regra do PO, então o PO roda `! bun -e "process.stdout.write(process.env.ELEVENLABS_API_KEY ?? '')" | gh secret set ELEVENLABS_API_KEY --env audio` e acrescenta `ELEVENLABS_PLAN=creator` ao `.env`. Geração real (8.500 créditos estimados) só sob pedido.
- [x] 2026-10-31 — Vercel: **B escolhida (recomendação aceita): manter a proteção; o smoke usa bypass token (E-04-04); desligar só em produção ao publicar a demo.** `ssoProtection` está em `all_except_custom_domains`, o que exige login Vercel até no domínio de produção `*.vercel.app`; a demo pública e o smoke (E-04-04) precisam de acesso anônimo. Opções: A) desligar proteção só em produção (`prod_deployment_urls_and_all_previews` → manter previews protegidos); B) manter e usar bypass token no smoke; C) domínio próprio. Recomendação: B agora (nada público antes da demo), A ao publicar a demo. — bloqueia: E-04-02 assert de produção, E-04-04.
- [x] 2026-10-31 — D1 câmera (GDD §5, ADR-0017): **PO escolheu A (2026-10-31).** `beta` do `ArcRotateCamera` é medido do zênite; 0,96 rad = 35° de elevação, não 55°. A) beta 0,611 rad (55°, intenção do GDD; anel de spawn 22–30 u fica fora da tela) — recomendado; B) manter 0,96 (35°; inimigos nascem à vista). — bloqueia: P-02-01.
- [x] 2026-10-31 — D3 densidade de props (GDD §6.3): **PO escolheu A (2026-10-31).** com a regra de corredor cabem no máximo 8–9 bloqueantes por chunk 4×4. A) 4–8 bloqueantes — recomendado; B) manter 4–10 e afrouxar corredor para "≤ 3 vizinhos". — bloqueia: P-01-01.
- [x] 2026-10-31 — D5 fluxo de arte (Art Bible §8/§10): **PO escolheu A (2026-10-31).** A) `.bbmodel` como fonte gerado por script e convertido para glTF pelo `assets-build` (PO refina no Blockbench) — recomendado; B) export manual de glTF pelo Blockbench. — bloqueia: P-06-01.
- [x] 2026-10-31 — Dependência nova: **A aprovada (recomendação aceita); E-02-04 mesclada (f4ac22b).** `@types/react` 19.3.0 e `@types/react-dom` 19.3.0 (devDeps exatas). React 19 não traz tipos; sem elas nenhum `.tsx` passa no typecheck (HUD, `ui/App`, design system). Opções: A) aprovar (recomendado; só tipos, mesmo mantenedor DefinitelyTypes do ecossistema React); B) escrever declarações mínimas próprias (frágil). — bloqueia: E-02-04 (branch pronta), E-02-06, E-03-02, E-03-03, toda UI.
- [x] 2026-10-31 — Aprovação retroativa: **A aprovada.** `@types/pngjs` 6.0.5 (dev, só tipos do `pngjs` já aprovado) entrou em `main` com a P-06-02 sem aprovação explícita (achado do Esp). Opções: A) aprovar (recomendado); B) remover e declarar tipos mínimos em `tools/assets-build`. — não bloqueia nada.
- [x] 2026-10-31 — Concept arts novas (`references/concept-arts/*.png`, 17 MB): **fora do git** (repositório público; sem Git LFS para não adicionar ferramenta). Ficam locais; `.gitignore` ignora os PNG da pasta, o `README.md` dela continua versionado.

## Próximos

1. E-02-06 (Playwright + capturas nos 4 alvos), E-03-02 (input + HUD), E-03-03 (design system) — liberados por `@types/react`.
2. Release `v0.1.0` (`bun run release minor --publish`) quando o critério de saída da fase 1 fechar (E-02-06 + E-04-01 + E-04-04).
3. E-04-02 (`vercel.json`) e E-04-04 (smoke com bypass token).

## Dívidas e observações

- `.env` existe localmente com `ELEVENLABS_API_KEY`; está no `.gitignore`. Nunca commitar.
- Fontes dos percentuais de tela (D31) são secundárias e não verificadas; revisar antes de citar publicamente.
- `grill-me` aponta para a skill `grilling` inexistente; `interview-me` foi usada no brainstorming.
- [idle] Revisão S1 (2026-10-31) das fases 1–2: 25 achados. Aplicados no ROADMAP pelo Orq os da fase 1 (ciclo E-03-02 ↔ E-02-06, tarefa nova E-03-06 de ECS, versões e `@babylonjs/inspector` em E-02-01, `createEngine` assíncrono só WebGL2 + `NullEngine`, valores de ouro de rng/loop, protocolo de fps). Os da fase 2 (câmera `beta`, histerese de chunks, contagem de props, chão por bioma, atlas de chão, VAT em PNG 8 bits, oráculo do VAT, bench antes de P-03-04, números em `data/world.json`/`data/render.json`, donos de `core/spatial` e origin shifting) serão aplicados pelo Orq ao abrir a fase 2.
- Contratos a combinar antes de E-03-01: assinaturas de `core/rng` (`mulberry32`, `hash32` variádico com i32 negativo), `core/store`, `core/logger`, `window.gc` tipado (`ready`, `debug` fora de produção), `render.createEngine(): Promise<Engine>`.
- `reports/` não está no `.gitignore` de propósito: `reports/perf-*.json` e `sim-*.json` são evidência de asserts.
