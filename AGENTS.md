# Grim Cubes — AGENTS.md

Instruções para qualquer agente de código (Claude Code, Codex, Cursor, etc.) trabalhando neste repositório. O conteúdo é o mesmo de `CLAUDE.md`; mantenha os dois sincronizados.

## Início de sessão

1. Carregue as skills `caveman`, `karpathy-guidelines`, `graphify` e `ponytail` (se existirem no seu ambiente; se não existirem, informe o PO).
2. Leia `docs/PROGRESS.md`, depois a fase atual em `ROADMAP.md`, depois `prompt-workers.md` se for implementar com agentes. Para retomar numa sessão nova, use o roteiro de `prompt-worker.md`.
3. Verifique o ambiente: `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run test`.

## Comandos

| Comando | Função |
| --- | --- |
| `bun run dev` | Vite dev server (web) |
| `bun run build` | `data:check` + `assets:build` + build web-demo |
| `bun run typecheck` | `bun check -b` (type checker nativo do Bun 1.4.4, mesmos erros do `tsc -b`) |
| `bun run lint` | `biome ci .` |
| `bun run lint:md` | markdownlint-cli2 |
| `bun run test` | Vitest (unit + integration) |
| `bun run test:e2e` | Playwright (4 viewports) |
| `bun run sim` | simulador de balanceamento (`--hero warrior\|ranged\|mage`, `--difficulty`, `--policy`, `--ossuary`, `--check`) |
| `bun run ux:legibility` | mede o contraste herói/chão e inimigo/chão na captura de combate (`reports/legibility.json`; `-- --biome <id>` para outro bioma) |
| `bun run test:perf` | bench de desempenho (cenários `round20` e `gore-*`) |
| `bun run release <patch\|minor\|major\|rc>` | release no padrão vukem |

Lista completa em `CLAUDE.md`; até a fase ESTRUTURA concluir E-02, alguns scripts são stubs.

## Mapa do repositório

| Caminho | Conteúdo |
| --- | --- |
| `docs/gdd.md` | Game Design Document |
| `docs/art-bible.md` | Art Bible + design system (§16) + alvos de tela (§17) |
| `docs/sdd/` | Software Design Documents (14) |
| `docs/adrs/` | Architecture Decision Records (30, até o ADR-0030) |
| `docs/brainstorming.md` | decisões do PO D01–D33 |
| `docs/web-search.md` | pesquisa com fontes |
| `docs/PROGRESS.md` | estado compartilhado dos agentes |
| `todo-later.md` | pendências legais, de contas e de lançamento (Steam, Google Play, Vercel); atualizado junto com o desenvolvimento |
| `ROADMAP.md` | fases e microtarefas com asserts |
| `prompt-workers.md` | protocolo dos agentes de implementação |
| `prompt-worker.md` | roteiro pronto para abrir a próxima sessão de trabalho (estado, ordem das tarefas, regras) |
| `prompt-concept-arts.md` | prompts de concept art |
| `apps/`, `packages/`, `data/`, `assets/`, `tools/`, `tests/` | código (ver `docs/sdd/01-architecture.md`) |

## Arte 3D

- Direção (ADR-0029): depois da `v0.6.0` o jogo inteiro troca o voxel por 3D medium poly pintado à mão, com modelos de IA image-to-3D (AssetFurnace, motor Pixal3D) a partir das concept arts. Trilha S-18 do `ROADMAP.md`.
- Até a `v0.6.0` sair, a `main` continua voxel e ninguém cria nem refina modelo 3D. A arte voxel fica na branch `voxel-legacy`.
- Na S-18: skill `.claude/skills/medium-poly-art/SKILL.md` e agente `.claude/agents/medium-poly-artist.md` (papel Art em `prompt-workers.md` §2). Só Pixal3D; todo GLB entra com o `.provenance.json`; o herói de prova (S-18-03) espera a aprovação do PO.
- Instalar a ferramenta, baixar pesos, gerar na nuvem ou alugar GPU só com o aval do PO em `docs/PROGRESS.md`.
- Todo asset passa em `bun run assets:build`, nos testes de `tools/assets-build` e `tools/bake-vat`, em `bun run ux:legibility` e em `bun run test:perf`.
- Legado: a skill `blockbench-art`, o agente `blockbench-artist` e `docs/blockbench.md` valem só para a `voxel-legacy`.

## Regras resumidas

- Inglês no código, commits e identificadores; português na documentação.
- Conventional Commits; SemVer; Keep a Changelog no padrão vukem (`docs/sdd/13-release-versioning.md`).
- Versões exatas; sem dependência nova sem aprovação do PO.
- Tabs de largura 4; Biome 2; markdownlint.
- TypeScript estrito; sem `any`; `Math.random` proibido em `packages/game`.
- Números de jogo em `data/*.json`; cores por tokens Tailwind.
- UI testada nos 4 alvos de tela (1920×1080, 2560×1440, 896×414, 800×360).
- Definition of Done em `docs/sdd/11-testing-quality.md` §5.
- Pare e pergunte ao PO nos casos de `prompt-workers.md` §10 (design não coberto, escopo, gastos, dependências, ações destrutivas, segredos).
