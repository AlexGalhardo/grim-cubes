# ADR-0029 — Arte 3D medium poly gerada por image-to-3D

Status: aceito (decisão do PO); execução na trilha S-18 do `ROADMAP.md`, depois da `v0.6.0`. Data: 2026-11-11.

## Contexto

Até a `v0.6.0` o jogo é voxel: modelos `.bbmodel` feitos no Blockbench, convertidos pelo `assets:build` para glTF de skin rígido, atlas e VAT (ADR-0011, Art Bible §5 a §10). Em 2026-11-11 o PO decidiu trocar a arte do jogo inteiro (personagens, cenário e props) por 3D medium poly, para o jogo parecer produto de estúdio grande em captura e trailer. O PixelLab está sem assinatura e o plugin MCP do Blockbench não respondeu na sessão em que a decisão foi tomada.

Respostas do PO que fecham a decisão:

- Quando: depois da `v0.6.0` (trilha S-17), nunca misturando estilos numa build pública.
- Escopo: tudo. Heróis, inimigos, chefes, NPC, cenário, props, armas, projéteis e pickups.
- Produção: IA image-to-3D a partir das concept arts de `references/concept-arts/`, com limpeza, rig e animação no Blender.
- Estilo: pintado à mão, material simples (albedo com luz e sombra desenhadas, sem PBR pesado, como o ADR-0014 já pede).
- Gore: partículas e decals orgânicos no lugar dos cubos de sangue.
- Horda: o teto de 100 inimigos simultâneos fica no desktop; só o preset Mínimo e o celular podem baixar.
- Voxel: preservado só na branch `voxel-legacy` (commit `355fc20`); sai da `main` ao fim da S-18.
- Ferramentas autorizadas, com versão fixa: AssetFurnace (image-to-3dlab), glTF Transform e KTX-Software (`toktx`).

## Alternativas consideradas

- Manter o voxel e refinar no Blockbench (trilha S-15, cancelada): menor risco de prazo, mas o PO quer outro patamar visual.
- Modelar por script no Blender: custo zero e reprodutível, mas as formas ficam simples demais para o objetivo.
- Packs comprados: rápido e consistente, com custo em dinheiro e identidade visual genérica.
- Artista contratado: melhor qualidade, fora do orçamento e do prazo da demo.
- IA image-to-3D local (escolhida): custo zero por modelo quando roda local, parte das concept arts que o projeto já tem, e a ferramenta grava a licença de cada arquivo.

## Decisão

1. **Ferramenta:** AssetFurnace (`github.com/Bingeljell/image-to-3dlab`, Apache-2.0), versão fixada na instalação. Ela roda local, tem estúdio no navegador, CLI e servidor MCP próprio (`lab mcp`), limpa o modelo para jogo, faz auto-rig de humanoide com presets de animação e grava um `.provenance.json` por execução com a classificação de licença.
2. **Motor 3D:** Pixal3D (código e pesos MIT; encoder DINOv3 com licença própria, que permite uso comercial). O Hunyuan3D fica proibido no projeto: os pesos não são licenciados para a União Europeia, o Reino Unido e a Coreia do Sul, e o jogo é vendido no mundo todo pela Steam. O TRELLIS.2 só entra se a máquina de geração for Linux com NVIDIA.
3. **Imagem de origem:** as concept arts de `references/concept-arts/`, ou imagem nova gerada pelo FLUX.2 klein (Apache-2.0) dentro da própria ferramenta, com o prompt versionado em `prompt-*.md`, como já vale para a UI (Art Bible §13).
4. **Formato no repositório:** `assets/src/models/<categoria>/<nome>.glb`, com o `.provenance.json` ao lado. O `assets:build` ganha um caminho de GLB (S-18-02): malha com skin para herói, chefes e NPC, VAT para a horda, atlas de textura. O `.bbmodel` deixa de ser a fonte (emenda à decisão D5).
5. **Orçamento de triângulos:** herói 3 a 6 mil, inimigo comum 400 a 1.200, elite 1.500 a 2.500, chefe 6 a 12 mil, prop 100 a 800. Textura pintada, um albedo por modelo; mapas de PBR só com justificativa no ADR do modelo.
6. **Ponto de parada:** o herói de prova (S-18-03) roda no jogo antes de qualquer outro modelo, e o PO aprova ou reprova. Reprovado, a `main` continua voxel e esta decisão é revista.
7. **Nada baixa sem o aval do PO:** a instalação da ferramenta e cada download de pesos mostram origem, tamanho e licença antes.

## Consequências

- **Máquina do PO.** RTX 4060 com 8 GB de VRAM, 32 GB de RAM e 25 GB livres no disco C (medido em 2026-11-11). A ferramenta foi testada com 16 a 24 GB de VRAM e tem "teste limitado" no Windows nativo; o MCP dela não foi testado no Windows. A S-18-01 começa por um teste de viabilidade: Pixal3D no Windows, depois no WSL Ubuntu que já existe na máquina. Se não rodar em 8 GB, as saídas são a nuvem da própria ferramenta (paga por modelo) ou uma GPU alugada, e as duas são gasto que só o PO aprova. Os pesos do Pixal3D ocupam 8,4 GB, fora o gerador de imagem.
- **Rig.** O auto-rig cobre humanoides. Sanguessugas, vigias e chefes não humanoides precisam de rig manual pelos scripts de Blender da ferramenta ou de um esqueleto próprio.
- **Animações.** Os clipes obrigatórios do jogo (`REQUIRED_CLIPS` em `tools/assets-build/rules.ts`) precisam ser mapeados para os presets da ferramenta ou animados no Blender.
- **Performance.** A horda continua em VAT. O teto de triângulos por inimigo comum existe para manter 100 inimigos no desktop; o `test:perf` decide.
- **Trabalho perdido e trabalho que fica.** A luz de contorno, a separação de valor e a medição de legibilidade (S-01) continuam valendo. Os modelos voxel, o gerador `assets:gen`, a skill e o agente do Blockbench saem da `main` na S-18-08. Os corpos persistentes da S-11 mantêm o sistema de teto e descarte; o visual em cubos é refeito na S-18-07.
- **Marca.** O nome "Grim Cubes", a key art e os textos falam de cubos. A pergunta sobre manter o nome fica em `todo-later.md` para o PO.
- **Legal.** Modelos 3D de IA entram na declaração de conteúdo gerado por IA da Steam. A licença do DINOv3 proíbe usos militares e de armas reais; isso é sobre o uso do software, mas o PO deve ler o texto antes do lançamento. Cada GLB guarda o `.provenance.json` como prova.
- **Documentos.** Art Bible §1, §5 a §10, §13 e §14 e o GDD §1 são reescritos na S-18. A decisão D5 (`.bbmodel` como fonte) e a regra do Art Bible §13 de que modelo 3D só nasce no Blockbench ficam revogadas a partir da S-18.

## Referências

`ROADMAP.md` S-18; ADR-0011, ADR-0014 e ADR-0027; Art Bible §13; `docs/blockbench.md`; `.claude/skills/medium-poly-art/SKILL.md`; README do AssetFurnace lido em 2026-11-11.
