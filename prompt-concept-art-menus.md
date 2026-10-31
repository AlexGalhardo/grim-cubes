# Prompts de concept art: loja + inventário (estilo ARPG)

Prompts para gerar no ChatGPT (gerador de imagens) um **mockup de UI** da tela de loja do Mercador de Ossos junto com o inventário do herói, no estilo de ARPG como Diablo IV: herói e status à esquerda, ofertas do Mercador à direita em grade de 2 colunas.

A imagem serve de referência visual para implementar em **React 19 + Tailwind CSS 4**. Por isso os prompts pedem só o que dá para fazer com HTML e CSS: painéis retangulares, bordas, rebites quadrados, gradientes, sombras (`box-shadow`, `inset`), grade (`grid`), barras de progresso, texto, ícones em pixel art de 32 px (os que o jogo já tem) e o retrato do Mercador numa caixa. Ficam de fora molduras esculpidas em 3D, texturas pintadas à mão, partículas, filigranas e fontes caligráficas, que não sairiam iguais no código.

## Como usar

- Cole um prompt por vez, em inglês, e peça variações do que gostar.
- Formato: paisagem 16:9, 1920×1080. Diga "flat UI mockup, screenshot of a game interface", senão o gerador tende a fazer arte de capa.
- Se aparecerem ornamentos que o CSS não faz (correntes em relevo, couro pintado, metal esculpido), peça: "simplify the frames to flat rectangles with thin borders, square rivets and soft shadows".
- O texto gerado costuma sair errado; o que importa é o layout, a hierarquia, as cores e o estilo dos painéis. Os textos reais vêm do i18n do jogo.

## O que a tela precisa mostrar (dados reais do jogo)

- **Esquerda, herói (o Carrasco):** nome, nível com barra de XP, HP atual/máximo com barra, round atual, ouro e almas.
- **Arma equipada:** um slot grande com ícone, nome, tier (cor da raridade) e o upgrade de tier, se houver.
- **Itens possuídos:** o herói não tem slots de equipamento; os itens são passivos e acumulam. Mostrar como uma grade de ícones quadrados de 32 px (até 6 colunas), cada um com borda na cor da raridade e um número de quantidade quando repetido.
- **Status completos:** os 12 stats primários (HP máx, regeneração, roubo de vida, dano, velocidade de ataque, crítico, alcance, armadura, esquiva, velocidade, sorte, colheita) e os secundários que estiverem ativos (raio de coleta, XP, preços na loja, empurrão, dano em chefes, tamanho de explosão, velocidade dos inimigos, trocas grátis). Cada linha com nome à esquerda e valor à direita; valor positivo em verde-lodo, negativo em sangue claro; ao passar o mouse num item da loja, a linha mostra o delta (ex.: `+4% → +9%`).
- **Direita, loja do Mercador:** retrato do Mercador de Ossos no topo, com uma fala curta; 4 ofertas em grade de 2 colunas (2×2), cada card com ícone, nome, tier, descrição de 1 a 2 linhas, preço em ouro e dois botões: comprar e travar (cadeado).
- **Rodapé da loja:** botão de trocar itens com o preço do reroll, ouro disponível e o botão "Próximo round" em destaque.
- Raridades (cores do jogo): Comum osso `#D9C9A3`, Incomum lodo `#6B8F3A`, Raro azul-frio `#4C7FB8`, Lendário sangue claro `#8E1A1F`. No modo daltônico entram símbolos (● ◆ ▲ ★), então deixe espaço para um símbolo pequeno no canto do card.

## Prompt 1: Layout clássico de ARPG

