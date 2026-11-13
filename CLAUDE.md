# Grim Cubes — Instruções de sessão (Claude Code)

Este arquivo complementa as instruções globais do usuário. Em conflito, as regras do projeto aqui prevalecem sobre defaults; as regras globais do PO prevalecem sobre este arquivo.

## Início de toda sessão (obrigatório)

1. Carregar as skills: `caveman`, `karpathy-guidelines`, `graphify`, `ponytail`. Se alguma não estiver disponível no Skill tool, avisar o PO (não inventar o conteúdo).
2. Ler `docs/PROGRESS.md` e a fase atual de `ROADMAP.md`. Para retomar o trabalho numa sessão nova, o roteiro pronto está em `prompt-worker.md`.
3. Se for sessão de implementação com agentes: seguir `prompt-workers.md` (papéis, fila, handoff, DoD, bloqueios).
4. Rodar `git status`, `bun install --frozen-lockfile`, `bun run typecheck && bun run lint && bun run test` antes de começar; consertar primeiro se algo falhar.

## O projeto em uma linha

Roguelite de sobrevivência em ondas, 3D voxel grimdark (medium poly pintado à mão depois da `v0.6.0`, ADR-0029), Babylon.js 9 + TypeScript 7 + React 19 + Tailwind 4 + bitecs, Bun, Vite 8; Steam (Electron) + demo web (Vercel) na 1.0; Android (Capacitor) na 1.1. O loop da `v0.7.0` (ADR-0030, branch `feat/v0.7-shop`) é arena que cresce, três classes com arma fixa, loja de equipamento, Ossuário de magias, chefe a cada 5 rounds e cinco biomas. Detalhes: `docs/gdd.md`, `docs/art-bible.md`, `docs/sdd/`, `docs/adrs/`.

## Comandos

| Comando | Função |
| --- | --- |
| `bun run dev` | Vite dev server (web) |
| `bun run build` | `data:check` + `assets:build` + build web-demo |
| `bun run build:electron` | build Windows (electron-builder) |
| `bun run build:android` | APK de debug (Capacitor); o AAB assinado continua na fase 1.1 |
| `bun run typecheck` | `bun check -b` (type checker nativo do Bun 1.4.4, mesmos erros do `tsc -b`) |
| `bun run lint` | `biome ci .` |
| `bun run lint:md` | markdownlint-cli2 |
| `bun run test` | Vitest (unit + integration) |
| `bun run test:e2e` | Playwright (4 viewports) |
| `bun run test:smoke` | Playwright smoke contra uma URL (bypass da Vercel por secret) |
| `bun run sim` | simulador de balanceamento (`--hero warrior\|ranged\|mage`, `--difficulty`, `--policy`, `--ossuary`, `--check`) |
| `bun run ux:legibility` | mede o contraste herói/chão e inimigo/chão na captura de combate (`reports/legibility.json`); `-- --biome <id>` teleporta o herói para outro bioma e grava `reports/legibility-<id>.json` |
| `bun run test:perf` | bench de desempenho em Playwright (cenários `round20` e `gore-*` por preset); `reports/perf-*.json` |
| `bun run assets:gen` | gera os `.bbmodel` placeholder por script |
| `bun run assets:build` | pipeline `.bbmodel` → glTF (skin rígido) → atlas/VAT (KTX2 na ALPHA) |
| `bun run audio:generate` | gera SFX/música/voz via ElevenLabs (chave em `.env`) |
| `bun run release <patch\|minor\|major\|rc>` | release no padrão vukem |

Até a fase ESTRUTURA concluir E-02, alguns scripts são stubs.

Variável de build `GC_WISHLIST_URL` (`https://store.steampowered.com/app/<AppID>/...`): sem ela o botão "Wishlist na Steam" (menu, fim da demo e resultados da demo) não aparece. Com `GC_DEBUG_API=1` e `?debug=1` o `window.gc.debug` oferece atalhos de captura (`state()`, `killHero()`, `unlockHeroes()`, `grantGold()` e outros; procure `window.gc.debug = {` em `apps/web/src/main.tsx`).

## Arte 3D

- **Direção (ADR-0029, decisão do PO de 2026-11-11):** depois da `v0.6.0` o jogo inteiro troca o voxel por 3D medium poly pintado à mão, com modelos de IA image-to-3D (AssetFurnace, motor Pixal3D) a partir das concept arts. É a trilha S-18 do `ROADMAP.md`.
- **Até a `v0.6.0` sair:** a `main` continua voxel e ninguém cria nem refina modelo 3D. A arte voxel fica preservada na branch `voxel-legacy`.
- **Na S-18:** use a skill `medium-poly-art` e o agente `medium-poly-artist` (papel Art). Só Pixal3D, nunca Hunyuan3D. Todo GLB entra com o `.provenance.json` ao lado. O herói de prova (S-18-03) para e espera a aprovação do PO.
- **Nada baixa nem custa sem o PO:** instalar a ferramenta, baixar pesos de modelo, gerar na nuvem ou alugar GPU exigem o aval dele registrado em `docs/PROGRESS.md`. A máquina do PO tem uma RTX 4060 de 8 GB, abaixo do que a ferramenta testou.
- **Legado:** a skill `blockbench-art`, o agente `blockbench-artist` e `docs/blockbench.md` valem só para a branch `voxel-legacy` e saem da `main` na S-18-08.

## Convenções

- Código, identificadores, nomes de arquivos, commits (Conventional Commits) e logs em inglês; documentação em português.
- Versões exatas de dependências; nenhuma dependência nova sem aprovação do PO.
- Tabs de largura 4 (Biome + `.editorconfig`); Markdown passa em `bun run lint:md`.
- TypeScript estrito, sem `any`, sem `@ts-ignore`; `Math.random` proibido em `packages/game`; nada alocado por frame em `simulate`/`sync`.
- Números de balanceamento só em `data/*.json` (inclusive as três classes, em `data/heroes.json`); cores só por tokens Tailwind (`packages/ui/src/theme.css`).
- Camadas: `core` ← `game` ← `render`; `ui` lê só o store; `platform` é o único lugar com Electron/Capacitor/Steam.
- Alvos de tela obrigatórios em UI: 1920×1080, 2560×1440, 896×414, 800×360 (landscape).
- Toda alteração relevante: atualizar SDD/ADR/GDD/Art Bible afetados e `CHANGELOG.md` `[Unreleased]`; atualizar `docs/PROGRESS.md`.
- Pendências legais, jurídicas, de contas, custos e de lançamento nas lojas (Steam, Google Play, Vercel) vivem em `todo-later.md`: toda entrega que cria, muda ou resolve uma delas atualiza o arquivo no mesmo commit.
- Nunca commitar segredos (`.env`); nunca `push --force`; nunca apagar histórico sem aprovação do PO.

## Memória e contexto

- Antes de ler muitos arquivos de código, usar `graphify query "<pergunta>"` se `graphify-out/graph.json` existir; `graphify update .` quando estiver velho.
- Não ler `node_modules/`, `dist/`, `public/assets/` binários, `bun.lock`.
- Compactar a sessão ao atingir ~75% do contexto, preservando: arquivos modificados, comandos, decisões, pendências.
