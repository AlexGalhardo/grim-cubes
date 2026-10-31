# Prompts de concept art: Opções, Ossuário e retratos

Prompts para gerar no ChatGPT (gerador de imagens) os mockups das telas de **Opções** e do **Ossuário**, e os **retratos** do Carrasco e do Mercador de Ossos usados na loja.

As telas serão implementadas em **React 19 + Tailwind CSS 4**, então os prompts das telas pedem só o que HTML e CSS fazem: painéis retangulares, bordas finas, rebites quadrados, gradientes, sombras (`box-shadow` e `inset`), grade (`grid`), sliders, toggles, botões, texto e os ícones de 32 px do jogo. Ficam de fora molduras esculpidas, texturas pintadas, partículas e filigranas.

Regra das duas telas: **tudo cabe numa tela 16:9 sem rolagem**.

## Como usar

- Cole um prompt por vez, em inglês, e peça variações do que gostar.
- Telas: peça "flat UI mockup, screenshot of a game interface, 1920x1080". Se vierem ornamentos que o CSS não faz, peça "simplify the frames to flat rectangles with thin borders, square rivets and soft shadows".
- Retratos: peça PNG quadrado, 512×512 ou maior. O jogo reduz para 96 a 128 px na loja, então o rosto precisa ler pequeno.
- O texto gerado costuma sair errado; o que importa é o layout. Os textos reais vêm do i18n do jogo.

## Paleta (Art Bible §3)

Noite `#14121C`, ferro `#5A5F66`, ferro escuro `#2E3136`, ferro negro `#2B2A33`, ferrugem `#8A4A2B`, osso `#D9C9A3`, brasa `#E07A2A` e `#F5B04A`, sangue `#5E0E14` e `#8E1A1F`, lodo `#6B8F3A`, azul-frio `#4C7FB8`. Sem branco nem preto puros.

## O que a tela de Opções tem hoje

- **Vídeo:** preset de qualidade (Mínimo, Baixo, Médio, Alto, Ultra, Automático) e tela cheia.
- **Áudio:** volume geral, música e efeitos (sliders de 0 a 100).
- **Jogo:** velocidade do jogo (1x, 2x, 3x), idioma, legendas das falas, barra de vida do herói, barra de vida dos inimigos e telemetria anônima.
- **Acessibilidade:** brilho, contraste, modo daltônico (Desligado, Protanopia, Deuteranopia, Tritanopia), reduzir flashes e tremores, escala da interface (90, 100, 125, 150%) e nível de gore.
- **Controles:** 8 teclas remapeáveis (cima, baixo, esquerda, direita, dash, pausa, reroll, velocidade), 4 botões do controle (dash, pausa, reroll, velocidade) e "Restaurar padrões".
- **Rodapé:** "Fechar".

## Prompt 1: Opções em 3 colunas, sem rolagem

```text
Flat game UI mockup, screenshot of a dark fantasy roguelite OPTIONS screen, 16:9, 1920x1080, everything fits on one screen with no scrolling. Only elements buildable with HTML and CSS: rectangular panels, thin borders, small square rivets in the corners, subtle vertical gradients, soft drop shadows and inset shadows, CSS grid, sliders, toggle switches, segmented buttons, dropdown boxes, crisp text. No sculpted 3D frames, no painted textures, no particles, no filigree.

Background: the game scene blurred and darkened behind a night overlay (#14121C at 85%).

Top: a title bar "OPTIONS" in a blocky pixel display font with a thin rust separator line (#8A4A2B), and a small close button "X" on the right.

Body: 3 equal columns, each column made of stacked riveted iron plate sections (dark iron #2E3136 to #2B2A33 gradient, 2px border, bone-colored square rivets):
- Column 1: "VIDEO" section (quality preset as a 6-option segmented control, fullscreen toggle) and "AUDIO" section (3 horizontal sliders: Master, Music, Effects, each with a number value on the right, ember-orange #E07A2A fill on a dark track).
- Column 2: "GAMEPLAY" section (game speed segmented 1x/2x/3x, language dropdown, 4 toggle switches: subtitles, hero health bar, enemy health bars, anonymous telemetry) and "ACCESSIBILITY" section (brightness and contrast sliders, color-blind mode dropdown, reduce flashes toggle, UI scale segmented 90/100/125/150, gore level segmented).
- Column 3: "CONTROLS" section: a compact 2-column table of 8 keyboard actions with key caps on the right (W, S, A, D, Space, Esc, R, Tab), a smaller table of 4 gamepad buttons with button glyphs (A, Start, X, Back), a red-wine conflict warning line, and a "Reset to defaults" button.

Bottom right: a large raised "Close" button in ember orange with a darker base and drop shadow, like a pressable iron plate.

Toggles as small iron switches with an ember knob when on. Labels in bone color (#D9C9A3), values in bright ember (#F5B04A). Palette only: night #14121C, iron #5A5F66, dark iron #2E3136, rust #8A4A2B, bone #D9C9A3, ember #E07A2A and #F5B04A, blood #8E1A1F. No pure white, no pure black. Grimdark, readable, compact spacing so it all fits without scrolling.
```

## Prompt 2: Opções em 2 colunas com abas laterais

Alternativa mais limpa: abas à esquerda escolhem a seção e o conteúdo aparece em 2 colunas, sempre sem rolagem.

