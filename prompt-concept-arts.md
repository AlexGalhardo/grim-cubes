# Grim Cubes — Prompts de concept art (ChatGPT Plus)

Versão 1.0.0 — 2026-10-31. Decisão D32. Prompts para gerar concept arts do jogo "finalizado" com o gerador de imagens do ChatGPT Plus, derivados de `docs/art-bible.md` (paleta §3, luz §4, escala §5, design system §16, alvos de tela §17) e `docs/gdd.md` (telas §21, HUD §21.2, chefes §12, biomas §6.2, Mercador §17.3).

## Como usar

1. Cole primeiro o **Bloco de estilo global** (§1) numa mensagem e peça "confirme que entendeu; não gere ainda".
2. Em seguida, cole um prompt de §3–§8. Cada prompt já repete o essencial do estilo (os geradores não guardam contexto perfeitamente).
3. Gere 2–4 variações; escolha pela aderência ao Art Bible, não pela "beleza". Rejeite qualquer resultado com os itens de §2.
4. Salve os escolhidos em `references/concept-arts/<secao>-<id>-<variante>.png` e registre no índice `references/concept-arts/README.md` (prompt usado, data, aprovado por).
5. Concept art é referência para o Blockbench, nunca asset do jogo (Art Bible §13).

Convenções dos prompts: texto em inglês (melhor aderência do gerador); proporção indicada por prompt; onde houver `[WEB]`, `[DESKTOP]`, `[MOBILE]`, use a versão da plataforma. Textos de UI entre aspas devem aparecer literalmente na imagem.

## 1. Bloco de estilo global (cole antes de tudo)

```text
STYLE BIBLE — GRIM CUBES (use for every image in this session)

Game: "Grim Cubes", a dark voxel survival roguelite. Think Brotato/Vampire Survivors gameplay rendered as a grimdark, low-poly VOXEL world in the spirit of Minecraft/Hytale geometry but with the tone of DOOM: The Dark Ages, Warhammer 40k grimdark, Alien (industrial biomechanical) and Predator (hunt, thermal heat).
Geometry: everything is built from cubes and flat quads only. No spheres, no smooth curves, no organic sculpting. Characters are stocky, blocky, big heads (head ≈ 1/4 of height), broad torsos, 4-pixel-wide limbs; props are chunky cubes. Pixel-art textures at 64 px per meter for characters and 32 px per meter for props/ground; visible crisp pixels, no anti-aliasing, no gradients, no photographic textures.
Palette (exact hex, use these): Night #14121C (sky/fog/background), Cold shadow #2B2340 (all shadows are blue-purple, never grey), Mist #3F3A52, Iron #5A5F66, Iron dark #2E3136, Rust #8A4A2B, Bone #D9C9A3, Bone shadow #8C7A5B, Blood #5E0E14 (dark wine red, NEVER bright red), Blood light #8E1A1F, Ember #E07A2A, Ember light #F5B04A (accents: fire, loot, hero highlights), Sludge green #6B8F3A, Cold blue #4C7FB8. No pure white, no pure black.
Lighting: one hard directional "dead sun" light from upper-left, warm-neutral; ambient blue-purple fill; painted ambient occlusion at bases and corners; linear fog to Night color in the distance; subtle vignette; faint bloom only on emissive embers/eyes; light film grain. Flat/unlit look, no PBR glossiness, no specular highlights.
Camera (gameplay images): fixed isometric-style perspective, elevation about 55°, narrow field of view (~30°), hero centered, no camera rotation, horizon not visible.
Mood: brutal, oppressive, war against a horde; worn, rusted, bloodstained, bone-littered; serious — never cute, never cartoony, never glossy toy-like.
Render as a polished in-game screenshot or key art of a finished, shipped game. 
```

## 2. Lista de rejeição (aplique a todo resultado)

Rejeite se aparecer: esferas ou curvas suaves; vermelho vivo/saturado; branco ou preto puros em áreas grandes; gradientes suaves ou texturas fotográficas; olhos arregalados, línguas de fora, sorrisos, humor "fofo"; look de plástico/brinquedo; qualquer símbolo ou design reconhecível de Warhammer (aquila, Space Marine), DOOM (Slayer, Cacodemon), Alien (xenomorfo), Predator (máscara/dreadlocks), Minecraft (Steve/Creeper) ou Roblox; cantos arredondados em UI; fontes serifadas ou cursivas; HUD cobrindo o herói; texto ilegível.

