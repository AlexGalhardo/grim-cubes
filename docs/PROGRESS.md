# PROGRESS

Atualizado: 2026-10-31 03:30 (fuso do PO) | Versão: 0.0.0 (sem código) | Fase: 1 — ESTRUTURA | Sessão: #1

Meta do PO (2026-10-31): implementar o ROADMAP até o fim sem interrupções; tarefas `Resp: PO` ficam em Bloqueios e os agentes seguem com o resto.

## Agentes

| Agente | Tarefa atual | Branch | Estado | Desde | Lock |
| --- | --- | --- | --- | --- | --- |
| Orq | merges; Vercel; PROGRESS | main | em andamento | 03:30 | — |
| S1 | E-03-01 (core, render) + E-03-02 (render) — validar com deps | feat/E-03-01-core-render | implementando | 03:30 | `packages/core/**` até fechar E-03-01 |
| S2 | E-02-02 + E-02-03 | feat/E-02-02-tsconfig-biome | implementando | 03:30 | tsconfig*.json, biome.json, `packages/*/package.json` |
| Est | E-02-05 | feat/E-02-05-vitest | implementando | 03:30 | vitest.config.ts |
| Esp | revisão E-03-04 + auditoria pós-merge E-02-01 | feat/E-03-04-data | revisando | 03:30 | — |

## Concluídas (últimas 20)

| ID | Data | Agente | Commit | Observação |
| --- | --- | --- | --- | --- |
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
- [ ] 2026-10-31 — E-05-01 marca: PO informou que já consultou. Falta registrar em `docs/legal/trademark-screening.md` as bases consultadas e a decisão ("manter nome"?). — bloqueia: E-05-02.
- [ ] 2026-10-31 — E-05-03 Steamworks: PO cria depois. — bloqueia: ALPHA (A-06).
- [ ] 2026-10-31 — E-05-04: qual plano ElevenLabs (Creator?) e posso criar o secret `ELEVENLABS_API_KEY` no ambiente `audio` do GitHub a partir do `.env` (`gh secret set --env audio`)? Envolve credencial, por isso pergunto. — bloqueia: P-06 áudio.
- [ ] 2026-10-31 — Vercel: `ssoProtection` está em `all_except_custom_domains`, o que exige login Vercel até no domínio de produção `*.vercel.app`; a demo pública e o smoke (E-04-04) precisam de acesso anônimo. Opções: A) desligar proteção só em produção (`prod_deployment_urls_and_all_previews` → manter previews protegidos); B) manter e usar bypass token no smoke; C) domínio próprio. Recomendação: B agora (nada público antes da demo), A ao publicar a demo. — bloqueia: E-04-02 assert de produção, E-04-04.
- [ ] 2026-10-31 — D1 câmera (GDD §5, ADR-0017): `beta` do `ArcRotateCamera` é medido do zênite; 0,96 rad = 35° de elevação, não 55°. A) beta 0,611 rad (55°, intenção do GDD; anel de spawn 22–30 u fica fora da tela) — recomendado; B) manter 0,96 (35°; inimigos nascem à vista). — bloqueia: P-02-01.
- [ ] 2026-10-31 — D3 densidade de props (GDD §6.3): com a regra de corredor cabem no máximo 8–9 bloqueantes por chunk 4×4. A) 4–8 bloqueantes — recomendado; B) manter 4–10 e afrouxar corredor para "≤ 3 vizinhos". — bloqueia: P-01-01.
- [ ] 2026-10-31 — D5 fluxo de arte (Art Bible §8/§10): A) `.bbmodel` como fonte gerado por script e convertido para glTF pelo `assets-build` (PO refina no Blockbench) — recomendado; B) export manual de glTF pelo Blockbench. — bloqueia: P-06-01.

## Próximos

1. E-02-02 / E-02-03 / E-02-04 / E-02-07 (S2), E-02-05 e E-03-04 (Est) — liberados por E-02-01.
2. E-03-01 — contratos `packages/*/src/index.ts` combinados entre S1 e S2 antes de implementar (lista em Dívidas, item revisão S1).
3. E-05-01, E-05-03, E-05-04 — tarefas manuais do PO, em paralelo.

## Dívidas e observações

- `.env` existe localmente com `ELEVENLABS_API_KEY`; está no `.gitignore`. Nunca commitar.
- Fontes dos percentuais de tela (D31) são secundárias e não verificadas; revisar antes de citar publicamente.
- `grill-me` aponta para a skill `grilling` inexistente; `interview-me` foi usada no brainstorming.
- [idle] Revisão S1 (2026-10-31) das fases 1–2: 25 achados. Aplicados no ROADMAP pelo Orq os da fase 1 (ciclo E-03-02 ↔ E-02-06, tarefa nova E-03-06 de ECS, versões e `@babylonjs/inspector` em E-02-01, `createEngine` assíncrono só WebGL2 + `NullEngine`, valores de ouro de rng/loop, protocolo de fps). Os da fase 2 (câmera `beta`, histerese de chunks, contagem de props, chão por bioma, atlas de chão, VAT em PNG 8 bits, oráculo do VAT, bench antes de P-03-04, números em `data/world.json`/`data/render.json`, donos de `core/spatial` e origin shifting) serão aplicados pelo Orq ao abrir a fase 2.
- Contratos a combinar antes de E-03-01: assinaturas de `core/rng` (`mulberry32`, `hash32` variádico com i32 negativo), `core/store`, `core/logger`, `window.gc` tipado (`ready`, `debug` fora de produção), `render.createEngine(): Promise<Engine>`.
- `reports/` não está no `.gitignore` de propósito: `reports/perf-*.json` e `sim-*.json` são evidência de asserts.