```text
Flat game UI mockup, screenshot of a dark fantasy ARPG shop and inventory screen, 16:9, 1920x1080, inspired by the layout clarity of Diablo IV menus but simpler. Only elements that can be built with HTML and CSS: rectangular panels, thin borders, small square rivets in the corners, subtle vertical gradients, soft drop shadows and inset shadows, CSS grid, progress bars, crisp text, and 32x32 pixel-art icons. No sculpted 3D frames, no painted leather or metal textures, no particles, no ornate filigree.

Background: the game scene blurred and darkened behind a semi-transparent night-colored overlay (#14121C at 85%).

Left half: "Executioner" character panel. Top: name, "Level 7" with a thin ember-orange XP bar (#E07A2A), a blood-red HP bar (#8E1A1F) with "84 / 120", and small counters for round, gold (ember coin icon) and souls (bone skull icon). Below: a large square weapon slot with a pixel-art greatsword icon, its name and a colored tier border. Below: "Items" as a grid of small square icon slots, 6 columns, each with a 2px border in its rarity color and a tiny quantity number in the corner. Bottom: a two-column stats list with 12 rows (stat name left, value right), positive values in moss green (#6B8F3A), negative values in light blood (#8E1A1F), one highlighted row showing a change preview "+4% → +9%".

Right half: "Bone Merchant" shop panel. Top: a small square portrait of a hooded skeletal merchant with a lantern, next to one line of dialogue in italic. Middle: 4 item offer cards in a 2-column grid (2x2). Each card: 32x32 pixel icon, item name, rarity label, a 2-line description, a price with a gold coin icon, a "Buy" button and a small padlock "Lock" toggle button; the card border uses the rarity color (bone #D9C9A3, moss #6B8F3A, cold blue #4C7FB8, blood #8E1A1F). Bottom: a "Reroll (11)" button, the gold total, and a large primary "Next round" button in ember orange.

Style: grimdark, readable, high contrast text in bone color (#D9C9A3) on dark iron panels (#2E3136 to #2B2A33 gradient), panel titles in a blocky pixel display font, buttons as raised iron plates with a darker bottom edge and a drop shadow, hover glow in ember. Palette only: night #14121C, iron #5A5F66, dark iron #2E3136, rust #8A4A2B, bone #D9C9A3, ember #E07A2A and #F5B04A, blood #5E0E14. No pure white, no pure black.
```

## Prompt 2: Painéis como placas rebitadas

```text
UI design mockup for a grimdark voxel roguelite, shop plus inventory screen, landscape 1920x1080, flat and buildable with React and Tailwind CSS (rectangles, borders, rivets as small squares, linear gradients, box shadows, grid layouts, progress bars, text, 32x32 pixel icons). No 3D ornaments, no hand-painted textures.

Two big panels side by side over a darkened, blurred game background, each panel looking like a riveted iron plate: dark iron fill with a subtle top-to-bottom gradient, a 2px rust-colored inner border (#8A4A2B), square bone-colored rivets in the four corners, a heavy soft shadow underneath.

Left panel (about 45% width), "THE EXECUTIONER": header row with level badge, XP bar in ember, HP bar in blood red, gold and souls counters. A large weapon slot on the left of the header with an ember glow border. Under it, a compact grid of owned item icons (6 per row, rarity-colored borders). Under that, a stats table split in two columns with thin rust separators: max HP, regen, life steal, damage, attack speed, crit, range, armor, dodge, speed, luck, harvest, then secondary stats in a smaller font. One stat row highlighted in a slightly lighter band, showing a green "+5" delta preview.

Right panel (about 55% width), "BONE MERCHANT": a square portrait box of a skeletal merchant in a dark hood, a speech line, then a 2-column grid of 4 offer cards. Each card is a smaller riveted plate with a colored top stripe for rarity, the item icon on the left, name and short description on the right, price with gold icon at the bottom right, and two buttons: "Buy" (raised plate) and a padlock toggle. One card shown "locked" with the padlock highlighted in ember. Under the grid: "Reroll", gold total, and a wide "Next round" button in ember orange with a raised 3D-plate look (darker base below, shadow).

Typography: pixel display font for titles, clean readable sans for numbers. Colors: night #14121C, iron #5A5F66 / #2E3136, rust #8A4A2B, bone #D9C9A3, ember #E07A2A / #F5B04A, blood #5E0E14 / #8E1A1F, moss #6B8F3A, cold blue #4C7FB8. No pure white or pure black.
```

## Prompt 3: Versão compacta para tela pequena

Mesma tela pensada para caber também em celular deitado (800×360), útil para ver o que sobra quando o espaço aperta.

```text
Flat mobile-landscape game UI mockup, 800x360 aspect, dark fantasy ARPG shop and inventory, buildable only with HTML and CSS (rectangles, borders, square rivets, gradients, shadows, grid, progress bars, text, 32x32 pixel icons). No ornate frames.

Left column (40%): compact hero header (level badge, thin XP bar, HP bar, gold and souls), a weapon slot, and a scrollable 2-column stats list with small text and a visible thin scrollbar. Owned items as a single scrollable row of small rarity-bordered icons.

Right column (60%): Bone Merchant shop with 4 offer cards in a 2-column grid, each card compact: icon, name, price with gold icon, a "Buy" button and a padlock button; descriptions hidden and shown in a tooltip box on focus. Bottom row: "Reroll" button and a wide ember-orange "Next round" button.

Large touch targets (at least 44px tall buttons), high contrast bone text on dark iron panels, rarity color borders (bone, moss green, cold blue, blood red), raised iron-plate buttons with a darker base and a soft shadow. Palette: night #14121C, iron #2E3136, rust #8A4A2B, bone #D9C9A3, ember #E07A2A, blood #8E1A1F, moss #6B8F3A, cold blue #4C7FB8.
```