## 3. Key art e identidade

### 3.1 Key art principal (16:9)

```text
Key art for "Grim Cubes", 16:9. A lone blocky voxel executioner ("the Headsman": rusted plate armor, iron hood with a narrow visor, a huge rusted sword) stands on a cracked grey graveyard ground, back slightly turned, facing an endless horde of blocky undead "Husks" pouring from the fog on all sides. Dark wine-red blood (#5E0E14) splatters as cubes; broken tombstones and dead cube-trees; a single hard light from upper-left; blue-purple shadows (#2B2340); fog fading to #14121C. Ember accents (#E07A2A) on the hero's visor glow and a distant infernal forge on the horizon line. Title "GRIM CUBES" in a chunky pixel display font, bone color (#D9C9A3) with 1-px night shadow, centered top. No other text. Follow the Grim Cubes style bible: cubes and quads only, pixel textures, no gradients, no pure white/black, never cute.
```

### 3.2 Capsule Steam (horizontal 920×430 e vertical 600×900)

```text
Steam store capsule for "Grim Cubes" at 920×430 (then a second version at 600×900 vertical). Tight framing on the Headsman's upper body and sword, three-quarter view, hood visor glowing ember (#F5B04A), blood cubes frozen mid-air, horde silhouettes in the fog behind. Logo "GRIM CUBES" pixel display font, bone (#D9C9A3), bottom-left for horizontal / top for vertical, large and readable at thumbnail size. Voxel geometry only, pixel textures, palette: #14121C, #2B2340, #5A5F66, #8A4A2B, #D9C9A3, #5E0E14, #E07A2A. No pure white/black, no smooth curves, never cute.
```

### 3.3 Ícone do app (1:1, 512×512)

```text
App icon 512×512 for "Grim Cubes": a single blocky iron hood (the hero's helmet) seen from the front, visor glowing ember (#F5B04A), on a flat night background (#14121C) with a thin rust (#8A4A2B) square border; one small dark-red (#5E0E14) blood cube at the corner. Voxel/pixel style, crisp pixels, no gradients, no text, no rounded corners, readable at 48×48.
```

## 4. Personagens

### 4.1 Herói — o Carrasco (folha de personagem)

```text
Character sheet, 16:9, of "the Headsman", hero of Grim Cubes: a stocky voxel executioner 1.9 m tall built only from cubes — head 8×8×8 px block with an iron hood and a narrow visor slit glowing ember (#F5B04A); broad torso in rusted plate (#5A5F66 with rust #8A4A2B at edges, painted ambient occlusion); 4-px-wide arms and legs; one shoulder pauldron larger than the other; chains on the belt; a huge two-handed rusted sword. Show front, side and back views on a flat #1C1926 background, plus a small action pose swinging the sword with cube blood (#5E0E14) particles. Pixel textures at 64 px per meter, no anti-aliasing, blue-purple shadows (#2B2340), no pure white/black. Serious and brutal, never cute.
```

### 4.2 Inimigos comuns (8 em uma folha)

```text
Enemy lineup sheet, 16:9, Grim Cubes voxel style (cubes and quads only, pixel textures, palette #14121C #2B2340 #5A5F66 #8A4A2B #D9C9A3 #5E0E14 #6B8F3A #4C7FB8). Eight enemies side by side on a flat #1C1926 floor, each with a distinct silhouette readable in pure black: 1) HUSK — hunched undead humanoid, grey-green rotten skin, 1.7 m; 2) WAIL — oversized head on a thin body, 0.9 m, jaw hanging; 3) DROWNED — wide, squat, bloated, swamp-green, 1.6 m; 4) LEECH — segmented cylinder of cubes with a sucker mouth, 0.8 m; 5) FORGED — huge shoulders of black iron with orange ember veins, 2.4 m; 6) WATCHER — a stationary iron tower with one glowing ember eye, 2.2 m; 7) HUNTER — long low quadruped, biomechanical dark metal and flesh, 1.6 m; 8) BREEDER — a swollen sac on short legs, 2.6 m, pale with dark veins. Hard light from upper-left, blue-purple shadows, painted AO. Labels under each in pixel font. Never cute.
```

### 4.3 Elites (4 modificadores)

