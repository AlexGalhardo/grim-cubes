# Grim Cubes — Instruções de sessão (Claude Code)

Este arquivo complementa as instruções globais do usuário. Em conflito, as regras do projeto aqui prevalecem sobre defaults; as regras globais do PO prevalecem sobre este arquivo.

## Início de toda sessão (obrigatório)

1. Carregar as skills: `caveman`, `karpathy-guidelines`, `graphify`, `ponytail`. Se alguma não estiver disponível no Skill tool, avisar o PO (não inventar o conteúdo).
2. Ler `docs/PROGRESS.md` e a fase atual de `ROADMAP.md`.
3. Se for sessão de implementação com agentes: seguir `prompt-workers.md` (papéis, fila, handoff, DoD, bloqueios).
4. Rodar `git status`, `bun install --frozen-lockfile`, `bun run typecheck && bun run lint && bun run test` antes de começar; consertar primeiro se algo falhar.

## O projeto em uma linha

Roguelite de sobrevivência em ondas, 3D voxel grimdark, Babylon.js 9 + TypeScript 7 + React 19 + Tailwind 4 + bitecs, Bun, Vite 8; Steam (Electron) + demo web (Vercel) na 1.0; Android (Capacitor) na 1.1. Detalhes: `docs/gdd.md`, `docs/art-bible.md`, `docs/sdd/`, `docs/adrs/`.

## Comandos

| Comando | Função |
| --- | --- |
| `bun run dev` | Vite dev server (web) |
| `bun run build` | `data:check` + `assets:build` + build web-demo |
| `bun run build:electron` | build Windows (electron-builder) |
| `bun run build:android` | build AAB (fase 1.1) |
| `bun run typecheck` | `bun check -b` (type checker nativo do Bun 1.4.4, mesmos erros do `tsc -b`) |
| `bun run lint` | `biome ci .` |
| `bun run lint:md` | markdownlint-cli2 |
| `bun run test` | Vitest (unit + integration) |
| `bun run test:e2e` | Playwright (4 viewports) |
| `bun run test:smoke` | Playwright smoke contra uma URL (bypass da Vercel por secret) |
| `bun run sim` | simulador de balanceamento |
| `bun run assets:gen` | gera os `.bbmodel` placeholder por script |
| `bun run assets:build` | pipeline `.bbmodel` → glTF (skin rígido) → atlas/VAT (KTX2 na ALPHA) |
| `bun run audio:generate` | gera SFX/música/voz via ElevenLabs (chave em `.env`) |
| `bun run release <patch\|minor\|major\|rc>` | release no padrão vukem |

Até a fase ESTRUTURA concluir E-02, alguns scripts são stubs.

## Convenções

- Código, identificadores, nomes de arquivos, commits (Conventional Commits) e logs em inglês; documentação em português.
- Versões exatas de dependências; nenhuma dependência nova sem aprovação do PO.
- Tabs de largura 4 (Biome + `.editorconfig`); Markdown passa em `bun run lint:md`.
- TypeScript estrito, sem `any`, sem `@ts-ignore`; `Math.random` proibido em `packages/game`; nada alocado por frame em `simulate`/`sync`.
- Números de balanceamento só em `data/*.json`; cores só por tokens Tailwind (`packages/ui/src/theme.css`).
- Camadas: `core` ← `game` ← `render`; `ui` lê só o store; `platform` é o único lugar com Electron/Capacitor/Steam.
- Alvos de tela obrigatórios em UI: 1920×1080, 2560×1440, 896×414, 800×360 (landscape).
- Toda alteração relevante: atualizar SDD/ADR/GDD/Art Bible afetados e `CHANGELOG.md` `[Unreleased]`; atualizar `docs/PROGRESS.md`.
- Nunca commitar segredos (`.env`); nunca `push --force`; nunca apagar histórico sem aprovação do PO.

## Memória e contexto

- Antes de ler muitos arquivos de código, usar `graphify query "<pergunta>"` se `graphify-out/graph.json` existir; `graphify update .` quando estiver velho.
- Não ler `node_modules/`, `dist/`, `public/assets/` binários, `bun.lock`.
- Compactar a sessão ao atingir ~75% do contexto, preservando: arquivos modificados, comandos, decisões, pendências.
