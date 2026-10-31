# SDD 01 — Arquitetura geral

## 1. Objetivo

Um único código TypeScript roda em três alvos (navegador, Electron, Android WebView) sem ramificações de lógica de jogo. A simulação é determinística e separada da renderização; a UI é um overlay React que só lê um store.

## 2. Camadas

```text
┌──────────────────────────────────────────────────────────────┐
│ platform/   adapters: web | electron (steamworks) | capacitor │
├──────────────────────────────────────────────────────────────┤
│ ui/         React 19 + Tailwind 4 (HUD, menus, loja, Ossuário)│
├──────────────────────────────────────────────────────────────┤
│ render/     Babylon.js 9: cena, câmera, thin instances, VAT,  │
│             VFX, decals, áudio (AudioV2)                      │
├──────────────────────────────────────────────────────────────┤
│ game/       simulação pura: bitecs world, sistemas, regras,   │
│             dados (JSON), RNG, eventos; sem DOM, sem Babylon  │
├──────────────────────────────────────────────────────────────┤
│ core/       utilitários: PRNG, math, spatial hash, event bus, │
│             store, logger, schema de save                     │
└──────────────────────────────────────────────────────────────┘
```

Regra de dependência (obrigatória, verificada por regra de lint `noRestrictedImports` do Biome): `core` não importa nada do projeto; `game` importa só `core`; `render` importa `core` e `game`; `ui` importa `core`, `game` (tipos e store) e nunca `render`; `platform` importa tudo e é o único lugar com `window.electron`, `Capacitor` ou `steamworks`.

## 3. Estrutura de pastas

```text
grim-cubes/
├── apps/
│   ├── web/              # Vite SPA (entrada única para os 3 alvos)
│   ├── electron/         # main process, preload, electron-builder config
│   └── android/          # projeto Capacitor (gerado, parcialmente versionado)
├── packages/
│   ├── core/
│   ├── game/
│   ├── render/
│   ├── ui/
│   └── platform/
├── data/                 # JSON de balanceamento (fonte única)
│   ├── enemies.json  weapons.json  items.json  cards.json
│   ├── ossuary.json  rounds.json   bosses.json biomes.json
│   └── schema/          # JSON Schema de cada arquivo
├── assets/src/           # .bbmodel, .glb, .png, prompts de áudio (fonte)
├── public/assets/        # saída do pipeline (gerado, versionado por manifest)
├── tools/                # scripts Bun: assets:build, bake:vat, audio:generate, sim
├── tests/
│   ├── unit/  integration/  e2e/  smoke/
├── docs/
├── .github/workflows/
├── biome.json  lefthook.yml  vite.config.ts  tsconfig.json  package.json  bun.lock
└── ROADMAP.md  CHANGELOG.md  CLAUDE.md  AGENTS.md  prompt-workers.md
```

Monorepo com Bun workspaces (`"workspaces": ["apps/*", "packages/*"]`). Um único `tsconfig.json` base com `paths` (`@gc/core`, `@gc/game`, …).

## 4. Fluxo de dados por frame

```text
input (platform) ──► InputState (core.store)
                                   │
requestAnimationFrame ─► GameLoop.tick(dt)
                           │ acumulador fixo 1/60 s
                           ├─► game.simulate(world, step)   (N vezes)
                           │      └─ emite GameEvents (ring buffer)
                           ├─► render.sync(world, alpha)     (1 vez; interpola)
                           ├─► render.consumeEvents(events)  (VFX, som, decals)
                           └─► store.publish(snapshot)        (10–15 Hz, HUD)
```

- `game` nunca chama `render`; comunica-se por eventos (`EnemyDied`, `PlayerHit`, `LevelUp`, `RoundEnded`, `BossPhase`…), structs em arrays pré-alocados.
- `render.sync` lê componentes (posição, rotação, animação) direto dos TypedArrays do bitecs e escreve nos buffers de thin instances.
- `store.publish` cria um snapshot imutável pequeno (HP, XP, ouro, round, timer, arma, itens, estado de tela) a 10–15 Hz. React assina via `useSyncExternalStore`.

## 5. Bootstrap

1. `apps/web/src/main.tsx`: detecta plataforma (`platform.detect()`), cria `<canvas>` e monta React.
2. `render.createEngine(canvas)`: tenta `WebGPUEngine` se `navigator.gpu` e `prefs.webgpu` (ADR-0014), senão `Engine` WebGL2. Se WebGL2 indisponível: tela de erro com instruções.
3. `assets.loadManifest()` → carrega atlas, modelos, VAT e sons do menu (lazy para biomas e chefes).
4. `audio.create()` (sem unlock); unlock no primeiro gesto (tela de título).
5. `save.load()` → `MetaState` (Ossuário, recordes, opções, flags de demo/compra).
6. Menu principal. `game.newRun(seed, difficulty, meta)` cria o `world`.

## 6. Módulos de `game` (resumo)

| Módulo | Responsabilidade |
| --- | --- |
| `world` | criação do bitecs world, registro de componentes, pools de entidades |
| `systems/*` | um arquivo por sistema (ordem em SDD 02) |
| `rules/*` | funções puras: dano, preço, chance de tier, XP, almas (testáveis sem world) |
| `data/*` | loaders tipados dos JSON com validação por JSON Schema no build |
| `rng` | `mulberry32` + `hash32` (core) encapsulados em streams nomeados (`rng.spawn`, `rng.shop`, `rng.loot`) para determinismo por seed |
| `events` | ring buffer tipado de eventos para render/ui |
| `run` | máquina de estados da run: `Round → Shop → Round … → BossRound → Death` |

## 7. Convenções de código

- TypeScript 7 `strict`; `noUncheckedIndexedAccess: true`; sem `any` (usar `unknown` + narrowing); tipos de retorno explícitos em funções exportadas.
- Biome 2: `indentStyle: "tab"`, `indentWidth: 4`, `lineWidth: 110`; regras `recommended` + `noFloatingPromises`, `noImportCycles`, `noRestrictedImports` (camadas).
- Sem classes em `game` (funções + TypedArrays); classes permitidas em `render` (wrappers de Babylon) e `platform`.
- Nada alocado no hot path (`simulate`, `sync`): objetos e arrays pré-alocados; `for` indexado; sem closures por frame.
- Toda constante de balanceamento vem de `data/*.json`; nenhum número mágico em sistemas.
- Logs via `core/logger` com níveis; nunca `console.log` direto.

## 8. Segurança e segredos

- Chaves (ElevenLabs) só em `.env` local e secrets do GitHub; nunca no bundle. `tools/audio-generate` roda só no desenvolvedor/CI manual.
- Electron: `contextIsolation: true`, `nodeIntegration: false`, preload com `contextBridge` expondo só `steam.*` e `app.*`.
- Capacitor: `allowNavigation` vazio; sem WebView remoto; assets locais.
- Demo web: limite de rounds no cliente (aceito; nada à venda na web).