```text
Four variants of the same voxel HUSK enemy from Grim Cubes, scaled ×1.6, each with an elite aura on the ground made of emissive cube particles: ARMORED (steel-grey aura #9AA3AD, extra iron plates), SWIFT (amber aura #E0A030, motion cubes trailing), VAMPIRIC (wine-red aura #8E1A1F, dripping blood cubes), EXPLOSIVE (orange aura #E07A2A, cracks glowing ember). Flat #1C1926 background, labels in pixel font, cubes and quads only, pixel textures, no gradients, no pure white/black. 16:9.
```

### 4.4 Chefes (um prompt por chefe; 16:9 cada)

```text
Boss concept, 16:9, Grim Cubes voxel style: "THE GRAVEDIGGER" (round 10 boss), a 5 m tall blocky undead giant in a tattered coat, carrying a huge rusted iron shovel; lantern of ember light (#E07A2A) hanging from his belt; graveyard biome (grey ground #4A4A45, tombstones, dead cube-trees, fog #14121C). Show him mid-charge with a red telegraph line on the ground (#8E1A1F at 60% opacity) and six small Husks rising from the dirt around him. Hero (small blocky executioner) in the foreground for scale. Cubes/quads only, pixel textures, hard upper-left light, blue-purple shadows. Never cute.
```

```text
Boss concept, 16:9, Grim Cubes voxel style: "THE SWAMP MATRIARCH" (round 20), a 4.5 m bloated swamp witch-thing made of cubes, sludge-green (#6B8F3A over #2F4A33) with bone ornaments (#D9C9A3), long arms, a mouth full of leech cubes; she stands in shallow dark water of the Bone Swamp biome (giant cube ribcages, totems), spawning three Leeches and a pool of slow green sludge on the ground. Hero small in foreground. Hard light upper-left, fog #14121C, pixel textures, no gradients, never cute.
```

```text
Boss concept, 16:9, Grim Cubes voxel style: "THE FORGEMASTER" (round 30), a 6 m black-iron golem (#2E3136 with ember veins #E07A2A) with anvil fists and chains, in the Infernal Forge biome (black stone with orange cracks, anvils, cauldrons, iron towers). Show a radial shockwave of ember cubes from a hammer slam and chains shooting in four directions. Hero small in foreground. Cubes/quads only, pixel textures, hard light, blue-purple shadows, never cute.
```

```text
Boss concept, 16:9, Grim Cubes voxel style: "THE ALPHA HUNTER" (round 40), a 4 m sleek biomechanical quadruped predator of dark metal (#2E3136) and flesh (#6E2F3F), half-invisible (shimmering translucent cubes) stalking in the Biomechanical Nest biome (dark flesh/metal ground #2A1F2A, cube eggs, metal ribs, tubes). Thermal-vision inspired ember glow (#E07A2A) on its eyes and joints. Hero small, back turned, unaware. No recognizable film designs. Pixel textures, cubes only, never cute.
```

```text
Boss concept, 16:9, Grim Cubes voxel style: "THE NEST QUEEN" (round 50), a 6 m biomechanical matriarch with a long cube tail, dark metal and pale flesh, surrounded by glowing cube eggs hatching Hunters; second phase shown in a small inset: she hovers and drops ember bombs. Biome: Biomechanical Nest (#2A1F2A ground, #17111A shadows, flesh #6E2F3F, iron #5A5F66). Hero small in foreground. No recognizable film designs. Pixel textures, cubes only, never cute.
```

### 4.5 Mercador de Ossos (NPC da loja)

```text
Character concept, 16:9, Grim Cubes voxel style: "THE BONE MERCHANT", a 2.3 m tall blocky skeleton in a leather cloak (#8A4A2B worn, #2E3136 shadows), one ember-lit eye socket (#F5B04A), pushing a cart made of bones and iron full of rusted weapons, vials and skulls. Show three views (front, side, three-quarter) and a small animation strip: emerging from the ground, idle, handing over an item. Flat #1C1926 background, pixel textures 64 px/m, cubes and quads only, dry grim humor in posture but never cute.
```

## 5. Mundo e biomas (16:9, câmera de gameplay)

