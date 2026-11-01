# Componentes de terceiros

Grim Cubes é proprietário (ver `LICENSE`). Os componentes abaixo são usados sob suas próprias licenças, que prevalecem sobre a `LICENSE` do projeto para esses componentes.

## Dependências de código

A lista completa e exata (nome, versão, licença) é a de `package.json` e `bun.lock`, exportada como SBOM CycloneDX a cada release (`tools/sbom`, ROADMAP E-04-03). Enquanto `package.json` não existir (antes de E-02-01), não há dependências de código.

## Assets (fontes, áudio, modelos)

Só entram assets com licença compatível registrada aqui (OFL, CC0) ou gerados com plano pago (ElevenLabs, `meta.plan`), conforme `prompt-workers.md` §11.

| Asset | Origem | Licença | Onde é usado |
| --- | --- | --- | --- |
| `assets/src/audio/**` (SFX, músicas e falas) | gerados no ElevenLabs, plano Creator; o `meta.json` de cada arquivo registra prompt e plano | termos do ElevenLabs para planos pagos (uso comercial) | jogo, web e desktop |

## Imagens 2D geradas por IA

Decisão do PO de 2026-10-31 (Art Bible §13, exceção): imagens 2D de UI e marketing podem ser geradas por IA, com o prompt versionado no repositório. Os modelos 3D do jogo continuam só no Blockbench.

| Arquivo | Ferramenta | Prompt | Data | Onde é usado |
| --- | --- | --- | --- | --- |
| `public/menu/menu-1.webp` | gerador de imagens do ChatGPT (OpenAI), operado pelo PO | `prompt-concept-art-menu.md` | 2026-10-31 (entrou em 485df2f) | fundo do menu principal (key art) |
| `public/portraits/hero.webp` | gerador de imagens do ChatGPT (OpenAI), operado pelo PO | `prompt-settings.md` (retratos) | 2026-10-31 (entrou em 34cef5a) | retrato do Carrasco na loja |
| `public/portraits/merchant.webp` | gerador de imagens do ChatGPT (OpenAI), operado pelo PO | `prompt-settings.md` (retratos) | 2026-10-31 (entrou em 34cef5a) | retrato do Mercador de Ossos na loja |
| `references/concept-arts/*.png` (fora do git) | gerador de imagens do ChatGPT (OpenAI), operado pelo PO | `prompt-concept-art-menus.md`, `prompt-settings.md` | 2026-10-31 | só referência de UI para implementar as telas; não são distribuídos |

Termos de uso da OpenAI sobre o output: fonte oficial em <https://openai.com/policies/terms-of-use/>. **Pendente de confirmação:** a página oficial não pôde ser lida pelas ferramentas dos agentes (HTTP 403) em 2026-10-31, então o resumo da cláusula de titularidade do output e a data de vigência ainda não foram transcritos daqui. O PO (ou quem abrir a página no navegador) deve copiar a seção sobre conteúdo (input e output) com a data "Effective" e registrar aqui antes do lançamento (R-01-05). O conteúdo gerado por IA também é declarado no questionário de conteúdo da Steam (`docs/release/steam-launch-checklist.md`).
