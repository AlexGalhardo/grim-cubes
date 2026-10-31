# Grim Cubes

Roguelite de sobrevivência em ondas, 3D voxel grimdark: um herói, uma arma por vez, rounds infinitos com chefe a cada 10, loja entre rounds, level-up com 3 cartas e uma meta-árvore permanente (o Ossuário). Babylon.js 9, TypeScript 7, React 19, Tailwind 4, bitecs, Bun e Vite 8.

Alvos: Steam (Electron, Windows) e demo web (Vercel) na 1.0; Android (Capacitor) na 1.1.

## Jogar no navegador

A demo pública (rounds 1 a 10, até o Coveiro) abre na Vercel junto com o Next Fest; até lá, o deploy de produção fica protegido. Para jogar localmente no navegador:

```sh
bun install --frozen-lockfile
bun run dev
```

Abra `http://localhost:5173`. Pré-requisito: [Bun](https://bun.sh) 1.4.4.

Controles:

| Ação | Teclado | Gamepad | Toque |
| --- | --- | --- | --- |
| Mover | WASD ou setas | analógico esquerdo ou D-pad | joystick virtual |
| Dash (se comprado no Ossuário) | Espaço ou Shift | A ou RB | botão de dash |
| Pausar | Esc ou P | Start | — |
| Velocidade 1x/2x/3x | Tab | — | botão no HUD |
| Navegar menus | Tab, setas, Enter, Esc | D-pad, A confirma, B volta | toque |

A arma ataca sozinha o inimigo mais próximo. As opções de vídeo, áudio, idioma (pt-BR e en), velocidade e telemetria (desligada por padrão) ficam em Opções, no menu ou no HUD.

## Baixar para Windows

Cada versão publicada em [GitHub Releases](https://github.com/AlexGalhardo/grim-cubes/releases) traz dois arquivos para Windows x64:

- `GrimCubes-Setup-<versão>.exe`: instalador.
- `GrimCubes-<versão>-portable.exe`: executável único, sem instalar.

Os arquivos ainda não são assinados, então o SmartScreen do Windows avisa na primeira execução ("Mais informações" e depois "Executar assim mesmo"). O jogo abre em tela cheia; F11 ou Alt+Enter alternam para janela. Para gerar os dois localmente: `bun run build:electron` (saída em `release/`).

## Comandos

| Comando | Função |
| --- | --- |
| `bun run dev` | servidor de desenvolvimento (web) |
| `bun run build` | `data:check` + `assets:build` + build da demo web |
| `bun run build:electron` | instalador e portable do Windows |
| `bun run typecheck` | type checker (`bun check -b`) |
| `bun run lint` / `bun run lint:md` | Biome e markdownlint |
| `bun run test` | Vitest (unit e integration) |
| `bun run test:e2e` | Playwright nos 4 alvos de tela (fora do CI, só sob pedido; ADR-0024) |
| `bun run test:perf` | bench de performance (`BENCH_GPU=1` em GPU real) |
| `bun run sim` | simulador de balanceamento (`--runs`, `--rounds`, `--check`) |
| `bun run data:check` | valida `data/*.json` contra os schemas |
| `bun run assets:gen` / `bun run assets:build` | modelos placeholder e pipeline `.bbmodel` → glTF, atlas e VAT |
| `bun run audio:generate` | gera áudio pela ElevenLabs (chave em `.env`) |
| `bun run release <patch\|minor\|major\|rc>` | release no padrão do projeto (ADR-0015) |

## Documentação

- [GDD](docs/gdd.md) e [Art Bible](docs/art-bible.md)
- [SDD](docs/sdd/README.md) e [ADRs](docs/adrs/README.md)
- [Roadmap](ROADMAP.md) e [progresso](docs/PROGRESS.md)
- [Changelog](CHANGELOG.md)
- Arte no Blockbench: [docs/blockbench.md](docs/blockbench.md)
- Regras para agentes: [CLAUDE.md](CLAUDE.md) e [prompt-workers.md](prompt-workers.md)

## Licença

Proprietária, todos os direitos reservados. Veja [LICENSE](LICENSE).