```text
In-game screenshot, 16:9, Grim Cubes: fixed isometric perspective (55° elevation, narrow FOV), hero centered, the SUNKEN CEMETERY biome: flat grey dirt ground (#4A4A45, shadows #2F2E33) built from 1-meter cubes with 4 subtly different ground tiles, cube tombstones, iron fences, a crypt, dead trees with bare cube branches, scattered bone props (#D9C9A3). Fog fades to #14121C at ~30 m. About 40 Husks and Wails converging from all sides; dark-red cube blood and splat decals on the ground. No HUD. Hard light upper-left, blue-purple shadows, pixel textures, never cute.
```

```text
In-game screenshot, 16:9, Grim Cubes: BONE SWAMP biome — dark sludge ground (#2F4A33 / #1C2E24), shallow decorative water, giant cube ribcages and skull totems, sludge-green accents (#6B8F3A); 40 Drowned and Leeches; same fixed isometric camera, hero centered, fog to #14121C, no HUD, pixel voxel style, never cute.
```

```text
In-game screenshot, 16:9, Grim Cubes: INFERNAL FORGE biome — black stone ground (#2A2524) with orange ember cracks (#E07A2A), anvils, chains, cauldrons, iron towers; 40 Forged and Watchers (towers with one glowing eye firing slow projectiles); ember particles rising; same fixed isometric camera, hero centered, fog to #14121C, no HUD, pixel voxel style, never cute.
```

```text
In-game screenshot, 16:9, Grim Cubes: BIOMECHANICAL NEST biome — dark flesh-and-metal ground (#2A1F2A / #17111A), cube eggs with faint ember glow, metal ribs and tubes (#5A5F66), flesh accents (#6E2F3F); 40 Hunters and Breeders; same fixed isometric camera, hero centered, fog to #14121C, no HUD, pixel voxel style, never cute, no recognizable film creature designs.
```

```text
Biome transition study, 16:9: top-down map diagram of Grim Cubes' infinite world as concentric rings around the spawn — ring 0 Sunken Cemetery (0–120 m), ring 1 Bone Swamp (120–260 m), ring 2 Infernal Forge (260–420 m), ring 3 Biomechanical Nest (420 m+ repeating darker). Flat pixel-art diagram in the game palette on #14121C, pixel font labels, 16-meter blended borders shown as dithered edges.
```

## 6. Gameplay com HUD (versões por plataforma)

Regras do HUD (GDD §21.2, Art Bible §16–§17): topo-esquerda HP (barra 20 px, vermelho-vinho sobre trilho noite, número) e XP (barra âmbar) + nível; topo-centro "ROUND 14" e timer "0:37"; topo-direita ouro "⟡ 142" em #F5B04A, almas "☠ 85", ícone de elite; base-esquerda arma atual com 4 pips de tier e ícones de itens com contadores; indicadores de borda (setas) para elite/chefe. Painéis de ferro #5A5F66 com borda 2 px #2E3136 e rebites, sem cantos arredondados, fonte pixel.

```text
[DESKTOP] In-game screenshot 1920×1080 (16:9) of Grim Cubes mid-combat in the Sunken Cemetery: fixed isometric camera, blocky executioner hero centered swinging a rusted sword, ~60 Husks/Wails converging, cube blood, damage numbers in pixel font (white, one yellow crit "48"), an ARMORED elite Husk with a steel aura approaching from the top-right with an edge arrow indicator. HUD at 100% scale, 24 px margins: top-left HP bar "87/120" (fill #5E0E14 on #14121C track, 2 px border #2E3136) and XP bar (#F5B04A) with "LV 9"; top-center "ROUND 14" and "0:37" in pixel display font; top-right "⟡ 142" gold and "☠ 85" souls in #F5B04A; bottom-left current weapon "RUSTED SWORD" icon with 4 tier pips (2 lit), then 6 item icons 32 px in rarity frames (bone/green/blue/red) with small counters. Nothing covers the hero. Iron riveted panels, no rounded corners, no HUD gradients. Pixel voxel style per the Grim Cubes bible, never cute.
```

```text
[DESKTOP 1440p] Same scene as the 1080p screenshot but at 2560×1440: identical HUD elements scaled 125%, 32 px margins, and noticeably MORE of the battlefield visible around the hero (wider view of the horde), same fixed isometric camera. Pixel voxel style, Grim Cubes palette, never cute.
```

