# Grim Cubes

Roguelite de sobrevivência em ondas, 3D voxel grimdark. Babylon.js 9, TypeScript 7, React 19, Tailwind 4, bitecs, Bun e Vite 8.

Alvos: Steam (Electron, Windows 11) e demo web (Vercel) na 1.0; Android (Capacitor) na 1.1.

## Como rodar

Pré-requisito: [Bun](https://bun.sh).

```sh
bun install --frozen-lockfile
bun run dev
```

Os scripts (`dev`, `build`, `typecheck`, `lint`, `test` e demais) só passam a existir com a tarefa E-02-01; até lá, só os arquivos de convenção estão no repositório. A lista completa de comandos está em [CLAUDE.md](CLAUDE.md).

## Baixar para Windows

Cada versão publicada em [GitHub Releases](https://github.com/AlexGalhardo/grim-cubes/releases) traz dois arquivos para Windows x64: `GrimCubes-Setup-<versão>.exe` (instalador) e `GrimCubes-<versão>-portable.exe` (executável único, sem instalar). Os arquivos não são assinados, então o SmartScreen do Windows avisa na primeira execução ("Mais informações" e depois "Executar assim mesmo"). O jogo abre em tela cheia; F11 ou Alt+Enter alternam para janela.

Para gerar os dois localmente: `bun run build:electron` (saída em `release/`).

## Documentação

- [GDD](docs/gdd.md) e [Art Bible](docs/art-bible.md)
- [SDD](docs/sdd/README.md) e [ADRs](docs/adrs/README.md)
- [Roadmap](ROADMAP.md) e [progresso](docs/PROGRESS.md)
- [Changelog](CHANGELOG.md)

## Licença

Proprietária, todos os direitos reservados. Veja [LICENSE](LICENSE).
