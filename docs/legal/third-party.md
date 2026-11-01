# Componentes de terceiros

Grim Cubes é proprietário (ver `LICENSE`). Os componentes abaixo são usados sob suas próprias licenças, que prevalecem sobre a `LICENSE` do projeto para esses componentes.

## Dependências de código

A lista completa e exata (nome, versão, licença) é a de `package.json` e `bun.lock`, exportada como SBOM CycloneDX a cada release (`tools/sbom`, ROADMAP E-04-03). Enquanto `package.json` não existir (antes de E-02-01), não há dependências de código.

## Assets (fontes, áudio, modelos)

Só entram assets com licença compatível registrada aqui (OFL, CC0) ou gerados com plano pago (ElevenLabs, `meta.plan`), conforme `prompt-workers.md` §11.

| Asset | Origem | Licença | Onde é usado |
| --- | --- | --- | --- |
| Pixelify Sans (latin, latin-ext, `public/fonts/pixelify-sans-*.woff2`) | Google Fonts, projeto eifetx/Pixelify-Sans, v3 | SIL OFL 1.1 (`public/fonts/OFL-Pixelify-Sans.txt`) | Fonte de títulos e números da UI (`--font-display`) |
| Inter (latin, latin-ext, `public/fonts/inter-*.woff2`) | Google Fonts, projeto rsms/inter, v20 | SIL OFL 1.1 (`public/fonts/OFL-Inter.txt`) | Fonte de texto da UI (`--font-body`) |

As fontes são arquivos `.woff2` do repositório (subsets latin e latin-ext baixados do Google Fonts, sem alteração), carregados por `@font-face` com `font-display: swap` em `packages/ui/src/theme.css`; as duas latin têm `preload` em `apps/web/index.html`. A OFL permite embarcar e redistribuir junto com o jogo, desde que o texto da licença e o aviso de copyright acompanhem os arquivos (por isso os `OFL-*.txt`).