```text
[WEB] Mockup 16:9 of the Grim Cubes DEMO running inside a desktop web browser window (generic dark browser chrome, tab titled "Grim Cubes — Demo", URL bar showing "grimcubes.com"): the game canvas fills the viewport with the same mid-combat scene and HUD as the desktop screenshot, plus a small "DEMO" badge in #F5B04A at the top-right corner of the HUD. Browser chrome must be generic (no real browser logos). Pixel voxel style, Grim Cubes palette.
```

```text
[MOBILE] In-game screenshot of Grim Cubes on an Android phone in LANDSCAPE, viewport 896×414 (~6.1" phone), rendered as a phone mockup with thin bezels: same fixed isometric combat scene (hero centered, ~40 enemies, wider aspect shows more ground left/right). Touch HUD: a floating virtual joystick (iron base 96 px at 50% opacity, bone knob) at the lower-left where a thumb would rest; DASH and PAUSE square buttons (48 px, iron panels, rivets) at the lower-right; compact HP/XP bars top-left inside the safe area (24 px), "ROUND 14 · 0:37" top-center, gold/souls top-right; weapon + items strip tiny at bottom-center. Minimum text 13 px. Nothing covers the hero. Pixel voxel style, Grim Cubes palette, never cute.
```

```text
[MOBILE small] Same as the 896×414 mobile screenshot but for an 800×360 viewport (~6.5" budget Android): slightly tighter HUD, same elements, text never below 13 px, joystick and buttons at least 48 px. Phone mockup, landscape.
```

## 7. Telas de UI (menu, loja, level-up, Ossuário, resultado, opções, demo)

Cada prompt abaixo tem 3 versões: `[DESKTOP]` 1920×1080, `[WEB]` (mesma tela dentro de um browser genérico com selo "DEMO"), `[MOBILE]` 896×414 em mockup de telefone landscape. Para gerar as versões WEB e MOBILE, acrescente ao final do prompt DESKTOP a frase correspondente:

- WEB: `Render it inside a generic dark desktop browser window (tab "Grim Cubes — Demo", URL "grimcubes.com"), with a small "DEMO" badge in #F5B04A at the top-right of the screen.`
- MOBILE: `Render it as a landscape Android phone mockup at 896×414: layouts collapse to horizontally scrollable rows/tabs, all touch targets at least 48 px, text at least 13 px, 24 px safe-area margins.`

### 7.1 Menu principal

```text
[DESKTOP] Main menu screen of Grim Cubes, 1920×1080. Background: a slow in-engine scene of the Headsman standing in the fog of the Sunken Cemetery, hordes as silhouettes, ember forge glow far right, fog #14121C, vignette. Left third: the logo "GRIM CUBES" (pixel display font, bone #D9C9A3, 1 px night shadow) and a vertical list of iron riveted buttons (#5A5F66, 2 px #2E3136 border, no rounded corners): "PLAY", "OSSUARY", "RECORDS", "OPTIONS", "QUIT"; the focused button has an ember (#E07A2A) border and ember-light text. Bottom-left tiny pixel text "v1.0.0". Bottom-right souls counter "☠ 1,250" in #F5B04A. Design system: night-2 (#1C1926) panels at 85% opacity, pixel font, no gradients, no rounded corners. Never cute.
```

### 7.2 Loja (fim de round)

```text
[DESKTOP] Shop screen of Grim Cubes between rounds, 1920×1080, overlay on a dimmed, blurred-free (sharp but darkened to 70%) battlefield. Top: title "THE BONE MERCHANT — ROUND 14" in pixel display font; at the left a tall riveted iron panel with the animated portrait of the Bone Merchant (blocky skeleton in leather cloak, one ember eye) and his line "Spend it before you bleed it." Center: four item cards 220×300 px side by side, each an iron panel with a 32 px pixel-art item icon inside a rarity frame (Common bone #D9C9A3, Uncommon sludge #6B8F3A, Rare cold blue #4C7FB8, Legendary blood #8E1A1F), item name in pixel font, effect text in a clean sans 14 px, price with a gold fragment icon "⟡ 50"; one card shows a LOCK padlock icon in #F5B04A at the corner; one price is in blood-light red (unaffordable). Right: hero stats panel listing 12 stats with green/red deltas on hover ("Armor 12 → 15"). Bottom bar: "REROLL ⟡ 11", current weapon "RUSTED SWORD ★★☆☆ — UPGRADE ⟡ 55", and a large ember button "NEXT ROUND". Gold "⟡ 142" top-right. No rounded corners, no gradients, iron rivets at panel corners. Grim Cubes palette, never cute.
```

