# Grim Cubes — Game Design Document (GDD)

Versão 0.1.0 — 2026-10-31. Fonte das decisões: `docs/brainstorming.md` (D01–D30). Fonte dos números de referência: `docs/web-search.md`.

Convenções deste documento:

- Números marcados como **baseline** vêm de referências públicas (Brotato, Vampire Survivors) e são ponto de partida para playtest, não valores finais.
- Números marcados como **proposta** são do Diretor; precisam de validação por simulação (ver §25).
- Identificadores técnicos (`snake_case` ou `camelCase`) são os nomes que o código deve usar.
- "Unidade" (u) = 1 metro no mundo = 1 cubo de terreno.

## Sumário

1. [Visão](#1-visão)
2. [Pilares de design](#2-pilares-de-design)
3. [Loop central e metaloop](#3-loop-central-e-metaloop)
4. [Controles e acessibilidade](#4-controles-e-acessibilidade)
5. [Câmera](#5-câmera)
6. [Mundo procedural](#6-mundo-procedural)
7. [Herói](#7-herói)
8. [Combate](#8-combate)
9. [Armas](#9-armas)
10. [Inimigos comuns](#10-inimigos-comuns)
11. [Elites](#11-elites)
12. [Chefes](#12-chefes)
13. [Rounds e dificuldade](#13-rounds-e-dificuldade)
14. [Stats](#14-stats)
15. [Itens e raridades](#15-itens-e-raridades)
16. [Level-up](#16-level-up)
17. [Loja](#17-loja)
18. [Economia](#18-economia)
19. [Meta-árvore (Ossuário)](#19-meta-árvore-ossuário)
20. [Progressão e desbloqueios](#20-progressão-e-desbloqueios)
21. [UI e HUD](#21-ui-e-hud)
22. [Áudio](#22-áudio)
23. [Juice e feedback](#23-juice-e-feedback)
24. [Plataformas, demo e monetização](#24-plataformas-demo-e-monetização)
25. [Balanceamento e simulação](#25-balanceamento-e-simulação)
26. [Métricas de sucesso e telemetria](#26-métricas-de-sucesso-e-telemetria)
27. [Glossário](#27-glossário)

## 1. Visão

**Elevator pitch.** Grim Cubes é um roguelite de sobrevivência em ondas, em 3D voxel, onde um único guerreiro enfrenta hordas infinitas num mundo procedural sem bordas. A cada 10 rounds, um chefe. A cada morte, almas para fortalecer a próxima run. É Brotato encontrando DOOM: The Dark Ages num mundo de cubos.

**Gênero.** Survivor-like / bullet heaven, roguelite, com camada RPG (stats, itens, raridades, meta-árvore).

**Público.** Jogadores de Brotato, Vampire Survivors, Halls of Torment e Deep Rock Galactic: Survivor que querem o mesmo loop com profundidade 3D, tom sombrio e sensação de guerra contra uma horda. Secundário: jogadores de Minecraft/Roblox atraídos pelo visual cúbico, maiores de idade (classificação M/18).

**Sessão alvo.** Uma run de 15 a 30 minutos (rounds 20–30). Sessões de 5 minutos são possíveis (morte cedo + meta-árvore).

**Plataformas.** 1.0: Steam (Windows 11) + demo web. 1.1: Android (Google Play). Ver §24.

**Referências diretas.** Brotato (estrutura de rounds, loja, stats), Vampire Survivors (XP por gemas, level-up), Hades (meta-progressão com identidade narrativa), DOOM: The Dark Ages (tom, "stand and fight"), Warhammer 40k (grimdark, maquinaria, caveiras), Alien/Predator (biomecânica, caça, luz dura).

## 2. Pilares de design

| # | Pilar | O que significa na prática | Teste de aderência |
| --- | --- | --- | --- |
| P1 | Progresso contínuo | Nunca passam 60 s sem o jogador ganhar algo (XP, ouro, item, almas, desbloqueio) | Telemetria: intervalo médio entre recompensas < 60 s |
| P2 | Sombrio e brutal | Sangue escuro, execuções, som pesado, sem humor cartunesco | Revisão de arte e áudio contra o Art Bible §13 "O que evitar" |
| P3 | Profundidade com legibilidade | Stats, raridades e meta-árvore existem, mas cada decisão cabe numa tela e em 10 s | Toda escolha mostra no máximo 3 opções e 3 linhas por opção |
| P4 | Horda de todos os lados | Mundo sem bordas, spawn em 360°, nunca um corredor seguro | Nenhum ponto do mapa fica sem spawn por mais de 10 s num round comum |
| P5 | Tudo roda em todo lugar | 60 fps em desktop médio com 100 inimigos; 30 fps estáveis em Android de entrada | Benchmarks do ROADMAP |

## 3. Loop central e metaloop

### 3.1 Loop de segundos (combate)

1. O herói se move (único input obrigatório); a arma ataca sozinha o alvo mais próximo em alcance.
2. Inimigos surgem fora da tela em todas as direções e convergem.
3. Inimigos morrem, soltam **fragmentos** (material = ouro + XP) e sangue.
4. O herói coleta fragmentos ao passar perto (raio de pickup).
5. Ao encher a barra de XP: pausa, escolha 1 de 3 cartas de stat, volta.
6. Timer do round chega a zero: inimigos restantes morrem (sem drop), fragmentos não coletados vão para a Bolsa.

### 3.2 Loop de minutos (round)

1. Fim do round: tela de loja (NPC "Mercador de Ossos"). Compra de itens, upgrade de arma, troca de arma, reroll, lock.
2. Fechar a loja inicia o próximo round com transição de 3 s ("Round N" + número do bioma).
3. A cada 10 rounds: round de chefe (sem timer, horda reduzida).
4. Round comum sorteia elite (20%, com pity).

### 3.3 Loop de horas (metaloop)

1. Morte: tela de resultado (round, kills, dano, causa da morte, almas ganhas).
2. Almas vão para o **Ossuário** (meta-árvore permanente, §19).
3. Marcos desbloqueiam dificuldades, itens novos no pool, chefes alternativos e, pós-1.0, personagens.
4. Nova run com herói mais forte e pool maior.

### 3.4 Fantasia do jogador

"Eu sou o último muro entre o inferno e o nada." O jogador deve sentir que cada round sobrevivido é uma vitória contra probabilidades crescentes, que o build dele importa, e que morrer ainda rende progresso.

## 4. Controles e acessibilidade

### 4.1 Mapeamento

| Ação | Teclado/Mouse | Gamepad (XInput) | Touch (Android) |
| --- | --- | --- | --- |
| Mover | WASD / setas | Stick esquerdo | Joystick virtual flutuante (esquerda) |
| Dash (se desbloqueado na meta-árvore) | Espaço / Shift | A / RB | Botão à direita |
| Pausar | Esc / P | Start | Botão de pausa no HUD |
| Confirmar / Selecionar carta | Clique / Enter | A | Toque |
| Reroll na loja | R | Y | Botão |
| Lock de item | Clique direito | X | Toque longo |
| Fechar loja / próximo round | Enter / botão | Start | Botão |

Não há mira manual (D06). Não há rotação de câmera (D17).

### 4.2 Acessibilidade (1.0)

- Toggle de gore (D23): reduz sangue e desativa desmembramento.
- Toggle de screen shake e de flash.
- Escala de UI: 100% / 125% / 150%.
- Remapeamento de teclas e botões.
- Modo daltônico: paleta alternativa para raridades e auras de elite (ver Art Bible §3).
- Pausa real a qualquer momento (jogo single-player).

## 5. Câmera

Decisão D17: perspectiva com FOV baixo, ângulo fixo, segue o herói.

| Parâmetro | Valor inicial (proposta) | Faixa de ajuste |
| --- | --- | --- |
| Tipo | `ArcRotateCamera` com controles desligados | — |
| Alpha (rotação horizontal) | −π/2 (norte para cima na tela) | fixo |
| Beta | 0,611 rad (elevação 55°; o `beta` do `ArcRotateCamera` é medido a partir do zênite: beta = π/2 − elevação) | 0,524–0,698 rad (elevação 50°–60°) |
| FOV vertical | 0,52 rad (≈30°) | 25°–35° |
| Raio (distância ao alvo) | 38 u | 32–44 u (zoom leve com scroll, opcional) |
| Alvo | posição do herói suavizada (lerp 8/s) | — |
| Área visível no chão (16:9, raio 38) | trapézio: profundidade 25,6 u (−10,4 a +15,2 u do herói); largura 30,3 / 35,9 / 44,2 u (borda de baixo / altura do herói / borda de cima); raio 34 → profundidade 22,9 u | — |
| Mobile (9:16 ou 16:9 landscape forçado) | landscape obrigatório; raio 34 u | — |

Regras:

- O herói fica no centro vertical da tela (crítica a YAZS em `docs/web-search.md` §3.7).
- Nada entre a câmera e o herói: props altos próximos ao herói ficam translúcidos (fade de material) ou são evitados pela geração (nenhum prop com altura > 2 u num raio de 3 u do spawn).
- Inimigos fora da tela não são renderizados, mas continuam simulados dentro de um raio de 40 u.

## 6. Mundo procedural

Decisão D16: terreno plano com props por chunk, biomas por distância do spawn. Sem bordas.

### 6.1 Chunks e seed

| Item | Valor (proposta) |
| --- | --- |
| Tamanho do chunk | 16 × 16 u |
| Anel carregado | raio 3 chunks (7 × 7 = 49 chunks, 112 × 112 u) |
| Anel simulado para spawn | chunks a até 2 do herói |
| Seed | 32 bits; `seed_run` sorteada por run e mostrada na tela de resultado; pode ser digitada no menu (runs diárias pós-1.0) |
| PRNG | `hash(seed_run, cx, cz)` → `mulberry32` por chunk (determinístico, sem estado global) |
| Ruído | `simplex-noise` 2D para densidade de props e variação de cor do chão |
| Origin shifting | quando `abs(pos.x)` ou `abs(pos.z)` > 1.024 u, desloca tudo e grava offset (precisão de float) |

### 6.2 Biomas por distância

Distância euclidiana do ponto de spawn da run. Biomas em anéis, com borda misturada de 16 u.

| Anel | Distância (u) | Bioma | Chão | Props típicos | Inimigos nativos |
| --- | --- | --- | --- | --- | --- |
| 0 | 0–120 | Cemitério Afundado | terra cinza, lápides | lápides, árvores mortas, cercas de ferro, criptas | Carcaças, Lamentos |
| 1 | 120–260 | Pântano de Ossos | lodo verde-escuro | ossadas gigantes, água rasa (decorativa), totens | Afogados, Sanguessugas |
| 2 | 260–420 | Forja Infernal | pedra negra com veios laranja | bigornas, correntes, caldeirões, torres de metal | Forjados, Vigias |
| 3 | 420+ | Ninho Biomecânico | carne/metal escuro | ovos, costelas de metal, tubos | Caçadores, Reprodutores |

O anel 3 repete-se ao infinito (mais escuro, com variação de props). Biomas afetam **pool de spawn** e **visual**; não afetam stats base (a dificuldade vem do round). Jogador que anda muito "escolhe" inimigos mais perigosos: Caçadores são mais rápidos.

### 6.3 Props e colisão

- Props bloqueantes (lápides, bigornas, ossadas): colisão circular no plano XZ, raio 0,5–1,5 u. Inimigos desviam por steering simples (sem pathfinding global).
- Props decorativos (grama, ossos pequenos): sem colisão.
- Densidade: 4 a 8 props bloqueantes por chunk (D3: com a regra de corredor numa grade 4×4 cabem no máximo 8); nunca formam corredor fechado (regra: no máximo 2 props bloqueantes adjacentes).
- Destrutíveis: 1 a 2 por chunk (caixote, urna); dropam 1–3 fragmentos ou 1 consumível.

### 6.4 Spawn

- Inimigos nascem fora da tela, num anel de 22–30 u do herói, em ângulo aleatório, com viés: 60% dos spawns sorteados no hemisfério oposto ao movimento do herói e 40% uniformes (≈ 80% no hemisfério oposto no total) (sensação de "cercado").
- Spawn em rajadas: a cada 1,5 s nos rounds iniciais, caindo para 0,6 s no round 20+ (ver §13).
- Cap de inimigos simultâneos: 100 (baseline Brotato). Se o cap for atingido, o próximo spawn mata o inimigo comum mais distante sem drop.

## 7. Herói

1.0 tem um único herói (D11): **o Carrasco** (nome de trabalho), um executor condenado, com armadura de placas enferrujadas e um capuz de ferro.

### 7.1 Stats base (round 1, sem meta-árvore)

| Stat | Valor | Nota |
| --- | --- | --- |
| HP máximo | 100 | regen 0 |
| Velocidade | 6 u/s | — |
| Raio de pickup | 2,5 u | — |
| Armadura | 0 | — |
| Esquiva | 0% | — |
| Crítico | 5% / ×2,0 | — |
| Dano % | 0% | multiplicador global |
| Velocidade de ataque % | 0% | — |
| Sorte | 0 | — |
| Colheita | 0 | — |
| Arma inicial | Espada Enferrujada (Comum) | — |
| Slots de item | ilimitados (itens são passivos) | — |

### 7.2 Movimento

- Aceleração instantânea, parada instantânea (precisão). Sem inércia.
- Dash (desbloqueável no Ossuário): 4 u em 0,15 s, i-frames 0,2 s, recarga 3 s.
- Colisão herói vs inimigo: o herói é empurrado levemente; dano por contato com cooldown de 0,5 s por inimigo.

## 8. Combate

### 8.1 Mira e alvo

- A arma escolhe o inimigo mais próximo dentro do alcance; chefes e elites têm prioridade +20% (distância efetiva ×0,8).
- Armas de fogo giram para o alvo (visual); a espada ataca em arco frontal na direção do alvo.
- Sem alvo em alcance: a arma não ataca (economia de projéteis não existe; só visual).

### 8.2 Dano

```text
dano_final = dano_base_arma(tier)
           × (1 + dano_% / 100)
           × (crit ? mult_crit : 1)
           × (1 + bonus_vs_tipo)
dano_recebido = dano_inimigo × 100 / (100 + armadura × 6,66)   # baseline Brotato (aprox.)
```

- Armadura negativa é permitida (itens com maldição): aumenta dano recebido de forma simétrica e limitada, `dano_recebido = dano_inimigo × (2 − 100 / (100 + |armadura| × 6,66))` (×1,40 em −10, nunca ×2). A forma literal acima diverge em armadura ≈ −15 (decisão do Orq em 2026-10-31, revisável pelo PO).
- Esquiva: rolagem por hit, cap 60%.
- I-frames do herói após hit: 0,3 s.
- Knockback: toda arma tem valor em u; aplicado ao inimigo por 0,1 s. Chefes: ×0,1; elites ×0,5. O stat `knockback` multiplica o empurrão de todo acerto do herói por (1 + valor).
- Regeneração: o herói vivo cura `regen(p) = 0,2 × min(p, 1) + 0,09 × max(0, p − 1)` HP/s, com `p` = pontos de `hp_regen` (fracionários valem, ex.: 0,5 → 0,1 HP/s; 1,5 → 0,245 HP/s), aplicada a cada passo e nunca acima do HP máximo. Decisão do Orq em 2026-10-31: fórmula contínua para cartas fracionárias (hoje +0,25); com pontos inteiros dá o mesmo que a regra do Brotato.
- `enemy_speed`: multiplica por (1 + valor) a velocidade de movimento dos inimigos comuns e das elites. Não afeta chefes, por decisão do Orq em 2026-10-31: o ritmo dos padrões do chefe faz parte do design.

### 8.3 Números de dano e feedback

- Números flutuantes por hit (branco; amarelo em crítico; vermelho em dano recebido). Tamanho escala com dano até ×1,5.
- Flash branco no inimigo por 2 frames; hit-stop de 30 ms em crítico e 80 ms em kill de elite/chefe (proposta; calibrar).
- Ver §23.

## 9. Armas

Decisão D07/D08: uma arma por vez. Comprar outra substitui (a antiga é vendida automaticamente por 50% do preço pago). Cada arma tem 4 tiers; o upgrade de tier é comprado na loja (§17).

### 9.1 Roster da 1.0

| ID | Nome | Tipo | Alcance (u) | Ataques/s | Dano base T1 | Projétil | Knockback | Especial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sword` | Espada Enferrujada | corpo a corpo, arco 130° | 3,2 | 1,4 | 12 | — | 1,5 u | Acerta todos no arco |
| `pistol` | Pistola de Ferro | tiro único | 12 | 2,0 | 10 | 1, perfura 0 | 0,5 u | +15% crítico |
| `smg` | Submetralhadora | rajada | 10 | 8,0 | 4 | 1, dispersão 6° | 0,2 u | Dano ×1,3 em alvo < 4 u |
| `mg` | Metralhadora Pesada | contínuo | 14 | 12,0 | 3 | 1, dispersão 10° | 0,3 u | −20% velocidade do herói enquanto atira |
| `bazooka` | Bazuca de Sucata | explosivo | 16 | 0,6 | 45 | 1, explosão raio 3 u | 3,0 u | Dano em área, 50% no herói se dentro do raio |

Multiplicador por tier (**baseline** Brotato aproximado): T1 ×1,0; T2 ×1,5; T3 ×2,2; T4 ×3,2 no dano. Cada tier também dá +10% de velocidade de ataque e +0,5 u de alcance.

### 9.2 Preços

| Arma | Preço base (T1) | Upgrade T1→T2 | T2→T3 | T3→T4 |
| --- | --- | --- | --- | --- |
| Espada | 0 (inicial) / 15 | 25 | 55 | 120 |
| Pistola | 20 | 30 | 65 | 140 |
| Submetralhadora | 45 | 45 | 95 | 200 |
| Metralhadora | 90 | 70 | 150 | 320 |
| Bazuca | 140 | 90 | 190 | 400 |

Preços passam pela fórmula de escalonamento por round (§17.2). Números são **proposta**.

### 9.3 Disponibilidade

- Espada: sempre.
- Pistola e Submetralhadora: na loja desde o round 1.
- Metralhadora: a partir do round 4.
- Bazuca: a partir do round 7.
- Pós-1.0: armas desbloqueáveis por marcos (foice, lança-chamas, rifle de plasma).

## 10. Inimigos comuns

### 10.1 Escalonamento (baseline Brotato, linear)

```text
hp(N)   = hp_base   + (N - 1) × hp_inc
dano(N) = dano_base + (N - 1) × dano_inc
velocidade: constante por tipo (não escala)
```

Multiplicador de dificuldade (D13) aplicado ao final: Normal ×1,0; Grim ×1,25; Nightmare ×1,5.

Balanceamento A-02-03 (2026-10-31): os valores da tabela abaixo saíram do simulador (`bun run sim`, bot greedy, relatório em `reports/balance-a0203-final.json`): o dano base caiu para ~20% e o crescimento de dano por round para ~172% do proposto antes (1,6 × 1,15 × 0,94) e o HP por round para ~162% (1,5 × 1,15 × 0,94; as passadas seguintes compensaram o Frasco de Sangue e os breakables da A-02-04 e o preço dos itens), porque com os números antigos o herói simulado morria no round 8–10 (Coveiro em 15 s, p50 de morte 8). Os números continuam só em `data/enemies.json`.

### 10.2 Roster da 1.0 (8 tipos)

| ID | Nome | Bioma | HP base | HP/round | Dano base | Dano/round | Vel. (u/s) | Comportamento | Fragmentos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `husk` | Carcaça | 0 | 8 | +6,45 | 0,6 | +1,03 | 3,5 | persegue em linha reta | 1 |
| `wail` | Lamento | 0 | 4 | +3,22 | 0,4 | +0,69 | 5,5 | rápido, zigue-zague | 1 |
| `drowned` | Afogado | 1 | 20 | +14,5 | 1 | +1,55 | 2,8 | lento, tanque, empurra | 2 |
| `leech` | Sanguessuga | 1 | 6 | +4,84 | 0,4 | +0,86 | 4,5 | gruda e drena 1 HP/s | 1 |
| `forged` | Forjado | 2 | 35 | +22,57 | 1,4 | +1,89 | 3,0 | armadura 10 (reduz dano) | 3 |
| `watcher` | Vigia | 2 | 12 | +8,07 | 0,8 | +1,37 | 0 (fixo) | atira projétil lento a 10 u | 2 |
| `hunter` | Caçador | 3 | 18 | +12,9 | 1,2 | +1,72 | 6,5 | investida a cada 3 s | 2 |
| `breeder` | Reprodutor | 3 | 40 | +25,79 | 0 | 0 | 2,0 | solta 1 Lamento a cada 4 s | 4 |

Regra de mistura: um round usa 60% inimigos do bioma atual, 30% do anterior, 10% do próximo (se existir). No anel 0 não há "anterior": 80/20.

### 10.3 Contagem por round (proposta)

```text
inimigos_total(N)   = 20 + 12 × N          # round 1 = 32; round 10 = 140; round 20 = 260
intervalo_spawn(N)  = max(0,6, 1,5 - 0,045 × N)  s
tamanho_rajada(N)   = 2 + floor(N / 4)
```

O cap de 100 simultâneos segura o custo; o total define pressão e drops.

## 11. Elites

Decisão D08.

- Sorteio: no início de cada round comum (não múltiplo de 10), chance 20%. Pity: se 5 rounds comuns seguidos passarem sem elite, o 6º garante um. Round 1 nunca tem elite.
- Elite = tipo comum do bioma com um **modificador** visível (aura e escala ×1,6):

| Modificador | Efeito | Cor da aura |
| --- | --- | --- |
| Blindado | HP ×10, armadura +20 | cinza-aço |
| Veloz | HP ×8, velocidade ×1,6 | âmbar |
| Vampírico | HP ×10, cura 10% do dano causado | vinho |
| Explosivo | HP ×8, explode ao morrer (raio 3 u, dano 15 + 2N) | laranja |

- Recompensa: baú Lendário garantido (1 item Tier 4 à escolha entre 2) + 25 almas + cura 25 HP ao abrir.
- Entra 10 s após o início do round, com aviso sonoro e marcador na borda da tela.
- Se o round acabar com a elite viva, ela some sem recompensa (pressão).

## 12. Chefes

Decisão D02: roster de 3–5 chefes únicos; ordem fixa até o round 50; depois sorteio com modificadores de elite. Round de chefe sem timer; enrage a cada 60 s (+15% dano e velocidade, acumulativo). Horda reduzida continua (30% do spawn normal).

### 12.1 Roster e entrega por fase

| Round | Chefe | Fase de entrega | Arquétipo | HP base (round 10) | Padrões |
| --- | --- | --- | --- | --- | --- |
| 10 | O Coveiro | PROTÓTIPO | tanque lento com investida | 4.800 | investida em linha (telegrafada 1 s), golpe de pá em arco, invoca 6 Carcaças a 50% HP |
| 20 | A Matriarca do Pântano | ALPHA | invocadora | 12.500 | solta 3 Sanguessugas a cada 8 s, poça de lodo (lentidão), grito (knockback) |
| 30 | O Forjador | ALPHA | área e projéteis | 15.000 | martelo (onda de choque radial), lança correntes em 4 direções, fase 2 com armadura 30 |
| 40 | O Caçador Alfa | BETA | rápido, caça | 60.000 (provisório) | `stealth`: fica invisível 3 s (as armas não o miram) e ataca pelas costas; `leap`: salto com área; `thermal_vision`: persegue atravessando obstáculos |
| 50 | A Rainha do Ninho | BETA | dois estágios | 65.000 (provisório) | `eggs`: ovos destrutíveis que eclodem Caçadores; `sweep`: cauda em varredura; `fly_bomb`: na fase 2 (50% HP) voa e bombardeia |
| 60+ | sorteio do roster | — | — | HP(N) = HP_base_do_chefe × (1 + 0,35 × (N − round_original) / 10) | + 1 modificador de elite a partir do 60; 2 a partir do 100 |

HP escala com o multiplicador de dificuldade (D13). Dano de contato dos chefes: (3 + 0,18 × N) × multiplicador do chefe (Coveiro ×1, Matriarca ×2, Forjador ×2, Caçador Alfa ×1,5, Rainha ×2; `contactDamageMult` em `bosses.json`); projéteis 18 + 1,2 × N (**proposta**). Os padrões de área e projétil escalam esse contato: grito ×3, martelo ×4, correntes ×3. HP e dano saíram do simulador (A-02-03): com 1.200/2.800/5.000 os chefes caíam em 15–40 s. O HP do Caçador Alfa (60.000) e da Rainha do Ninho (65.000) é provisório, decisão do Orq em 2026-10-31, revisável pelo PO: o HP anterior do GDD (7.500 e 11.000) dava kill em 10–14 s no sim. O sorteio do roster começa no round 60 (`randomRosterFromRound` em `rounds.json`).

### 12.2 Regras gerais

- Entrada: 3 s de cinemática curta (câmera afasta 20%, nome em tela, fala de voz), inimigos comuns congelam.
- Barra de HP do chefe no topo do HUD, com marcadores de fase.
- Morte do chefe: execução (animação de 1,5 s, câmera aproxima), 100 + 10 × N almas, baú de chefe (2 itens Tier 3+ à escolha entre 3) e 1 ponto de upgrade de arma grátis.
- Demo: o Coveiro (round 10) está incluso (D04).

## 13. Rounds e dificuldade

### 13.1 Duração (D03, baseline Brotato)

| Round | Duração |
| --- | --- |
| 1 | 20 s |
| 2–8 | +5 s por round (25, 30, …, 55 s) |
| 9+ | 60 s |
| múltiplos de 10 (chefe) | sem timer; enrage a cada 60 s |

Tempo acumulado de combate (sem loja): round 10 ≈ 7,6 min; round 20 ≈ 16 min; round 30 ≈ 26 min. Com loja (~30 s por round), uma run até o 30 dura ~40 min; alvo de run média é 20–30 (D14).

### 13.2 Níveis de dificuldade (D13)

| Nível | Multiplicador HP/dano | Desbloqueio | Almas × |
| --- | --- | --- | --- |
| Fácil (`easy`) | ×0,75 | — | ×0,75 |
| Normal | ×1,0 | — | ×1,0 |
| Difícil (`grim`) | ×1,25 | — | ×1,5 |
| Nightmare | ×1,5 | chegar ao round 20 em Difícil | ×2,0 |

Decisão do PO (2026-10-31): numa run nova, Fácil, Normal e Difícil estão liberadas desde o início; só Nightmare é desbloqueio. A dificuldade vale até a run acabar (fica no checkpoint) e não há troca no meio dela. Os recordes são por dificuldade, com Fácil incluída. O id interno `grim` continua o mesmo; só o nome exibido muda para "Difícil".

### 13.3 Fim de round

- Timer zera: inimigos comuns restantes morrem em 1 s (sem drop); fragmentos no chão vão para a Bolsa (§18.1).
- Transição de 2 s, depois loja.
- Round de chefe termina ao matar o chefe; inimigos comuns restantes morrem.

## 14. Stats

Decisão D15: baseline Brotato, reduzido a 12 stats primários com caps explícitos. Todo item, carta de level-up e nó do Ossuário modifica apenas stats desta lista (ou efeitos especiais listados em §15.4).

| ID | Stat | Unidade | Efeito por ponto | Cap | Notas |
| --- | --- | --- | --- | --- | --- |
| `max_hp` | HP máximo | HP | +1 HP | — | base 100 |
| `hp_regen` | Regeneração | pontos | `0,2 × min(p, 1) + 0,09 × max(0, p − 1)` HP/s (§8.2; contínua, aceita frações) | — | baseline Brotato |
| `life_steal` | Roubo de vida | % | +1% do dano causado vira cura | 10 HP/s | 1 trigger a cada 0,1 s |
| `damage` | Dano | % | +1% dano | — | multiplicador global |
| `attack_speed` | Velocidade de ataque | % | +1% | 12 ataques/s | rendimentos decrescentes acima de +100% |
| `crit_chance` | Crítico | % | +1% | 100% | mult. crítico ×2,0 (itens podem subir) |
| `range` | Alcance | u | +0,1 u | — | corpo a corpo: +0,05 u |
| `armor` | Armadura | pontos | reduz dano recebido: `100 / (100 + 6,66 × armor)` | — | negativa permitida |
| `dodge` | Esquiva | % | +1% | 60% | — |
| `speed` | Velocidade | % | +1% da base (6 u/s) | +100% | mínimo −50% |
| `luck` | Sorte | pontos | +1% chance de tier melhor e de drop | — | ver §15.2 |
| `harvest` | Colheita | pontos | +1 fragmento no fim do round por ponto | — | cresce 5% por round (baseline) |

Stats secundários (só por itens): `pickup_range` (%), `xp_gain` (%), `shop_price` (%), `explosion_size` (%), `knockback` (%), `enemy_speed` (%), `boss_damage` (%), `free_rerolls`.

## 15. Itens e raridades

### 15.1 Raridades

| Tier | Nome | Cor (ver Art Bible §3) | Cor daltônico | Preço base típico |
| --- | --- | --- | --- | --- |
| 1 | Normal | osso `#D9C9A3` | ● | 15–25 |
| 2 | Raro | azul `#4C7FB8` | azul claro ◆ | 30–50 |
| 3 | Épico | roxo `#7A4FB8` | magenta ▲ | 60–100 |
| 4 | Lendário | laranja `#E07A2A` | laranja ★ | 120–200 |
| 5 | Mítico | amarelo `#F5D04A` | amarelo ✦ | 240–320 |

Decisão do PO (2026-10-31): cinco raridades na UI, `tier: 1..5` nos dados. Os nomes antigos (Comum, Incomum, Raro, Lendário) viram Normal, Raro, Épico e Lendário; os preços e as chances por tier de 15.2 continuam valendo até o Est atualizar os dados.

### 15.2 Chance por tier (baseline Brotato)

```text
chance(T, N) = clamp(base_T + inc_T × max(0, N - min_T + 1), 0, cap_T) × (1 + luck / 100)
T2: base 0, inc 6%/round,    cap 60%, min_round 2
T3: base 0, inc 2%/round,    cap 25%, min_round 4
T4: base 0, inc 0,23%/round, cap 8%,  min_round 8
T5: base 0, inc 0,06%/round, cap 1,5%, min_round 25
T1: o restante
```

Sorteio: testa T5, depois T4, depois T3, depois T2; o que sobrar é T1 (sem item do tier sorteado, a loja desce de tier). A sorte multiplica todas as chances como antes.

### 15.3 Pool da 1.0 (41 itens + 4 Míticos + 2 exclusivos do Ossuário)

Regeneração e auditoria de stats (2026-10-31): com `hp_regen`, `knockback` e `enemy_speed` aplicados de fato, o p50 do sim passou de 21 para 31 (alvo 18–26), e o 500×30 ficou na beira do penhasco (cerca de 50% das runs vivas no round 30). Rebalanceado só em dados: Atadura Negra, Coração do Abismo e Manto do Ossuário dão +0,5 regeneração (eram +2, +3 e +2), a carta de stat dá +0,25 regen (era +1) e a Ampulheta do Ceifador reduz a velocidade dos inimigos em 5% (era 20%). Resultado: 64 runs × 35 rounds com p50 23,5 e 500 × 30 com p50 24 (`reports/balance-audit-500x30.json`).

Tabela resumida; a tabela completa com todos os valores vive em `data/items.json` (fonte única, consumida pelo jogo e pelo simulador de balanceamento). Cada item é passivo e acumulável salvo indicação.

| ID | Nome | Tier | Efeito | Contra-efeito |
| --- | --- | --- | --- | --- |
| `rusted_plate` | Placa Enferrujada | 1 | +3 armadura | −2% velocidade |
| `grave_dirt` | Terra de Cova | 1 | +10 HP máx | — |
| `whetstone` | Pedra de Amolar | 1 | +5% dano | — |
| `bone_charm` | Amuleto de Osso | 1 | +5 sorte | — |
| `tattered_boots` | Botas Rasgadas | 1 | +6% velocidade | — |
| `scavenger_hook` | Gancho de Catador | 1 | +25% raio de pickup | — |
| `ember_vial` | Frasco de Brasa | 1 | +4% velocidade de ataque | — |
| `lead_bullets` | Balas de Chumbo | 1 | +15% knockback | — |
| `cracked_skull` | Crânio Rachado | 1 | +2 colheita | — |
| `iron_tooth` | Dente de Ferro | 1 | +3% crítico | — |
| `black_bandage` | Atadura Negra | 2 | +0,5 regen | — |
| `chain_mail` | Cota de Malha | 2 | +8 armadura | −5% velocidade |
| `hunter_eye` | Olho do Caçador | 2 | +1 u alcance, +5% crítico | — |
| `leech_tongue` | Língua de Sanguessuga | 2 | +3% roubo de vida | −5 HP máx |
| `swamp_lantern` | Lanterna do Pântano | 2 | +20% XP | — |
| `rat_king` | Rei dos Ratos | 2 | +15% chance de fragmento duplo | — |
| `gunpowder_keg` | Barril de Pólvora | 2 | +30% tamanho de explosão | — |
| `cursed_coin` | Moeda Maldita | 2 | −10% preços na loja | −5 sorte |
| `war_drum` | Tambor de Guerra | 2 | +10% velocidade de ataque | — |
| `heavy_gauntlet` | Manopla Pesada | 2 | +12% dano | −4% velocidade de ataque |
| `grim_pact` | Pacto Sombrio | 3 | +30% dano | −20 HP máx |
| `iron_lung` | Pulmão de Ferro | 3 | +40 HP máx | — |
| `vampire_fang` | Presa Vampírica | 3 | +6% roubo de vida | — |
| `shadow_cloak` | Manto de Sombra | 3 | +12% esquiva | — |
| `executioner_mark` | Marca do Carrasco | 3 | +25% dano vs chefes e elites | — |
| `brimstone_heart` | Coração de Enxofre | 3 | inimigos a < 2 u recebem 5 + N dano/s | — |
| `bone_saw` | Serra de Osso | 3 | críticos causam sangramento (20% dano em 2 s) | — |
| `tithe_box` | Caixa do Dízimo | 3 | +15% de fragmentos no fim do round | — |
| `spiked_boots` | Botas com Cravos | 3 | contato com inimigo causa 10 dano | — |
| `hellfire_round` | Munição Infernal | 3 | projéteis perfuram +1 inimigo | — |
| `crown_of_nails` | Coroa de Pregos | 4 | +50% dano, +20% crítico | −30% HP máx |
| `heart_of_the_pit` | Coração do Abismo | 4 | +100 HP máx, +0,5 regen | −15% velocidade |
| `reaper_hourglass` | Ampulheta do Ceifador | 4 | inimigos −5% velocidade | — |
| `doom_sigil` | Sigilo da Ruína | 4 | ao matar, 10% de explosão (raio 2 u, 30 + 3N) | — |
| `phylactery` | Filactério | 4 | revive 1× por run com 30% HP (não acumula) | — |
| `blood_altar` | Altar de Sangue | 4 | +1% dano por 1% de HP perdido | — |
| `warlord_banner` | Estandarte do Senhor da Guerra | 4 | +25% velocidade de ataque, +25% dano | preços +20% |
| `cube_of_wrath` | Cubo da Ira | 4 | a cada 50 kills, onda de choque (raio 6 u, 50 + 5N) | — |
| `soul_jar` | Jarro de Almas | 4 | +50% almas ao morrer | — |
| `gilded_skull` | Crânio Dourado | 4 | +20 sorte, +20% fragmentos | — |

Acréscimos de 2026-10-31 (pedido do PO):

| ID | Nome | Tier | Preço | Efeito | Contra-efeito |
| --- | --- | --- | --- | --- | --- |
| `bone_lodestone` | Ímã de Ossos | 3 | 120 | efeito `pull_fragments`: a cada 8 s puxa todos os fragmentos do chão até o herói (cada cópia tem o seu relógio) | — |
| `titan_core` | Núcleo do Titã | 5 | 280 | +200 HP máx, +12 armadura | −20% velocidade, −15% velocidade de ataque |
| `blood_crown` | Coroa de Sangue | 5 | 300 | +60% dano, +8% roubo de vida | HP máx ×0,6 |
| `storm_gauntlet` | Manopla da Tempestade | 5 | 320 | +50% velocidade de ataque, +25% crítico | −6 armadura |
| `void_cloak` | Manto do Vazio | 5 | 240 | +25% esquiva, +20% velocidade | HP máx ×0,75, −15% dano |

O Ímã de Ossos é o item comprável do consumível `bone_magnet` (§15.4, que só dropa); a lógica de puxar a cada 8 s é do S2 (`ItemEffects.pullFragmentsEverySeconds`). Os quatro Míticos seguem o padrão do pool (um ganho grande com um custo claro) e valem de 240 a 320 de preço base.

Exclusivos do Ossuário (entram no pool Lendário só com o nó `ruin_6`, `exclusiveTo` em `data/items.json`; não contam nos 40):

| ID | Nome | Tier | Efeito | Contra-efeito |
| --- | --- | --- | --- | --- |
| `ruin_chalice` | Cálice da Ruína | 4 | +30% dano | −20 HP máximo |
| `ossuary_mantle` | Manto do Ossuário | 4 | +8 armadura, +0,5 regeneração | −10% velocidade |

### 15.4 Consumíveis

Caem de destrutíveis e de elites: Frasco de Sangue (cura 20% HP imediato), Ímã de Ossos (puxa todos os fragmentos por 3 s). Não ficam no inventário; efeito ao pegar.

## 16. Level-up

Decisão D10: fragmentos dão XP e ouro ao mesmo tempo. Ao subir de nível, o jogo pausa e oferece 3 cartas; o jogador escolhe 1.

### 16.1 Curva de XP (proposta, inspirada em VS)

```text
xp_para_proximo(L) = 8 + 5 × (L - 1)   # XP para passar do nível L para L+1: 1→2 = 8, 10→11 = 53, 20→21 = 103 (A-02-03; era 10 + 8 × (L - 1))
xp_por_fragmento = 1 (×(1 + xp_gain/100))
```

Com ~32 fragmentos no round 1 e ~140 no round 10, espera-se nível ~4 no round 3 e ~15 no round 10. Alvo: 1 a 2 level-ups por round na faixa 5–20.

### 16.2 Cartas

Pool de cartas de stat (peso igual): +5 HP máx, +4% dano, +5% velocidade de ataque, +3 armadura, +4% velocidade, +3% crítico, +3% esquiva, +0,25 regen (0,05 HP/s sozinha, pela fórmula contínua de §8.2), +2% roubo de vida, +4 sorte, +1 colheita, +0,3 u alcance. A partir do nível 10, cartas "duplas" com 10% de chance (dois bônus menores: 2 cartas diferentes do pool, cada uma a 50% do valor; decisão do Orq de 2026-10-31). Reroll de cartas: não existe na 1.0 (simplicidade); nó do Ossuário pode dar 1 reroll por run.

## 17. Loja

Decisão D05: tela entre rounds no PROTÓTIPO; NPC físico no ALPHA (a tela vira o diálogo do Mercador de Ossos).

### 17.1 Estrutura

- 4 slots: cada um 35% arma / 65% item (baseline). Rounds 1–2: garantia de 1 arma + 3 itens. Round 3+: sem garantia.
- Slot de arma mostra: arma nova (substitui) ou upgrade de tier da arma atual (50% quando a arma atual não está no tier 4).
- Lock: grátis e ilimitado; item travado mantém preço e sobrevive ao próximo round.
- Reroll: fórmula abaixo.
- Venda: a arma antiga é vendida automaticamente na troca por 50% do preço pago. Itens não podem ser vendidos (são passivos).
- Mostra stats atuais do herói e o delta ao passar o mouse/tocar num item.

### 17.2 Fórmulas (baseline Brotato)

```text
preco(base, N)   = floor((base + N + base × 0,15 × N) × (1 + shop_price/100)), mínimo 1
reroll_inc(N)    = max(1, floor(0,4 × N))
reroll_1(N)      = floor(0,75 × N) + reroll_inc(N)
reroll_k(N)      = reroll_1(N) + (k - 1) × reroll_inc(N)     # reseta a cada loja
```

Exemplos: item base 20 no round 1 = 24; no round 10 = 60. Reroll no round 10: 11, 15, 19…

### 17.3 Mercador de Ossos (NPC)

- Visual: esqueleto alto com capa de couro e um carrinho de ossos; no ALPHA, surge parado a 6 u do herói ao fim do round (`rounds.json` `merchant.distance`), do lado oposto aos inimigos, com animação de "emerge do chão"; o herói anda até ele (A-05-01, decisão do Orq de 2026-10-31).
- Voz (D24): ~20 falas (saudação, compra, sem ouro, reroll, lock, despedida, round de chefe à frente).
- Pós-1.0: ofertas especiais do Mercador (1 item Lendário com desconto a cada 10 rounds).

> Velocidade do jogo (decisão do PO em 2026-10-31, para testes): 1x, 2x ou 3x em Opções > Gameplay, no botão do HUD e na tecla TAB (o PO pediu o TAB explicitamente; no HUD o foco por teclado vai pelas Opções). A simulação roda mais passos fixos por frame, sem mudar o `STEP`, então o determinismo se mantém. Vale em todos os builds, inclusive a demo; recordes e almas de runs aceleradas contam normalmente (revisável pelo PO).

## 18. Economia

Decisão D12: ouro (run) e almas (persistente).

### 18.1 Ouro (fragmentos)

- Cada inimigo solta fragmentos conforme §10.2; valor 1 ouro + 1 XP cada.
- Chance de drop por inimigo (baseline): 100% até o round 4; depois `100 − 1,5 × N`, mínimo 50%.
- Bolsa: fragmentos não coletados ao fim do round entram na Bolsa e são soltos aos poucos no round seguinte (1 por spawn), nunca perdidos.
- Limite de 50 pilhas de fragmentos no chão; excedente soma na pilha mais próxima.
- Colheita: no fim do round, `harvest × (1 + 0,05 × N)` fragmentos extras (arredondado para cima).
- Ouro zera ao morrer (não vira almas, para evitar "guardar ouro").

### 18.2 Almas

Ganhas durante a run e creditadas ao morrer (ou ao abandonar a run, sem bônus de morte).

```text
almas_run = 5 × round_em_que_a_run_terminou
          + 25 × elites_mortas
          + (100 + 10 × N) por chefe morto no round N
          + bônus de dificuldade (Grim ×1,5; Nightmare ×2,0)
          + itens (soul_jar +50%)
```

Exemplos (Normal): morrer no round 12 com 1 elite e 1 chefe ≈ 60 + 25 + 200 = 285 almas. Run até o 30 com 3 chefes e 5 elites ≈ 150 + 125 + 900 (200 + 300 + 400) = 1.175 (exemplo corrigido em 2026-10-31 para bater com a fórmula).

## 19. Meta-árvore (Ossuário)

Decisão D09: árvore permanente fora da run, comprada com almas. Nome diegético: **Ossuário** (uma cripta onde o Carrasco grava runas em ossos).

### 19.1 Estrutura

5 ramos, 6 nós cada (30 nós na 1.0). Nós em sequência dentro do ramo (o nó k exige o nó k−1). Custo cresce por posição: 50, 100, 200, 350, 550, 800 almas (total por ramo 2.050; árvore inteira 10.250 ≈ 15–25 runs médias).

| Ramo | Tema | Nós (em ordem) |
| --- | --- | --- |
| Carne | sobrevivência | +10 HP máx; +1 regen; +3 armadura; +5% esquiva; +20 HP máx; Filactério fraco (revive 1× com 15% HP, só se não tiver o item) |
| Aço | dano | +5% dano; +5% velocidade de ataque; +5% crítico; +0,5 u alcance; +10% dano; mult. crítico ×2,3 |
| Sombra | mobilidade | +5% velocidade; Dash (desbloqueia); +25% raio de pickup; dash recarga −1 s; +10% velocidade; 2 cargas de dash |
| Ouro | economia | +1 colheita; −5% preços; +1 reroll grátis por loja; +10% fragmentos; +2 colheita; começa a run com 30 ouro |
| Ruína | meta | +10% almas; +10% XP; loja começa com 1 item Raro (tier 2) garantido; 1 reroll de cartas por run; +25% almas; pool Lendário +2 itens exclusivos |

### 19.2 Regras

- Reset total do Ossuário: permitido, devolve 100% das almas (sem punição; encoraja experimentar).
- A demo (D04) mostra o Ossuário completo, mas só os 2 primeiros nós de cada ramo são compráveis; o resto exibe cadeado "jogo completo".
- Pós-1.0: 6º ramo por personagem novo.

## 20. Progressão e desbloqueios

| Marco | Desbloqueia |
| --- | --- |
| Primeira morte | Ossuário abre |
| Round 10 vencido | Dificuldade (nada; só almas) e marcador de recorde |
| Round 20 em Difícil (`grim`) | Nightmare |
| 1.000 kills acumulados | item `cube_of_wrath` entra no pool |
| 10.000 kills | item `warlord_banner` entra no pool |
| 5 chefes mortos | item `executioner_mark` entra no pool |
| Round 50 | skin "Carrasco de Ferro Negro" (cosmético) |
| Pós-1.0 | personagens por marcos (Bruxa do Pântano: 3 Matriarcas mortas; Forjado Renegado: round 30 em Grim) |

Recordes mostrados no menu: maior round por dificuldade, total de kills, total de almas, chefes mortos.

## 21. UI e HUD

### 21.1 Telas

| Tela | Conteúdo | Fase |
| --- | --- | --- |
| Boot/Título | logo, "pressione para começar" (unlock de áudio), versão | PROTÓTIPO |
| Menu principal | Continuar (só se já houve um slot usado), Novo jogo, Ossuário, Recordes, Opções, Sair; selo "DEMO" quando aplicável | PROTÓTIPO |
| Slots de save | 3 slots: nome, último jogo, melhor round, almas e se há run em andamento; slot ocupado pede confirmação para sobrescrever; "Apagar" com confirmação | ALPHA |
| Seleção de dificuldade | Fácil/Normal/Difícil abertas, Nightmare com cadeado; seed opcional | ALPHA |
| HUD in-run | ver 21.2 | PROTÓTIPO |
| Level-up | 3 cartas centrais, stats atuais à esquerda; pausa | PROTÓTIPO |
| Loja | 4 slots, arma atual com botão de upgrade, stats, reroll, lock, "Próximo round" | PROTÓTIPO |
| Chefe | barra de HP topo, nome, marcadores de fase | PROTÓTIPO (Coveiro) |
| Morte/Resultado | round, kills, dano causado/recebido, causa da morte, build final, almas ganhas (contador animado), seed | PROTÓTIPO |
| Ossuário | 5 ramos radiais, nós com custo, saldo de almas, reset | ALPHA |
| Opções | áudio (3 sliders), vídeo (escala de renderização, qualidade, fullscreen, vsync), gameplay (gore, shake, flash, escala UI, daltônico), controles (remap) | ALPHA |
| Fim da demo | após vencer o Coveiro: resumo + botões "Comprar na Steam" / "Google Play" / "Continuar no Ossuário (limitado)" | BETA |
| Pausa | Esc (PC) ou Start (controle) abre; no celular, botão "‖" no canto superior direito, ao lado da velocidade. Continuar, Opções, Sair para o menu (confirmação; a run fica salva no início do round) | PROTÓTIPO |

### 21.4 Slots de save e retomar a run (decisão do PO, 2026-10-31)

- **Três slots**, cada um um perfil completo (almas, Ossuário, recordes, estatísticas, marcos e skins). Opções e teclas são globais e não mudam de slot.
- **Novo jogo** abre a escolha de slot e depois a dificuldade. Um slot ocupado só é usado depois de confirmar que o perfil dele será apagado; um slot vazio entra direto. Cada slot ocupado também tem "Apagar", com confirmação.
- **Continuar** aparece quando já houve um slot usado e abre o último: retoma a run em andamento dele; sem run, abre o perfil e vai para a escolha de dificuldade. O Ossuário e as Opções do menu valem para o slot atual.
- **Retomar a run:** o jogo salva o estado da run ao começar cada round (depois de sair da loja). Ao retomar, a run volta ao início desse round com a mesma economia, build, HP e sorteios; os inimigos não são salvos, o round recomeça limpo. Morrer ou terminar a run apaga o checkpoint. Ver SDD 06 seção 2.1.

### 21.2 HUD in-run

- Topo-esquerda: barra de HP (números), barra de XP com nível.
- Topo-centro: round atual e timer (ou barra do chefe).
- Topo-direita: ouro, almas da run, ícone de elite ativa.
- Base-esquerda: arma atual, tier (4 pips), ícones dos itens (agrupados com contador).
- Base-direita (mobile): botão de dash e pausa. Desktop: vazio.
- Indicadores de borda: seta para elite e chefe fora da tela.
- Atualização do HUD a 10–15 Hz via store externo (D21); números de dano são renderizados pela engine (não React).

### 21.3 Estilo

Ver Art Bible §11. Fonte pixel para números e títulos; fonte sans legível para descrições; painéis de ferro enferrujado com rebites; sem bordas arredondadas.

## 22. Áudio

Decisões D24, D25: SFX e música via ElevenLabs, voz via ElevenLabs TTS, tudo gerado em lote por script de build e versionado. Engine: Babylon Audio Engine v2.

### 22.1 SFX (lista mínima da 1.0)

| Grupo | Sons | Qtde |
| --- | --- | --- |
| Herói | passos (2 superfícies), hit recebido, morte, dash, level-up, pickup (3 variações) | 10 |
| Armas | espada swing/hit, pistola, SMG (loop curto), metralhadora (loop), bazuca disparo/explosão, upgrade de tier | 9 |
| Inimigos | spawn, hit, morte (por tipo, 8), investida, projétil do Vigia, explosão de elite, aura de elite (loop) | 16 |
| Chefes | entrada, 3 ataques cada, enrage, morte/execução (5 chefes) | 30 |
| UI | hover, confirmar, cancelar, compra, sem ouro, reroll, lock, carta escolhida, almas contando, cadeado | 10 |
| Ambiente | loop por bioma (4), vento, fim de round (sino), início de round (tambor) | 7 |

Polifonia: `maxInstances` por som (hits 8, mortes 6, pickups 4) e teto por grupo (falas 2, UI 4, demais efeitos 24). Mixer: buses `master`, `sfx`, `music`, `voice`, `ui`; hoje o código usa `master`, `music` e `sfx`, e a música cai −6 dB sob uma fala.

**Metas de áudio (decisão do Orq, 2026-10-31, B-03-03):** 70 efeitos sonoros (eram 82; os 30 sons de chefe da lista acima viram sons genéricos de evento), 12 músicas (menu, ondas, chefe, 4 biomas e 5 chefes) e 40 falas (20 do Mercador e 4 de cada chefe: entrada, fase, fúria e morte).

### 22.2 Música

- Menu/Ossuário: 1 faixa lenta (coral grave + metal).
- Combate: 1 faixa por bioma (4), 120–140 BPM, loop de 2–3 min, com camada "intensidade" (stem extra) que entra quando há elite.
- Chefe: 1 faixa por chefe (5) ou 2 faixas com variação (BETA decide por orçamento).
- Transição por crossfade de 2 s.

### 22.3 Voz

- Mercador de Ossos: ~20 falas em inglês (D24), voz grave, rouca.
- Chefes: entrada, enrage, morte (3–5 falas cada).
- Sem narrador na 1.0 (adiado).

## 23. Juice e feedback

Valores iniciais (**proposta**; calibrar por playtest; todos com toggle onde indicado):

| Evento | Feedback |
| --- | --- |
| Hit em inimigo | flash branco 2 frames; número de dano; partícula de sangue cúbica (3–6 cubos); knockback |
| Crítico | número amarelo ×1,3; hit-stop 30 ms; som mais grave |
| Morte de inimigo | desmembra em 4–8 cubos com física simples (0,8 s, sem colisão entre si); decal de sangue no chão (máx. 200 decals, FIFO); fragmento salta e cai |
| Hit no herói | flash vermelho na borda (vignette 0,2 s); shake 2 px (toggle); som de impacto; HUD de HP pulsa |
| Level-up | pausa com zoom suave 5%; som ascendente; partículas sobem do herói |
| Elite entra | som de alerta grave; marcador na borda; aura pulsante |
| Chefe entra | cinemática 3 s; nome em tela; tambor; câmera afasta 20% |
| Chefe morre | hit-stop 80 ms; execução 1,5 s; explosão de cubos; almas voam para o contador |
| Fim de round | sino; fragmentos voam para o herói (Bolsa) |
| Compra | som metálico; item "cai" no inventário |

## 24. Plataformas, demo e monetização

### 24.1 Plataformas

| Plataforma | Versão | Tecnologia | Input | Observações |
| --- | --- | --- | --- | --- |
| Web (Vercel) | 1.0, só demo (D28) | Vite SPA | teclado/mouse/gamepad | links para Steam e Play; sem backend |
| Steam Windows 11 | 1.0 | Electron 45 + electron-builder (D19) + steamworks.js | teclado/mouse/gamepad | achievements (10 na 1.0), Steam Cloud para save |
| Android (Google Play) | 1.1 (D29) | Capacitor 8 | touch + gamepad | landscape; app grátis + IAP (D27) |

### 24.2 Demo (D04)

- Rounds 1 a 10, incluindo o Coveiro.
- Ao vencer o Coveiro: tela "Fim da demo" com resumo e botões de compra; a run termina (almas creditadas).
- Ossuário: só os 2 primeiros nós de cada ramo (§19.2).
- Dificuldade: só Normal.
- Save da demo é compatível com o jogo completo (mesmo formato, flag `isDemo`); na Steam, demo e jogo completo são App IDs diferentes: o jogo completo importa o save da demo via Steam Cloud se existir, ou via arquivo local.
- Web: o limite é imposto no cliente (sem backend); aceitável porque a web não vende nada.

### 24.3 Monetização

- Preço US$ 9,99 (D26) em Steam e Play; desconto de lançamento 10% por 14 dias; regionais pela ferramenta da Valve.
- Android: app grátis até o round 10 + compra única via Play Billing que grava `fullVersion = true` no save e valida o entitlement na abertura (Play Billing `queryPurchases`).
- Sem microtransações, sem anúncios, sem DLC na 1.0.

## 25. Balanceamento e simulação

- **Fonte única de dados**: `data/*.json` (inimigos, armas, itens, cartas, ossuário, rounds). O jogo e o simulador leem os mesmos arquivos.
- **Simulador headless** (`bun run sim`): roda N runs com política de jogador simples (compra o melhor item por custo/benefício, escolhe carta de maior stat faltante), sem render, 10.000 rounds/min. Saída: distribuição de round de morte, DPS por round, ouro acumulado, tempo de kill de chefe.
- **Alvos de balanceamento (Normal)**:

| Métrica | Alvo |
| --- | --- |
| Round mediano de morte (jogador simulado médio; sobrevivente conta como o round do horizonte, `--rounds 50`) | 18–26 |
| Tempo para matar o Coveiro (build mediano do round 10) | 45–90 s |
| Tempo para matar chefe N (build mediano) | 60–120 s, sem enrage ≥ 3 |
| Ouro por round / preço médio de item | 1,2–1,8 |
| Level-ups por round (rounds 5–20) | 1–2 |
| Fração de runs vivas no horizonte (bot greedy) | ≤ 45% (provisório; ver decisão abaixo) |
| Dispersão do round de morte entre seeds | intervalo interquartil (P75 − P25): ≤ 10 rounds para jogadores reais (alvo de produto); ≤ 25 provisório para o bot greedy do simulador (desvio padrão só informativo) |

- **Decisão do Orq em 2026-10-31, revisável pelo PO**: a dispersão passou de "desvio ≤ 4" para IQR ≤ 10, e o round de morte conta os sobreviventes no horizonte (censura à direita). Motivo: um bot greedy e estatísticas lineares dão uma distribuição bimodal (atrição nos rounds 5–8 e sobreviventes), na qual o desvio das runs que morreram não mede nada.
- **IQR provisório (decisão do Orq em 2026-10-31, revisável pelo PO)**: o bot greedy não consegue IQR ≤ 10 com p50 em 18–26 (medido em oito rodadas de 16–24 runs: IQR 21–28); o limite do simulador é **IQR ≤ 25, provisório até os playtests da B-04**. O alvo de produto continua ≤ 10 para jogadores reais.
- **Fração de runs vivas no horizonte (decisão do Orq em 2026-10-31, revisável pelo PO)**: o `--check` do simulador também exige que no máximo **45%** das runs estejam vivas no horizonte (`alive-fraction-at-horizon`). Motivo: sobreviventes contam como o horizonte, então perto de 50% de vivos o p50 salta de ~24 para ~30 com ajustes pequenos (medido: 128×35 com a mesma `data/`, seed 1 deu p50 23,5 com 38% vivos e seed 1001 deu p50 30 com 47%). O alvo mantém o p50 longe desse penhasco. O CI (`balance.yml`) roda dois conjuntos de 64 runs × 35 rounds, seeds 1 e 1001.
- **Fluxo**: toda mudança em `data/*.json` roda o simulador no CI e publica o relatório; desvio dos alvos bloqueia o merge (assert no ROADMAP).
- **Playtest humano**: a partir do PROTÓTIPO, 3 sessões por semana com telemetria (§26).

### 25.1 Três dificuldades, duas políticas (B-02-02, 2026-10-31)

Medido com `bun run sim --runs 128 --rounds 35 --difficulty <d> --policy <p>` (relatórios em `reports/balance-final-<dificuldade>-<política>.json`). Grim e Nightmare só fazem sentido com parte do Ossuário comprado, porque se desbloqueiam ao chegar ao round 20 na dificuldade anterior. Perfis de referência do simulador (`--ossuary`): **Grim** = `flesh_1..3,steel_1..3` (700 almas); **Nightmare** = `flesh_1..4,steel_1..4,shadow_1..3` (1.750 almas). Sem Ossuário o bot greedy morre no round 9,5 em Grim e no 5 em Nightmare; com a árvore quase toda (4 ramos de 4 a 5 nós), o p50 sobe para ~27: a escala de dificuldade depende do Ossuário e as faixas abaixo valem só com os perfis de referência.

| Dificuldade | Política | p50 | IQR | Vivas | Kill gravedigger / matriarca / forjador (s) | Fúria máx. |
| --- | --- | --- | --- | --- | --- | --- |
| Normal | greedy | 23,5 | 21,8 | 38% | 64 / 78 / 88 | 1 |
| Normal | tank | 35 | 16,0 | 60% | 108 / 131 / 148 | 2 |
| Grim (700 almas) | greedy | 18 | 20,2 | 23% | 71 / 84 / 91 | 1 |
| Grim (700 almas) | tank | 30 | 25,0 | 52% | 113 / 144 / 172 | 2 |
| Nightmare (1.750 almas) | greedy | 15 | 16,0 | 13% | 82 / 81 / 88 | 1 |
| Nightmare (1.750 almas) | tank | 35 | 5,8 | 66% | 141 / 186 / 162 | 3 |

Faixas aprovadas para o bot greedy (decisão do Orq, 2026-10-31, revisável pelo PO; implementadas em `tools/sim/report.ts`, e o CI continua só com greedy Normal em duas seeds, por custo): p50 Normal 18–26 (como em §25), **Grim 14–22**, **Nightmare 11–18**, com o perfil de Ossuário acima; as três passam. Dados `data/*.json` não mudaram: os multiplicadores D13 (×1,25 e ×1,5 em HP e dano) ficam como estão.

Faixas aprovadas para o bot **tank** (política de sobrevivência: prioriza HP, armadura, regeneração e roubo de vida, recua e usa o dash), também decisão do Orq de 2026-10-31: ele é a build segura e lenta, então vale o contrário do greedy: p50 **26–35** em Normal e Grim e ≥ 30 em Nightmare; fração de vivas ≤ 65% (≤ 70% em Nightmare); tempo de kill dos chefes ≤ 150 s em Normal e Grim e ≤ 190 s em Nightmare (limite de 180 s do B-01-03 vale para Normal e Grim); fúria < 3 em Normal e Grim, ≤ 3 em Nightmare. Hoje o tank passa em todas, exceto o tempo do Forjador em Grim (172 s, acima de 150 s mas dentro do limite de 180 s do B-01-03); a Matriarca em Nightmare (186 s) passa pelo limite de 190 s.

**Alcance da espada (pedido do PO, 2026-10-31):** a Espada Enferrujada passou de alcance 2,5 u para **3,2 u** (+28%; era 3,25 u até o rebalanceamento do Ímã, ver abaixo) e de arco 120° para **130°** (golpe mais horizontal); cada tier soma +0,5 u como antes (tier 4: 4,7 u). Medido: 64 × 35 com seeds 1 e 1001 deu p50 23,5 e 26; 500 × 30 deu p50 22 (35% vivas). Com 3,4 u e arco 140° o p50 subia para 27 e 27,5 e saía da faixa; 3,25 u e 130° é o maior alcance que fica nela.

**Rebalanceamento do Ímã de Ossos (decisão do Orq, 2026-10-31):** com o `pull_fragments` do S2 puxando de verdade, o bot greedy passou a recolher todos os fragmentos do chão e o sim saiu da faixa: 64 × 35 com p50 35, 58–67% vivas e ouro por preço de 2,2 (alvos 18–26, ≤ 45% e 1,2–1,8). O que importou foi **quanto o bot compra o ímã**, não o intervalo nem a duração: intervalos de 8 a 45 s e `pullSeconds` 1 ou 2, no tier 2 a 40 de preço, deram todos o mesmo ouro (2,2 a 2,3). Tabela do que foi testado (64 × 35, seeds 1 e 1001):

| Ímã | Espada | p50 s1 / s1001 | Vivas s1 / s1001 | Ouro por preço |
| --- | --- | --- | --- | --- |
| tier 2, preço 40, a cada 8 s (como entrou) | 3,25 u | 35 / 35 | 67% / 58% | 2,25 / 2,22 |
| tier 2, preço 40, a cada 20, 30 ou 45 s, ou puxada de 1 s | 3,25 u | 35 / 32,5–35 | 52–67% | 2,19–2,33 |
| tier 4, preço 160, a cada 20 s | 3,25 u | 28,5 / 35 | 45% / 52% | 1,83 / 1,68 |
| **tier 3, preço 120, a cada 8 s** | 3,25 u | 21,5 / 26,5 | 33% / 42% | 1,49 / 1,46 |
| tier 3, preço 120 | 3,1 u | 31 / 22 | 48% / 39% | — |
| tier 3, preço 120 | 3,0 u | 27 / 24,5 | 44% / 45% | — |
| tier 3, preço 120 | arco 125° | 25,5 / 18,5 | IQR 26 (falha) | — |
| **tier 3, preço 120, a cada 8 s (escolhido)** | **3,2 u** | **23 / 22,5** | **41% / 42%** | dentro da faixa |

Escolhido: o Ímã sobe do tier 2 (preço 40) para o **tier 3 (Épico), preço 120**, com intervalo de 8 s e a espada em **3,2 u** (130°). O 500 × 30 final deu p50 22,5 com 40% vivas, e todos os alvos passaram. Cada tabela de 64 runs oscila alguns rounds com qualquer mudança de dados (o bot fica na beira do penhasco de censura), por isso a escolha olhou as duas seeds e o 500 × 30. `pullFragmentsEverySeconds` do Est foi removido a favor da implementação do S2.

**Dificuldade Fácil (proposta, ainda não implementada):** inimigos ×0,75 de HP e dano e almas ×0,75. Simulada por parâmetro (Normal com `hpDamageMult` 0,75; 128 × 35): greedy p50 35 com 79% vivas (kill 59 / 65 / 80 s), tank p50 35 com 85% vivas (kill 85 / 92 / 121 s). Faixas propostas, decisão do Orq: p50 30–35 nas duas políticas, vivas ≤ 85% (greedy) e ≤ 90% (tank), kill dos chefes nas mesmas faixas do Normal (≤ 150 s para o tank), ouro por preço ≥ 1,1 em vez de 1,2 (o Fácil rende menos ouro por preço) e IQR ≤ 25. Já estão em `rangesFor` para a dificuldade `easy`; falta medir com a branch real do S2.

O Forjador é o chefe mais lento para o tank (148 s em Normal, 172 s em Grim) porque a fase 2 tem armadura 30 e o tank tem pouco dano: a armadura pune quem luta de perto com pouco dano e premia dano alto, o que combina com o desenho do chefe. Não recomendo mexer nos dados do Forjador agora; revisitar depois do playtest B-04 se um jogador defensivo real reportar luta arrastada.

## 26. Métricas de sucesso e telemetria

### 26.1 Métricas de produto

| Métrica | Alvo | Quando |
| --- | --- | --- |
| Wishlists Steam antes do Next Fest fev/2027 | ≥ 3.000 | jan/2027 |
| Wishlists após o Next Fest | ≥ 10.000 | mar/2027 |
| Conversão demo→wishlist (Steam) | ≥ 15% | Next Fest |
| Reviews positivas Steam | ≥ 90% nas primeiras 100 | 1.0 + 30 dias |
| Mediana de duração de sessão | 20–35 min | BETA |
| Retenção D1 / D7 (demo web) | 30% / 10% | BETA |
| Crash-free sessions | ≥ 99,5% | RC |

### 26.2 Telemetria (opt-in, anônima, sem backend na 1.0)

Eventos gravados localmente em JSONL e, se o jogador aceitar, enviados em lote para um endpoint simples (Vercel Function ou arquivo Steam Cloud) a definir no SDD: `run_start`, `round_end`, `level_up`, `shop_buy`, `elite_spawn`, `boss_start`, `boss_end`, `death`, com seed, build e dificuldade. Nenhum dado pessoal.

## 27. Glossário

| Termo | Definição |
| --- | --- |
| Round | Unidade de tempo do jogo (20–60 s), equivalente a "onda" do Brotato |
| Round de chefe | Rounds múltiplos de 10, sem timer |
| Elite | Inimigo comum com modificador, sorteado 20% por round comum |
| Fragmento | Material dropado por inimigo; vale 1 ouro + 1 XP |
| Bolsa | Fragmentos não coletados, devolvidos no round seguinte |
| Almas | Moeda persistente ganha ao morrer, gasta no Ossuário |
| Ossuário | Meta-árvore permanente (5 ramos, 30 nós) |
| Tier | Raridade de item/arma (1 Normal a 5 Mítico) |
| Mercador de Ossos | NPC da loja |
| Carrasco | Herói da 1.0 |
| Enrage | A cada 60 s de round de chefe: +15% dano e velocidade do chefe, acumulativo |
| Pity | Garantia de elite após 5 rounds comuns sem elite |

## 28. Suposições

Decisões do Diretor não cobertas pelo brainstorming, registradas para revisão do PO:

- Nomes diegéticos: herói "Carrasco", NPC "Mercador de Ossos", meta-árvore "Ossuário", chefes e biomas (§6.2, §12.1). Todos substituíveis sem impacto técnico (IDs em inglês não mudam).
- Roster da 1.0: 8 inimigos comuns, 4 modificadores de elite, 5 chefes, 5 armas × 4 tiers, 41 itens + 4 Míticos + 2 exclusivos do Ossuário (`ruin_chalice`, `ossuary_mantle`), 12 cartas, 30 nós no Ossuário, 4 biomas.
- Dash existe, mas só via Ossuário (ramo Sombra); o herói começa sem dash.
- Almas: fórmula de §18.2 e custos de §19.1 calibrados para completar o Ossuário em 15–25 runs.
- Contagem de inimigos por round (§10.3) e HP de chefes (§12.1) são propostas sem referência pública; o simulador (§25) valida.
- Telemetria opt-in sem backend na 1.0; endpoint definido no SDD.
- 10 achievements Steam na 1.0 (lista no SDD de ports).
- Demo web impõe o limite no cliente; aceitável porque a web não vende.

## 29. Alvos de tela e layouts

Decisão D31. O jogo é projetado, testado e otimizado para estes 4 alvos; outros tamanhos funcionam por escala, sem garantia de polimento.

| Alvo | Viewport (CSS px) | DPR típico | Render interno alvo | Orientação |
| --- | --- | --- | --- | --- |
| Desktop 1 | 1920 × 1080 | 1 | 1920 × 1080 | landscape |
| Desktop 2 | 2560 × 1440 | 1 | 2560 × 1440 (ou 1920 × 1080 com upscale se < 60 fps) | landscape |
| Mobile 1 (~6,1") | 896 × 414 | 2–3 | 1344 × 621 (DPR efetivo 1,5) | landscape forçado |
| Mobile 2 (~6,5") | 800 × 360 | 2–3 | 1200 × 540 (DPR efetivo 1,5) | landscape forçado |

Regras:

- Câmera: a área visível no chão é um trapézio (elevação 55°, §5); a largura cresce com o aspecto. O topo da tela fica a ≈ 15 u do herói e os cantos de cima a ≈ 27 u, então o anel de spawn (22–30 u) fica fora da tela exceto nos cantos de cima; se o playtest mostrar spawn visível, subir o mínimo do anel para 27 u em `rounds.json`.
- HUD: ancorado por cantos com safe area (`env(safe-area-inset-*)` no mobile, mínimo 24 px); escala de UI 100% em 1080p, 125% em 1440p (auto), 100% em mobile com alvos de toque ≥ 48 px.
- Texto mínimo: 14 px em 1080p, 16 px em 1440p, 13 px em mobile (fonte pixel em múltiplos inteiros: 8/16/24 px).
- Telas (loja, level-up, Ossuário) usam layout em colunas no desktop e lista horizontal rolável no mobile (ver Art Bible §17).
- QA obrigatório: capturas de Playwright nos 4 viewports em cada PR de UI (SDD 11); benchmark de performance nos 2 alvos mobile (SDD 14).
- Fontes dos percentuais (fornecidas pelo PO, não verificadas): ver `docs/brainstorming.md` §7.2.