```text
Flat game UI mockup, dark fantasy game OPTIONS screen, 1920x1080, no scrolling, buildable with HTML and Tailwind CSS only (rectangles, borders, square rivets, gradients, shadows, grid, sliders, toggles, segmented buttons, text). No ornaments.

Layout: a centered riveted iron panel covering about 85% of the screen over a blurred, darkened game background.
Left: a vertical tab list with 5 tabs as raised iron plates: Video, Audio, Gameplay, Accessibility, Controls. The active tab "Accessibility" is pressed down, with an ember-orange left border and brighter text.
Right: the content of the active tab in 2 columns of rows. Each row has the label on the left and the control on the right: brightness slider, contrast slider, color-blind mode dropdown, reduce flashes toggle, reduce screen shake toggle, UI scale segmented control (90 / 100 / 125 / 150), gore level segmented control. One small preview box in the corner showing four rarity-colored item frames (bone, moss green #6B8F3A, cold blue #4C7FB8, blood red #8E1A1F) with small shape markers (circle, diamond, triangle, star) to show the color-blind mode.
Bottom bar: "Reset to defaults" (iron button) on the left and a big ember-orange "Close" button on the right, both raised plates with a darker base and drop shadow.

Typography: blocky pixel display font for titles and tabs, clean sans for labels. Palette: night #14121C, iron #5A5F66 and #2E3136, rust #8A4A2B, bone #D9C9A3, ember #E07A2A / #F5B04A. No pure white or pure black.
```

## O que o Ossuário tem hoje

- Árvore permanente comprada com **almas** entre as runs.
- **5 ramos** de 6 nós cada (30 nós): Carne (sobrevivência), Aço (dano), Sombra (mobilidade), Ouro (economia) e Ruína (meta). Cada nó depende do anterior do mesmo ramo.
- Cada nó tem ícone (glifo do ramo e de 1 a 6 pontos), nome, efeito em 1 linha, custo em almas e estado: comprado, disponível, sem almas ou bloqueado.
- Topo: almas disponíveis. Rodapé: "Resetar (+reembolso)" e "Fechar".

## Prompt 3: Ossuário em 5 colunas, sem rolagem

```text
Flat game UI mockup, dark fantasy roguelite skill tree called "THE OSSUARY", 16:9, 1920x1080, everything visible on one screen with no scrolling. Only HTML and CSS elements: rectangular panels, thin borders, small square rivets, gradients, soft shadows, CSS grid, thin connector lines, 32x32 pixel-art icons, crisp text. No sculpted frames, no painted textures, no glowing particles.

Background: a dark crypt mood made only of a vertical gradient from night #14121C to dark violet #2B2340 behind a darkened, blurred game scene.

Top bar: title "OSSUARY" in a blocky pixel display font, a skull-and-bone souls counter "Souls: 1,240" in bone color on the right, and a thin rust separator line.

Body: 5 vertical columns, one per branch, each headed by a small riveted plate with the branch glyph and name: Flesh (survival, wine red #8E1A1F accent), Steel (damage, iron grey #9AA3AD accent), Shadow (mobility, violet #3F3A52 accent), Gold (economy, ember #E07A2A accent), Ruin (meta, moss green #6B8F3A accent).
Under each header, 6 node cards stacked vertically and connected by a short thin vertical line between them. Each node card is compact: a 32x32 icon on the left, the node name, one short effect line (e.g. "+10 max HP"), and the cost with a small skull icon on the right. States: bought nodes have a bright branch-colored border and a small check mark; the next available node has an ember-orange border with a soft outer glow made of box-shadow; nodes the player cannot afford show the cost in blood red; locked nodes are dimmed to 40% opacity with a small padlock.

Bottom bar: an iron "Reset (+620)" button on the left with a small warning text, and a large ember-orange "Close" button on the right, both raised plates with a darker base and drop shadow.

Palette only: night #14121C, iron #5A5F66 / #2E3136, rust #8A4A2B, bone #D9C9A3, ember #E07A2A / #F5B04A, blood #8E1A1F, moss #6B8F3A. No pure white or black. Grimdark, compact, all 30 nodes readable at once.
```

## Prompt 4: retrato do Carrasco (herói)

```text
Square game portrait icon, 1024x1024, pixel-art style with chunky voxel-like shading, dark fantasy grimdark, readable when scaled down to 96x96.

Subject: "the Executioner", bust view, three-quarter angle facing slightly to the right. A heavy iron hood and helmet that hides the whole face in shadow, with only two glowing ember-orange eyes (#F5B04A with an orange #E07A2A glow) visible inside. A tattered wine-red cloth hood and mantle (#5E0E14 and #6E2F3F) draped over rusted iron plate shoulders with small spikes (#5A5F66, rust #8A4A2B). A chain crossing the chest with one small bone skull hanging from it. Blocky, cube-built shapes, like the hero of a dark voxel game.

Background: flat dark night color #14121C with a subtle wine-red vignette, no scenery, no text. Clean silhouette, strong rim light on the helmet edge so it reads against the dark background. No pure white, no pure black.
```

## Prompt 5: retrato do Mercador de Ossos

```text
Square game portrait icon, 1024x1024, pixel-art style with chunky voxel-like shading, dark fantasy grimdark, readable when scaled down to 96x96.

Subject: "the Bone Merchant", bust view, three-quarter angle facing slightly to the left. A tall skeletal merchant in a deep dark hooded robe (violet-black #2B2340 with a wine-red #5E0E14 inner lining), a bone-white skull face (#D9C9A3 with shadows #8C7A5B) with a sly toothy grin and small ember pupils glowing in the eye sockets. One bony hand holds up a small iron lantern with a warm ember flame (#E07A2A / #F5B04A) that lights the side of the skull. A few bone charms, coins and a tiny vial hang from a cord around the neck. Blocky, cube-built shapes, like an NPC of a dark voxel game.

Background: flat dark night color #14121C with a faint warm glow behind the lantern, no scenery, no text. Clean silhouette, warm lantern light on one side and cold violet shadow on the other. No pure white, no pure black.
```