### 7.3 Level-up

```text
[DESKTOP] Level-up screen of Grim Cubes, 1920×1080: the battlefield frozen behind a #14121C overlay at 70%, slight 5% zoom on the hero. Center: three cards 220×300 px in iron riveted panels, each with a 32 px pixel icon, a title in pixel font and a value: "+5 MAX HP", "+4% DAMAGE", "+3% CRIT"; small keycaps "1", "2", "3" at the top-left corner of each card; the middle card is focused with an ember border and raised 4 px. Left: compact current stats list. Top: "LEVEL 10". Palette and design system of Grim Cubes, no rounded corners, no gradients, never cute.
```

### 7.4 Ossuário (meta-árvore)

```text
[DESKTOP] The OSSUARY screen of Grim Cubes, 1920×1080: a dark crypt interior (#1C1926 stone, bone piles, candles with ember flames) and, centered, a radial skill tree around a large cube skull: five branches of six bone-shaped nodes each — FLESH (top, blood tint), STEEL (right, iron), SHADOW (bottom-right, cold shadow #2B2340 with blue), GOLD (bottom-left, ember-light), RUIN (left, rust). Purchased nodes glow ember (#E07A2A) like lit runes; locked nodes are dark bone with a small padlock; the hovered node shows a tooltip panel "ARMOR +3 — ☠ 200". Top-right souls "☠ 1,250" in #F5B04A; bottom: "RESET (refunds 100%)" and "BACK" iron buttons. Pixel font, riveted iron panels, no rounded corners, Grim Cubes palette, never cute.
```

### 7.5 Tela de resultado (morte)

```text
[DESKTOP] Results screen of Grim Cubes after death, 1920×1080: the fallen hero's blocky body on the ground behind a 70% #14121C overlay; big pixel title "YOU DIED — ROUND 23"; a two-column iron panel: left "KILLS 1,842 · DAMAGE DEALT 96,210 · DAMAGE TAKEN 1,330 · KILLED BY: THE SWAMP MATRIARCH"; right "FINAL BUILD": weapon "IRON PISTOL ★★★☆" and 9 item icons in rarity frames; bottom: "SOULS EARNED ☠ +615" in #F5B04A with a counting-up feel, seed "SEED 8F3A-21C9" in pixel mono, buttons "OSSUARY" and "RETRY". No rounded corners, no gradients, Grim Cubes palette, never cute.
```

### 7.6 Intro de chefe e barra de chefe

```text
[DESKTOP] In-game boss intro of Grim Cubes, 1920×1080: the camera pulled back 20% on the Infernal Forge biome; THE FORGEMASTER (6 m black-iron golem with ember veins) stepping out of the forge fire while common enemies freeze; a wide boss HP bar (28 px) at the top-center, 60% screen width, with the name "THE FORGEMASTER" in 24 px pixel font and three phase tick marks; the bar's border pulsing blood-light (#8E1A1F) to show ENRAGE ×1; hero small and centered. Regular HUD elements remain at the corners. Grim Cubes palette, cubes and quads only, never cute.
```

### 7.7 Opções

```text
[DESKTOP] Options screen of Grim Cubes, 1920×1080: a large riveted iron panel with four tabs at the top "VIDEO · AUDIO · GAMEPLAY · CONTROLS" (active tab underlined 2 px ember). VIDEO tab shown: rows with labels in pixel font and controls: "PRESET" selector "HIGH", "RENDER SCALE" slider (2 px track, 16 px cube knob) "100%", "FULLSCREEN" toggle (40×20 track, cube knob ember-light when on), "VSYNC" toggle, "GORE" toggle ON, "SCREEN SHAKE" toggle, "FLASH" toggle, "UI SCALE" selector "100% / 125% / 150%", "COLORBLIND MODE" toggle. Bottom: "BACK" and "APPLY" buttons. #1C1926 panel at 85%, 2 px #2E3136 borders, no rounded corners, never cute.
```

### 7.8 Fim da demo

