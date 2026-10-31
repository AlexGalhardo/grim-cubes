# Grim Cubes — AGENTS.md

Instruções para qualquer agente de código (Claude Code, Codex, Cursor, etc.) trabalhando neste repositório. O conteúdo é o mesmo de `CLAUDE.md`; mantenha os dois sincronizados.

## Início de sessão

1. Carregue as skills `caveman`, `karpathy-guidelines`, `graphify` e `ponytail` (se existirem no seu ambiente; se não existirem, informe o PO).
2. Leia `docs/PROGRESS.md`, depois a fase atual em `ROADMAP.md`, depois `prompt-workers.md` se for implementar com agentes.
3. Verifique o ambiente: `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run test`.

## Mapa do repositório

| Caminho | Conteúdo |
| --- | --- |
| `docs/gdd.md` | Game Design Document |
| `docs/art-bible.md` | Art Bible + design system (§16) + alvos de tela (§17) |
| `docs/sdd/` | Software Design Documents (14) |
| `docs/adrs/` | Architecture Decision Records (20) |
| `docs/brainstorming.md` | decisões do PO D01–D33 |
| `docs/web-search.md` | pesquisa com fontes |
| `docs/PROGRESS.md` | estado compartilhado dos agentes |
| `ROADMAP.md` | fases e microtarefas com asserts |
| `prompt-workers.md` | protocolo dos agentes de implementação |
| `prompt-concept-arts.md` | prompts de concept art |
| `apps/`, `packages/`, `data/`, `assets/`, `tools/`, `tests/` | código (ver `docs/sdd/01-architecture.md`) |

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
