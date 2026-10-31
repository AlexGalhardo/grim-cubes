# Grim Cubes — Art Bible

Versão 0.1.0 — 2026-10-31. Decisões de origem: `docs/brainstorming.md` (D22 escala, D23 gore, D17 câmera). Pesquisa: `docs/web-search.md` §4.

Este documento define como o Grim Cubes deve parecer, soar e ser produzido. Toda regra marcada como **obrigatória** bloqueia a aprovação de um asset; regras marcadas como **guia** admitem exceção justificada no PR.

## Sumário

1. [Pilares visuais](#1-pilares-visuais)
2. [Referências e o que pegar de cada](#2-referências-e-o-que-pegar-de-cada)
3. [Paleta](#3-paleta)
4. [Iluminação e pós-processo](#4-iluminação-e-pós-processo)
5. [Escala, grid e proporções](#5-escala-grid-e-proporções)
6. [Regras de modelagem no Blockbench](#6-regras-de-modelagem-no-blockbench)
7. [Texturização](#7-texturização)
8. [Animação](#8-animação)
9. [VFX e gore](#9-vfx-e-gore)
10. [Pipeline de assets e nomenclatura](#10-pipeline-de-assets-e-nomenclatura)
11. [UI e HUD](#11-ui-e-hud)
12. [Direção de áudio](#12-direção-de-áudio)
13. [O que evitar](#13-o-que-evitar)
14. [Checklist de aprovação de asset](#14-checklist-de-aprovação-de-asset)

## 1. Pilares visuais

| # | Pilar | Significado | Como verificar |
| --- | --- | --- | --- |
| V1 | Cubos sérios | Geometria 100% cúbica (Minecraft/Hytale), mas proporções, cor e luz dizem "guerra", não "brinquedo" | Teste do thumbnail: em 128 px, o inimigo parece ameaça ou mascote? |
| V2 | Leitura em 1 segundo | Herói, inimigos, elites, chefes e fragmentos distinguem-se por silhueta e cor mesmo com 100 na tela | Captura com 100 inimigos: cada classe identificável em escala de cinza |
| V3 | Luz dura, sombra colorida | Uma luz direcional forte, sombras azul-roxas, acentos quentes (brasa, sangue) | Nenhum asset usa cinza neutro em sombra |
| V4 | Sujo e gasto | Ferro enferrujado, osso amarelado, lodo, fuligem; nada novo ou polido | Cada textura tem ao menos 1 zona de desgaste |
| V5 | Barato de renderizar | Unlit/flat shading, atlas único por categoria, poucos elementos por modelo | Orçamentos de §5.4 e §6.3 |

## 2. Referências e o que pegar de cada

| Referência | Pegar | Não pegar |
| --- | --- | --- |
| Minecraft | escala 1 cubo = 1 m, AO por vértice, legibilidade de blocos | paleta clara e saturada, tom pacífico |
| Hytale (guia de modelos 2025) | só cubos e quads, 64 px/u personagens, sombras coloridas, sem PBR, "simplicity is key" | fantasia colorida, proporção fofa |
| Roblox | proporção robusta de corpo (blocky), economia de polígonos | estética plástica |
| DOOM: The Dark Ages | "stand and fight", execuções, demônios como exército, medieval-tech | nomes, designs específicos de demônios, HUD |
| Warhammer 40k | grimdark, maquinaria gótica, caveiras como ornamento, metal + vermelho + ouro velho | aquilas, Space Marines, qualquer símbolo ou nome de facção |
| Alien | biomecânica, escuridão com luz dura, "haunted house" | silhueta do xenomorfo |
| Predator | selva, calor, visão térmica, troféus de caça | máscara/dreadlocks do Predator |
| Dead Cells | luz quente no herói vs sombra fria, saturação controlada para leitura | pixel art 2D |
| Darktide | blockout de silhueta antes do detalhe | — |
| Voxel Doom | fidelidade 1 pixel = 1 voxel para inimigos icônicos | — |

## 3. Paleta

Nenhuma fonte pública forneceu hex das referências; esta paleta é **proposta própria** e será validada com os primeiros 10 assets no PROTÓTIPO. Regras obrigatórias: sem `#FFFFFF` e sem `#000000` em texturas (Hytale); sombras sempre com matiz (azul/roxo), nunca cinza dessaturado.

### 3.1 Núcleo (todo o jogo)

| Nome | Hex | Uso |
| --- | --- | --- |
| Osso | `#D9C9A3` | ossos, dentes, lápides claras, texto secundário |
| Osso sombra | `#8C7A5B` | sombra de osso |
| Ferro | `#5A5F66` | armaduras, armas, estruturas |
| Ferro escuro | `#2E3136` | sombra de metal |
| Ferro negro | `#2B2A33` | metal enegrecido, tint da skin do round 50 (token `iron-black`) |
| Ferrugem | `#8A4A2B` | desgaste de metal, acentos |
| Sangue | `#5E0E14` | sangue (base) — quase vinho, nunca vermelho vivo |
| Sangue claro | `#8E1A1F` | destaques de sangue, raridade Lendária |
| Brasa | `#E07A2A` | fogo, forja, explosões, acento quente principal |
| Brasa clara | `#F5B04A` | núcleo de fogo, críticos |
| Noite | `#14121C` | céu/fog, fundo de UI |
| Sombra fria | `#2B2340` | sombras projetadas, AO |
| Névoa | `#3F3A52` | fog distante |
| Lama | `#4A3B2A` | lama e terra molhada (token `mud`) |

Rampas derivadas (usadas pelos modelos gerados e pelo refino no Blockbench): para cada token, claro = mix(token, `bone`, 0,22) e escuro = mix(token, `shadow`, 0,40). Essas cores contam como paleta oficial; o limite de 12 cores por textura continua valendo.

### 3.2 Biomas (chão e props dominantes)

| Bioma | Chão | Chão sombra | Acento 1 | Acento 2 |
| --- | --- | --- | --- | --- |
| Cemitério Afundado | `#4A4A45` | `#2F2E33` | Osso `#D9C9A3` | Verde-cova `#3E5A3A` |
| Pântano de Ossos | `#2F4A33` | `#1C2E24` | Lodo `#6B8F3A` | Osso `#D9C9A3` |
| Forja Infernal | `#2A2524` | `#1A1515` | Brasa `#E07A2A` | Ferrugem `#8A4A2B` |
| Ninho Biomecânico | `#2A1F2A` | `#17111A` | Carne `#6E2F3F` | Ferro `#5A5F66` |

Cor do fog por bioma (`fogColor` em `data/biomes.json`): Cemitério Afundado `#14121C` (Noite), Pântano de Ossos `#1A2420`, Forja Infernal `#241614`, Ninho Biomecânico `#161C26`.

### 3.3 Semântica de gameplay (obrigatória)

| Significado | Cor | Daltônico (toggle) |
| --- | --- | --- |
| Herói (acento) | Brasa clara `#F5B04A` no capuz/arma | igual |
| Inimigo comum | cores do bioma, dessaturadas | igual |
| Elite (aura) | ver GDD §11: aço `#9AA3AD`, âmbar `#E0A030`, vinho `#8E1A1F`, laranja `#E07A2A` | formas da aura diferem (anel, picos, pulso, faíscas) |
| Chefe | sempre com 1 acento Brasa clara + escala | igual |
| Fragmento (XP+ouro) | Brasa clara `#F5B04A`, emissivo | igual |
| Cura / consumível | Verde-cova claro `#7FBF6A` | azul `#5A9BD5` |
| Raridade Comum | Osso `#D9C9A3` | igual |
| Raridade Incomum | Lodo `#6B8F3A` | azul `#5A9BD5` |
| Raridade Rara | Azul-frio `#4C7FB8` | laranja `#E07A2A` |
| Raridade Lendária | Sangue claro `#8E1A1F` | magenta `#C04A9E` |
| Dano recebido (UI) | Sangue claro | igual + ícone |
| Perigo telegrafado (chão) | Sangue claro a 60% de opacidade | igual + hachura |

## 4. Iluminação e pós-processo

Obrigatório (orçamento mobile):

- 1 `DirectionalLight` (sol morto): direção fixa (−0,5, −1, −0,3), cor `#C9B8A8` (quente-neutra), intensidade 1,1.
- 1 `HemisphericLight`: céu `#3F3A52`, chão `#2B2340`, intensidade 0,45 (sombra colorida).
- Materiais: `StandardMaterial` sem specular (`specularColor = black`) ou unlit para VFX. **Sem PBR** (Hytale). Sampling `NEAREST` em todas as texturas.
- Sombras: herói, chefes e elites com `ShadowGenerator` de 1 cascata (1024 px, PCF) no desktop; em mobile, **blob shadows** (quad escuro no chão). Inimigos comuns: blob shadow sempre.
- AO: pintada na textura (cantos e bases) + `vertexColor` escurecido nas bases dos props. Sem SSAO.
- Fog: `FOGMODE_LINEAR` de 28 u a 60 u, cor Noite `#14121C`. Mantém a câmera sempre com fundo escuro.
- Pós-processo (desktop, toggle): vinheta (peso 0,35), bloom leve só em emissivos (threshold 0,8, weight 0,15), grain 0,05. Mobile: só vinheta.
- Luzes pontuais: no máximo 4 ativas (brasas de forja, explosões), com fade de 0,3 s. Projéteis não emitem luz; são emissivos.

## 5. Escala, grid e proporções

Decisão D22: 1 unidade = 1 m = 1 cubo de terreno. Personagens 64 px por unidade; props e terreno 32 px por unidade (Hytale).

### 5.1 Tabela de escala

| Entidade | Altura (u) | Largura (u) | px/u | Elementos (máx.) |
| --- | --- | --- | --- | --- |
| Herói (Carrasco) | 1,9 | 0,9 | 64 | 24 |
| Inimigo pequeno (Lamento, Sanguessuga) | 0,8–1,0 | 0,6 | 64 | 10 |
| Inimigo médio (Carcaça, Afogado, Caçador) | 1,6–1,9 | 0,8–1,0 | 64 | 16 |
| Inimigo grande (Forjado, Reprodutor) | 2,2–2,6 | 1,4 | 64 | 20 |
| Elite | tipo base × 1,6 (escala, mesmo modelo) | — | — | — |
| Chefe | 4–6 | 3–4 | 64 | 48 |
| Prop pequeno (osso, urna) | 0,3–0,8 | — | 32 | 4 |
| Prop médio (lápide, bigorna) | 1–1,5 | — | 32 | 8 |
| Prop grande (árvore morta, ossada) | 2,5–4 | — | 32 | 16 |
| Mercador de Ossos | 2,3 | 1,0 | 64 | 28 |
| Arma (na mão) | 0,6–1,4 | — | 64 | 8 |
| Tile de chão (cubo 1×1 u) | — | 1,0 | 32 | 8 |
| Fragmento | 0,25 | 0,25 | 32 | 1 (emissivo) |
| Projétil | 0,15–0,3 | — | — | 1 (emissivo) |

### 5.2 Proporções do herói (Hytale-like, robusto)

Cabeça 8×8×8 px (a 64 px/u = 0,5 u); tronco 10×12×6; braços 4×12×4; pernas 4×12×4; ombreiras +2 px por lado. Cabeça grande e tronco largo: lê como força, não como fofura (regra Blockbench: tronco e braços grandes = força).

### 5.3 Proporções de inimigos

- Silhuetas distintas por classe: Carcaça (humanoide curvado), Lamento (cabeça grande, corpo fino), Afogado (largo e baixo), Sanguessuga (cilindro segmentado), Forjado (ombros enormes), Vigia (torre com olho), Caçador (quadrúpede longo), Reprodutor (saco inchado com pernas curtas).
- Teste obrigatório: os 8 em preto sólido, lado a lado, em 64 px de altura; cada um deve ser identificável.

### 5.4 Orçamento de renderização

| Item | Desktop alvo (60 fps) | Android alvo (30 fps) |
| --- | --- | --- |
| Inimigos simultâneos | 100 | 60 (cap configurável) |
| Draw calls por frame | ≤ 120 | ≤ 70 |
| Triângulos por frame | ≤ 400 k | ≤ 150 k |
| Texturas | 1 atlas 2048² personagens + 1 atlas 2048² props/terreno + 1 atlas 1024² VFX/UI | mesmos, com KTX2 ETC1S |
| Decals de sangue | 200 (FIFO) | 60 |
| Partículas vivas | 600 | 200 |
| Luzes pontuais | 4 | 1 |

## 6. Regras de modelagem no Blockbench

Formato de projeto: **Generic Model** (`.bbmodel`), não Bedrock/Java (sem limitações de rotação). Blockbench 5.x.

Obrigatório:

- Só cubos e quads (planos de 2 faces). Sem triângulos, esferas, cilindros ou meshes livres (Hytale).
- Rotações de elemento em múltiplos de 22,5° (legibilidade cúbica); exceção: cabos de armas e cabelos em 45°.
- Nenhum elemento com dimensão 0 em dois eixos (linhas) ou menor que 1 px.
- Origem do modelo no centro da base (pé no chão, y = 0); frente em +Z (Blockbench "north" = −Z, então marcar explicitamente a frente).
- Hierarquia de grupos nomeada para animação: `root > body > head`, `root > body > arm_l`, `arm_r`, `root > leg_l`, `leg_r`, `root > body > weapon_socket`.
- Cada modelo tem `weapon_socket` (herói, Mercador) ou `hit_socket` (inimigos: ponto de spawn de sangue e números).
- Contagem de elementos dentro do orçamento de §5.1.
- Uma textura por modelo (atlasada no build), tamanho múltiplo de 32 px, mesmo tamanho em todas as texturas do modelo.

Guia:

- Comece pela silhueta em blocos grandes (blockout), valide em preto sólido, só então detalhe.
- Detalhe por textura antes de detalhe por geometria: cicatriz é pixel, não cubo.
- Assimetria sutil (uma ombreira maior, um chifre quebrado) dá identidade a baixo custo.
- Elementos "inflados" (`inflate`) de 0,25 px para roupas e armaduras sobre o corpo, evitando z-fighting.

## 7. Texturização

Obrigatório:

- Pixel art limpa: sem antialias, sem gradiente suave, sem "pillow shading", sem ruído aleatório (guia de estilo da Blockbench).
- Paleta por asset: no máximo 12 cores, todas derivadas de §3 (rampas de 3 a 4 tons com mudança de matiz: sombra mais azul/roxa, luz mais quente).
- Sem branco puro nem preto puro.
- AO pintada: 1 px escuro nas bases, cantos internos e sob ombreiras.
- Luz pintada do topo (consistente com a luz direcional de §4).
- Desgaste obrigatório: ferrugem em arestas de metal, lascas em osso, fuligem em pedra.
- Emissivos (olhos de elite, brasas, fragmentos, projéteis) em textura separada `_e.png` com fundo preto; o build gera `emissiveTexture`.

Guia:

- Dithering só em transições grandes (chão), nunca em personagens.
- Texturas de chão em 32 px por cubo, com 4 variantes por bioma para quebrar repetição (sorteadas por hash do chunk).

## 8. Animação

- Feitas no Blockbench (keyframes), exportadas em glTF com o modelo.
- Taxa: 12 fps para inimigos comuns (look "stop-motion" cúbico), 24 fps para herói e chefes.
- Clipes obrigatórios por classe:

| Classe | Clipes |
| --- | --- |
| Herói | idle, run, attack_melee, attack_ranged (pose), hit, dash, death, victory (fim de round) |
| Inimigo comum | idle, walk, attack, hit, death (o death é interrompido pelo desmembramento após 0,2 s) |
| Elite | mesmos do tipo base (escala e aura em runtime) |
| Chefe | idle, walk, 3 ataques, enrage, phase_change, death_execution |
| Mercador | emerge, idle, talk, hand_over, submerge |

- Inimigos comuns rodam via **Baked Vertex Animation** (VAT) com thin instances: o build gera a textura de animação a partir do glTF (`bun run bake:vat`). Sem blend entre clipes; cortes secos são aceitáveis no look cúbico.
- Herói, Mercador e chefes usam skeleton normal (`AnimationGroup`) com blend de 0,1 s.
- Movimento: pés não deslizam (velocidade da animação de `walk` escala com a velocidade real).

## 9. VFX e gore

Decisão D23: gore alto estilizado, toggle para reduzir.

- Sangue: partículas cúbicas (cubos de 0,08–0,15 u, cor Sangue `#5E0E14` com 20% em Sangue claro), 3–6 por hit, 8–14 por morte; gravidade simples; viram decal ao tocar o chão (quad 0,6–1,2 u, textura de respingo pixel art, 6 variantes).
- Desmembramento: ao morrer, o modelo é substituído por 4–8 "pedaços" (cubos pré-definidos por classe, mesmo atlas) com velocidade radial e rotação, vida 0,8 s, fade sem colisão.
- Execução de chefe: câmera aproxima, 1,5 s, chefe se parte em 12–20 pedaços grandes, flash Brasa clara.
- Toggle de gore reduzido: sem decals, sem desmembramento (morte = fade + 4 cubos cinza), sangue em cor Ferro escuro.
- Fogo/explosão: 2 sprites pixel art animados (8 frames) em billboard + 6–10 cubos Brasa; sem luz em mobile.
- Auras de elite: anel de quads emissivos no chão + partículas lentas; forma varia por modificador (§3.3).
- Telegrafia de ataques de chefe: decal no chão (Sangue claro, 60%), cresce durante o wind-up.
- Números de dano: sprites de dígitos pixel (fonte §11) em billboard, renderizados pela engine, 0,6 s de vida.

## 10. Pipeline de assets e nomenclatura

### 10.1 Fluxo

1. Modelar/texturizar/animar no Blockbench → salvar `assets/src/<categoria>/<nome>.bbmodel` (fonte, versionado).
2. `bun run assets:build` converte `.bbmodel` → glTF (skin rígido: cada grupo animado vira osso com peso 1, P-06-07); não há export manual de glTF (D5, 2026-10-31). Os `.bbmodel` dos placeholders são gerados por script (`tools/assets-gen`); o refino é feito no Blockbench, à mão ou pelo agente Art via MCP (`docs/blockbench.md`), e o modelo refinado entra em `assets/src/models/authored.json` para o gerador não sobrescrevê-lo.
3. `bun run assets:build`:
   - valida orçamento (elementos, tamanho de textura, nomes de grupos/sockets) e falha o build se violar;
   - empacota texturas em atlas por categoria e reescreve UVs;
   - gera VAT para inimigos comuns;
   - converte texturas para KTX2 (ETC1S) para mobile, mantendo PNG para desktop/web;
   - escreve `public/assets/<categoria>/<nome>.glb` + `manifest.json` (hash, tamanho, versão).
4. O jogo carrega pelo manifest; nunca referencia arquivo por caminho fixo.

### 10.2 Nomenclatura (obrigatória)

- Arquivos: `snake_case`, ASCII, sem espaços: `enemy_husk.bbmodel`, `boss_gravedigger.glb`, `prop_tombstone_01.bbmodel`, `vfx_blood_splat_03.png`, `sfx_sword_hit_02.mp3`, `mus_biome_swamp.mp3`, `vo_merchant_greet_01.mp3`.
- Prefixos: `hero_`, `enemy_`, `elite_` (só materiais/auras), `boss_`, `npc_`, `prop_`, `tile_`, `weapon_`, `item_` (ícones), `vfx_`, `ui_`, `sfx_`, `mus_`, `vo_`.
- Variantes numéricas com 2 dígitos: `_01`.
- Texturas: mesmo nome do modelo + sufixo `_d` (difusa) e `_e` (emissiva).
- Grupos/bones em inglês `snake_case` conforme §6.
- IDs em `data/*.json` iguais ao nome do arquivo sem prefixo de categoria e sem extensão (`husk`, `gravedigger`).

### 10.3 Metadados de áudio gerado

Cada arquivo gerado pela ElevenLabs tem um sidecar `<nome>.meta.json`: `{ prompt, model, durationSeconds, generatedAt, plan, promptInfluence }`. Obrigatório para rastrear licença (plano pago) e regenerar.

## 11. UI e HUD

- Fontes: títulos e números em fonte pixel OFL (candidata: "Press Start 2P" ou "Pixelify Sans", Google Fonts, licença OFL; decisão em ADR); corpo em "Inter" (OFL) 14–16 px. Texto sempre com sombra 1 px Noite.
- Painéis: placas de ferro `#5A5F66` com borda Ferro escuro de 2 px e 4 rebites nos cantos; sem cantos arredondados; fundo Noite a 85%.
- Botões: mesmo painel, hover com borda Brasa; pressionado com deslocamento de 1 px.
- Ícones de itens: 32×32 px pixel art, fundo por raridade (§3.3), 1 objeto por ícone, silhueta clara.
- HUD: barras com 2 px de borda, preenchimento com 2 tons (base + luz no topo), números sempre visíveis.
- Cartas de level-up: 3 painéis 220×300 px (escala UI 100%), ícone grande, título, valor; hover eleva 4 px.
- Ossuário: ramos radiais em torno de um crânio central; nós como ossos gravados; comprado = runa acesa em Brasa.
- Mobile: alvos de toque ≥ 48 px; joystick virtual flutuante; HUD afastado 24 px das bordas (notches).
- Tailwind v4: paleta de §3 registrada em `@theme` (`--color-bone`, `--color-iron`, `--color-blood`…); nenhuma cor hardcoded em componentes.

## 12. Direção de áudio

- Tom: metal pesado e coral grave, percussão de tambor de guerra, sem sintetizadores alegres. Referência de mood: trilhas de DOOM moderno e cantos gregorianos distorcidos (não copiar melodias).
- SFX: impactos secos e graves, "crunch" de osso em mortes, metal em armaduras; sem sons "cartoon" (pops, molas).
- Prompts para ElevenLabs Sound Effects seguem o template: `"<objeto/ação>, <material>, <tom: heavy/dry/wet>, <distância>, no music, game sound effect, 16-bit pixel aesthetic not required"`; duração 0,3–1,2 s para hits, 1,5–3 s para mortes de chefe; `prompt_influence` 0,5.
- Música: loops de 2–3 min por bioma com stem de intensidade; BPM 120–140 no combate, 70–80 no menu.
- Voz: Mercador grave e rouco, humor seco; chefes com efeitos (reverb de caverna, pitch −2 a −4 semitons aplicados no build, não na API).
- Mix: SFX de hit do herói sempre acima da música (sidechain simples: música −3 dB por 0,2 s).

## 13. O que evitar

Obrigatório (IP, tom e legibilidade):

- Nenhum nome, símbolo, silhueta ou texto de Warhammer 40k (aquila, Space Marine, Chaos star, Imperium), DOOM (Doom Slayer, Cacodemon, Cyberdemon, logotipos), Alien (xenomorfo, Weyland), Predator (máscara, dreadlocks, tri-laser). Inspiração é de mood e paleta, não de design.
- Nenhum asset, textura ou som de Minecraft, Hytale ou Roblox; nenhum personagem parecido com Steve ou com avatares Roblox.
- Sem humor cartunesco: sem olhos arregalados, sem línguas de fora, sem sangue vermelho vivo, sem sons de mola.
- Sem vermelho saturado (`#FF0000`-like) em lugar nenhum; sangue é vinho escuro.
- Sem branco e preto puros em texturas.
- Sem gradientes suaves, antialias ou texturas fotográficas.
- Sem props altos num raio de 3 u do spawn do herói (bloqueiam a câmera).
- Sem elementos com mais de 48 cubos num único modelo (exceto chefes).
- Sem luz pontual em projéteis ou partículas.
- Sem fontes com licença restritiva; só OFL/CC0.
- Sem assets gerados por IA de imagem sem passar pelo pipeline Blockbench (consistência e licença).

## 14. Checklist de aprovação de asset

Todo PR de asset deve marcar:

- [ ] Nome de arquivo segue §10.2.
- [ ] Modelo só com cubos/quads; rotações em múltiplos de 22,5°.
- [ ] Contagem de elementos dentro do orçamento de §5.1.
- [ ] Textura múltipla de 32 px, ≤ 12 cores, sem `#FFFFFF`/`#000000`, com desgaste e AO pintada.
- [ ] Sombra com matiz (azul/roxo), luz do topo.
- [ ] Silhueta aprovada em preto sólido a 64 px.
- [ ] Grupos/sockets nomeados conforme §6.
- [ ] Clipes obrigatórios de §8 presentes e sem deslize de pés.
- [ ] Emissivos em `_e.png` separado.
- [ ] `bun run assets:build` passa sem erro.
- [ ] Captura in-game com câmera padrão anexada ao PR (desktop e, se houver, mobile).
- [ ] Áudio: `meta.json` presente com plano pago.

## 15. Suposições

- A paleta de §3 é proposta própria; nenhuma referência pública forneceu hex. Validação com os 10 primeiros assets do PROTÓTIPO.
- Fonte pixel candidata ("Press Start 2P" ou "Pixelify Sans") decidida em ADR após teste de legibilidade em 1080p e em 6" Android.
- Blob shadows para inimigos comuns em todas as plataformas; sombras reais só para herói, elites e chefes no desktop.
- Formato de projeto Blockbench "Generic Model"; exportação glTF manual até existir CLI validada.
- Taxa de 12 fps para inimigos comuns é escolha estética; pode subir para 24 se o VAT couber no orçamento de memória.

## 16. Design system

Decisão D33. Este é o sistema de design da UI (React + Tailwind v4). Os tokens abaixo são a fonte única: registrados em `packages/ui/src/theme.css` via `@theme` e consumidos só por classes utilitárias; nenhuma cor, tamanho ou duração hardcoded em componentes.

### 16.1 Tokens de cor

| Token Tailwind | Hex | Uso |
| --- | --- | --- |
| `--color-night` | `#14121C` | fundo de telas, overlay (85%) |
| `--color-night-2` | `#1C1926` | fundo de painéis |
| `--color-shadow` | `#2B2340` | bordas internas, sombras |
| `--color-mist` | `#3F3A52` | divisores, texto desabilitado |
| `--color-iron` | `#5A5F66` | painéis, botões |
| `--color-iron-dark` | `#2E3136` | bordas de painel |
| `--color-iron-light` | `#8A9099` | hover de ferro, ícones secundários |
| `--color-rust` | `#8A4A2B` | desgaste, bordas de alerta |
| `--color-bone` | `#D9C9A3` | texto principal, raridade Comum |
| `--color-bone-dark` | `#8C7A5B` | texto secundário |
| `--color-blood` | `#5E0E14` | fundo de barra de HP, dano |
| `--color-blood-light` | `#8E1A1F` | raridade Lendária, erro, HP baixo |
| `--color-ember` | `#E07A2A` | foco, hover principal, CTA |
| `--color-ember-light` | `#F5B04A` | ouro/XP/almas, crítico, selo "DEMO" |
| `--color-sludge` | `#6B8F3A` | raridade Incomum, cura |
| `--color-cold` | `#4C7FB8` | raridade Rara, informação |
| `--color-cb-blue` | `#5A9BD5` | daltônico: Incomum/cura |
| `--color-cb-orange` | `#E07A2A` | daltônico: Raro |
| `--color-cb-magenta` | `#C04A9E` | daltônico: Lendário |

Modo daltônico: `data-theme="cb"` no `<html>` troca as variáveis semânticas de raridade e cura (`--color-rarity-2/3/4`, `--color-heal`) pelas `cb-*`. Componentes usam só tokens semânticos (`--color-rarity-*`, `--color-heal`, `--color-danger`, `--color-currency`).

### 16.2 Tipografia

| Token | Fonte | Tamanhos (px) | Uso |
| --- | --- | --- | --- |
| `--font-display` | fonte pixel OFL (ADR-0013) | 8, 16, 24, 32, 48 (múltiplos inteiros) | títulos, números do HUD, nome de chefe, round |
| `--font-body` | Inter (OFL) | 13, 14, 16, 18 | descrições, tooltips, opções |
| `--font-mono` | fonte pixel | 8, 16 | seed, versão, debug |

Regras: `line-height` 1,25 no display e 1,45 no body; sombra de texto `1px 1px 0 var(--color-night)` em todo texto sobre o jogo; `letter-spacing` 0 (fontes pixel quebram com tracking); nunca itálico; caixa alta só em títulos de tela e nome de chefe.

### 16.3 Espaçamento, bordas, raio, elevação

- Escala de espaçamento: 4, 8, 12, 16, 24, 32, 48, 64 px. Base 4 px (grid de pixel).
- Raio: **0** em tudo (`rounded-none`). Sem cantos arredondados.
- Bordas: 2 px sólidas; painel `iron-dark`; foco `ember`; erro `blood-light`.
- Elevação: sem sombras suaves. "Elevação" = borda inferior/direita de 2 px em `night` (efeito de placa) + deslocamento de 1 px no pressionado.
- Rebites: pseudo-elementos de 4 px `iron-light` nos 4 cantos de painéis grandes (classe `panel-riveted`).
- Z-index: `--z-hud` 10, `--z-overlay` 20 (loja, level-up), `--z-modal` 30 (pausa, confirmação), `--z-toast` 40, `--z-debug` 50.

### 16.4 Breakpoints (os 4 alvos de D31)

| Token | Condição | Alvo |
| --- | --- | --- |
| `mobile-s` | `max-width: 820px` | 800 × 360 |
| `mobile-l` | `821px–1023px` | 896 × 414 |
| `desktop` | `1024px–2047px` | 1920 × 1080 |
| `desktop-xl` | `≥ 2048px` | 2560 × 1440 (escala de UI 125% automática) |

Tailwind: `--breakpoint-mobile-l: 821px; --breakpoint-desktop: 1024px; --breakpoint-desktop-xl: 2048px`. O layout de referência é 1080p.

### 16.5 Componentes

| Componente | Anatomia | Estados | Tamanhos |
| --- | --- | --- | --- |
| `Panel` | fundo `night-2` 85%, borda 2 px `iron-dark`, rebites opcionais, título display 16 px com linha `rust` | — | padding 16 (desktop) / 12 (mobile) |
| `Button` | fundo `iron`, texto `bone` display 16, borda 2 px `iron-dark` | default, hover (borda `ember`, texto `ember-light`), active (translate 1 px), focus (outline 2 px `ember` offset 2), disabled (`mist`, 50%) | sm 32 px, md 40, lg 48 (mobile mínimo 48) |
| `IconButton` | 40×40 (48 mobile), ícone 24 px | idem | — |
| `Bar` (HP/XP/chefe) | trilho `night`, preenchimento 2 tons (base + luz 2 px no topo), número centralizado display 16 | normal, baixo (< 25%: pulso 0,8 s), cheio | alto 20 px (HUD), 28 px (chefe) |
| `StatList` | linhas `label … valor`, delta colorido (`sludge` +, `blood-light` −) | — | body 14 |
| `ItemCard` | ícone 32 px em moldura de raridade, nome display 16, efeito body 14, preço com ícone de fragmento | default, hover (eleva 4 px), locked (cadeado `ember-light`), unaffordable (preço `blood-light`, 60%), selected | 220 × 300 (desktop), 180 × 240 (mobile) |
| `LevelUpCard` | igual a `ItemCard` sem preço; tecla 1/2/3 no canto | — | — |
| `Modal` | `Panel` centralizado sobre overlay `night` 70%, título, corpo, 2 botões | — | max-width 560 (desktop), 90vw (mobile) |
| `Tooltip` | `Panel` pequeno, body 14, seta cúbica 8 px | aparece em 150 ms (desktop), toque longo (mobile) | max-width 280 |
| `Toast` | barra topo-centro, display 16, ícone | entra 150 ms, fica 2 s, sai 150 ms | — |
| `Tab` | texto display 16, sublinhado 2 px `ember` no ativo | — | — |
| `Toggle` | trilho 40×20, cubo 16×16 `bone` → `ember-light` | on/off/disabled | — |
| `Slider` | trilho 2 px `iron-dark`, cubo 16×16, valor numérico à direita | — | — |
| `Keycap` | 24×24, borda 2 px, display 8 | — | — |
| `CurrencyBadge` | ícone 16 + número display 16 `ember-light` | contagem animada (300 ms, `steps(8)`) | — |
| `RarityFrame` | moldura 2 px na cor de raridade + canto superior esquerdo chanfrado 4 px | — | — |
| `VirtualJoystick` (mobile) | base 96 px `iron` 50%, knob 40 px `bone` | flutuante no toque | — |
| `BossBar` | `Bar` 28 px + nome display 24 + marcadores de fase | enrage: borda `blood-light` pulsa | largura 60% (desktop), 70% (mobile) |

Ícones: pixel art 16/24/32 px, 1 cor + sombra, em sprite sheet `ui_icons.png`; nomes `icon_<nome>`. Nunca ícones vetoriais suavizados.

### 16.6 Motion

| Token | Valor | Uso |
| --- | --- | --- |
| `--duration-fast` | 100 ms | hover, foco |
| `--duration-base` | 150 ms | abrir/fechar painéis, toasts |
| `--duration-slow` | 300 ms | contagem de moedas, transição de tela |
| `--ease-step` | `steps(4)` ou `steps(8)` | tudo que anima na UI (look de pixel) |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | só movimento de câmera na UI (zoom do level-up) |

Regras: nada de fade suave em elementos pixel (usar `steps`); `prefers-reduced-motion` desliga pulsos e deslocamentos; nenhuma animação de UI dura mais de 300 ms, exceto contagem de almas (até 1,5 s).

### 16.7 Estados e feedback

- Foco visível sempre (teclado/gamepad): outline 2 px `ember` com offset 2 px; navegação por gamepad usa lista explícita de focáveis por tela.
- Erro/sem ouro: `Toast` `blood-light` + `sfx_ui_denied`; botão treme 2 px por 100 ms (`steps(2)`).
- Carregando: cubo girando em `steps(8)`, texto "Forjando...".
- Vazio: texto `bone-dark` + ícone de caveira.

### 16.8 Acessibilidade

- Contraste mínimo 4,5:1 para texto body sobre `night-2` (`bone` ≈ 9:1) e 3:1 para display grande.
- Alvos de toque ≥ 48 × 48 px; espaçamento ≥ 8 px entre alvos.
- Todo ícone tem `aria-label`; toda tela tem `h1` visualmente oculto; HUD com `aria-live="polite"` só para eventos raros (level-up, elite, chefe), nunca para números de dano.
- Escala de UI 100/125/150% via `--ui-scale` aplicada ao root da UI (unidades `rem`), sem `zoom` CSS.

### 16.9 Implementação no Tailwind v4

```css
/* packages/ui/src/theme.css */
@import "tailwindcss";
@theme {
	--color-night: #14121c;
	--color-ember: #e07a2a;
	/* ...todos os tokens de 16.1 */
	--font-display: "PixelFont", monospace;
	--font-body: "Inter", sans-serif;
	--spacing: 4px;
	--radius-*: initial;
	--breakpoint-mobile-l: 821px;
	--breakpoint-desktop: 1024px;
	--breakpoint-desktop-xl: 2048px;
	--duration-fast: 100ms;
	--duration-base: 150ms;
	--duration-slow: 300ms;
	--ease-step: steps(4);
}
:root[data-theme="cb"] {
	--color-rarity-2: var(--color-cb-blue);
	--color-rarity-3: var(--color-cb-orange);
	--color-rarity-4: var(--color-cb-magenta);
	--color-heal: var(--color-cb-blue);
}
```

Componentes em `packages/ui/src/components/<Nome>/<Nome>.tsx` com verificação visual em `tests/visual/` (capturas Playwright nos 4 alvos).

## 17. Alvos de tela

Decisão D31 (dados do PO em `docs/brainstorming.md` §7.2). Layout de referência: 1920 × 1080. Os outros 3 derivam por regras, não por arte separada.

| Alvo | Viewport CSS | Escala UI | HUD | Telas de overlay |
| --- | --- | --- | --- | --- |
| 1920 × 1080 | 1920 × 1080 | 100% | 4 cantos, margem 24 px | loja 4 colunas; level-up 3 cartas lado a lado; Ossuário radial completo |
| 2560 × 1440 | 2560 × 1440 | 125% (auto) | idem, margem 32 px | idem (mais área de jogo visível, não mais UI) |
| 896 × 414 (~6,1") | 896 × 414 | 100% | margem = safe area (≥ 24 px); joystick à esquerda, dash/pausa à direita; HP/XP compactos topo-esquerda; round/timer topo-centro | loja 2 × 2 rolável; level-up 3 cartas 180 × 240; Ossuário por ramo (tabs) |
| 800 × 360 (~6,5") | 800 × 360 | 100% | idem, texto 13 px mínimo | idem; cartas 160 × 220 |

Regras:

- Nenhum elemento de HUD cobre o herói (centro) nem o anel de 6 u ao redor dele.
- Em mobile, o canto inferior direito é reservado a dash/pausa; o esquerdo ao joystick flutuante (aparece onde o polegar toca).
- Capturas obrigatórias em PR de UI: as 4 viewports × telas (HUD in-run, loja, level-up, chefe, resultado, Ossuário), geradas por Playwright e anexadas como artefato.
- Benchmarks de performance (SDD 14) rodam em 1080p e 1440p no desktop e nos 2 viewports mobile em device real da classe Galaxy A.