```text
[DESKTOP] "End of demo" screen of Grim Cubes, 1920×1080: behind a 70% night overlay, the dead GRAVEDIGGER boss shattered into cubes; central iron panel with pixel title "THE DEMO ENDS HERE", subtitle in sans 16 px "Round 10 conquered. 40+ rounds, 4 more bosses, 40 items and the full Ossuary await.", a summary row "ROUND 10 · KILLS 612 · SOULS ☠ +285", two large ember CTA buttons "BUY ON STEAM" and "GET IT ON GOOGLE PLAY" (generic text, no store logos), and a smaller bone-colored "CONTINUE TO OSSUARY (LIMITED)". "DEMO" badge top-right in #F5B04A. No rounded corners, no gradients, never cute.
```

## 8. Folhas de design system e componentes

```text
UI component sheet, 16:9, for Grim Cubes' design system on a #14121C background with a 4 px pixel grid: rows of components with labels in pixel font — PANEL (night-2 #1C1926 at 85%, 2 px iron-dark #2E3136 border, 4 px iron-light rivets at corners); BUTTON in states default / hover (ember border #E07A2A, ember-light text) / active (1 px pressed) / focus (2 px ember outline) / disabled (mist #3F3A52 at 50%), sizes 32/40/48 px; ICON BUTTON 40 and 48 px; HP BAR and XP BAR 20 px (two-tone fill with a 2 px lighter top line, number centered); BOSS BAR 28 px with phase ticks; ITEM CARD 220×300 with rarity frames in bone/sludge/cold blue/blood; TOOLTIP with an 8 px cube arrow; TOAST; TABS; TOGGLE 40×20 with cube knob; SLIDER with cube knob; KEYCAP 24 px; CURRENCY BADGE "⟡ 142" and "☠ 85" in #F5B04A; VIRTUAL JOYSTICK 96/40 px. Typography samples: pixel display font at 8/16/24/32/48 px and a clean sans at 13/14/16/18 px. No rounded corners anywhere, no gradients, crisp pixels.
```

```text
Icon sheet, 1:1, 8×8 grid of 32×32 px pixel-art item icons for Grim Cubes on #1C1926, one object per icon, bone/iron/rust/blood/ember palette, 1 px night outline, no anti-aliasing: rusted plate, grave dirt, whetstone, bone charm, tattered boots, scavenger hook, ember vial, lead bullets, cracked skull, iron tooth, black bandage, chain mail, hunter eye, leech tongue, swamp lantern, rat king, gunpowder keg, cursed coin, war drum, heavy gauntlet, grim pact, iron lung, vampire fang, shadow cloak, executioner mark, brimstone heart, bone saw, tithe box, spiked boots, hellfire round, crown of nails, heart of the pit, reaper hourglass, doom sigil, phylactery, blood altar, warlord banner, cube of wrath, soul jar, gilded skull. Labels below each in tiny pixel font.
```

```text
Weapon sheet, 16:9, Grim Cubes voxel style on #1C1926: five weapons as held props built from cubes with 64 px/m pixel textures, each shown in 4 tiers left to right with increasing ornamentation and an ember glow on tier 4 — RUSTED SWORD, IRON PISTOL, SUBMACHINE GUN, HEAVY MACHINE GUN, SCRAP BAZOOKA. Tier frames under each in bone / sludge green / cold blue / blood red. Labels in pixel font. No gradients, no pure white/black, never cute.
```

## 9. Trailer e marketing (opcional)

```text
Storyboard sheet, 16:9, six panels for a 60-second Grim Cubes trailer in the game's voxel style: 1) fog and tombstones, the Headsman alone; 2) horde pouring from all sides, HUD "ROUND 1"; 3) shop with the Bone Merchant; 4) elite with steel aura, legendary chest; 5) "ROUND 10" — the Gravedigger rises; 6) title card "GRIM CUBES — Stand. Fight. Die. Return." with "DEMO AVAILABLE" in #F5B04A. Pixel font captions under each panel, Grim Cubes palette, never cute.
```

## 10. Suposições

- O gerador do ChatGPT Plus não garante hex exatos nem fontes específicas; os prompts citam hex para aproximar a paleta e "pixel display font" para aproximar o estilo. A validação final é visual, contra o Art Bible.
- Textos de UI nos prompts estão em inglês (idioma padrão do jogo); versões pt-BR podem ser geradas trocando as strings.
- Os mockups de browser e telefone são genéricos para evitar marcas (Art Bible §13).
