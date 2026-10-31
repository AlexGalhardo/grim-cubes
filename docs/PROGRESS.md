# PROGRESS

Atualizado: 2026-10-31 02:40 (fuso do PO) | Versão: 0.0.0 (sem código) | Fase: 1 — ESTRUTURA | Sessão: #1

Meta do PO (2026-10-31): implementar o ROADMAP até o fim sem interrupções; tarefas `Resp: PO` ficam em Bloqueios e os agentes seguem com o resto.

## Agentes

| Agente | Tarefa atual | Branch | Estado | Desde | Lock |
| --- | --- | --- | --- | --- | --- |
| Orq | correções do ROADMAP (revisão S1) | main | em andamento | 02:40 | ROADMAP.md |
| S1 | aguardando E-02-02 para E-03-01 (core, render) | — | standby | 02:40 | — |
| S2 | E-02-01 | feat/E-02-01-package-json | implementando | 02:40 | package.json, bun.lock |
| Est | aguardando E-02-01 para E-02-05 / E-03-04 | — | standby | 02:40 | — |
| Esp | — | — | standby | 02:40 | — |

## Concluídas (últimas 20)

| ID | Data | Agente | Commit | Observação |
| --- | --- | --- | --- | --- |
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
- [ ] 2026-10-31 — Codec PNG para `tools/assets-build` e `tools/bake-vat` (atlas, VAT, leitura de `_d.png`). Opções: A) `pngjs` (dev, versão estável exata); B) codec próprio sobre `node:zlib` (sem dependência, ~200 linhas + testes); C) `@gltf-transform/extensions` + `sharp`. Recomendação: A (madura, sem binário nativo). — bloqueia: P-06-02, P-06-03 (fase 2; não bloqueia a fase 1).

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
