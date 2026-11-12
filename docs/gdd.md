# Grim Cubes — Game Design Document (GDD)

Versão 0.1.0 — 2026-10-31. Fonte das decisões: `docs/brainstorming.md` (D01–D30). Fonte dos números de referência: `docs/web-search.md`.

Convenções deste documento:

- Números marcados como **baseline** vêm de referências públicas (Brotato, Vampire Survivors) e são ponto de partida para playtest, não valores finais.
- Números marcados como **proposta** são do Diretor; precisam de validação por simulação (ver §25).
- Identificadores técnicos (`snake_case` ou `camelCase`) são os nomes que o código deve usar.
- "Unidade" (u) = 1 metro no mundo = 1 cubo de terreno.

> **Mudança de direção de arte (ADR-0029, 2026-11-11).** Depois da `v0.6.0` o jogo troca o voxel por 3D medium poly pintado à mão, e o gore em cubos por partículas e decals orgânicos (trilha S-18 do `ROADMAP.md`). As regras de jogo deste documento não mudam; onde o texto diz "voxel" ou "cubos", vale para a `main` até a S-18. A §1 é reescrita na S-18-04.

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
15. [Raridades e consumíveis](#15-raridades-e-consumíveis)
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

1. Fim do round vencido: a loja abre sozinha (tela do "Mercador de Ossos"). Compra de equipamento, subida com fragmentos e relíquia, reroll, lock.
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
| Cura | E | B | Botão no HUD (embaixo, à esquerda do dash) |
| Super | Q | Y | Botão no HUD, com a barra de carga |
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
| Raio (distância ao alvo) | 28,5 u (era 38 u até a v0.5.0; decisão do PO em 2026-11-11 para o herói ler maior na tela) | 26–38 u |
| Alvo | posição do herói suavizada (lerp 8/s) | — |
| Área visível no chão (16:9, raio 28,5) | trapézio: profundidade 19,2 u (−7,8 a +11,4 u do herói); largura 22,7 / 26,9 / 33,2 u (borda de baixo / altura do herói / borda de cima); raio 25,5 → profundidade 17,2 u | — |
| Mobile (9:16 ou 16:9 landscape forçado) | landscape obrigatório; raio 25,5 u | — |

Regras:

- O herói fica no centro vertical da tela (crítica a YAZS em `docs/web-search.md` §3.7).
- Nada entre a câmera e o herói: props altos próximos ao herói ficam translúcidos (fade de material) ou são evitados pela geração (nenhum prop com altura > 2 u num raio de 3 u do spawn).
- Inimigos fora da tela não são renderizados, mas continuam simulados dentro de um raio de 40 u.

## 6. Mundo procedural

Decisão D16: terreno plano com props por chunk, biomas por distância do spawn.

**Arena (ADR-0030, S-19-02):** o mundo deixou de ser infinito. O herói joga num quadrado centrado na origem, com borda visível (muro de ferro escuro) e intransponível: o herói e os inimigos ficam dentro dela, descontado o raio. O lado cresce a cada round: meia-aresta de 26 u no round 1, mais 1,5 u por round, teto de 104 u (`arena` em `data/world.json`). Inimigos nascem dentro da borda (o anel de spawn é empurrado para dentro) e os props fora do quadrado não são desenhados. Os chunks continuam gerando o chão e os props; a troca de bioma por round entra na S-24-01 e os anéis por distância abaixo valem até lá.

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

### 6.2 Biomas por round

Decisão do PO (ADR-0030): o bioma muda a cada 10 rounds, na ordem de `data/biomes.json` (rounds 1–10, 11–20, 21–30, 31–40, 41–50). Do round 51 em diante (modo infinito) o bioma é sorteado a cada round, de forma determinística pela seed da run (`biomeForRound`, `data/world.json` `biomes`). Ao trocar, os chunks carregados são gerados de novo com o bioma novo, e fog, céu e música seguem o bioma.

| Rounds | Bioma | Chão | Props típicos | Inimigos nativos |
| --- | --- | --- | --- | --- |
| 1–10 | Cemitério Afundado | terra cinza, lápides | lápides, árvores mortas, cercas de ferro, criptas | Carcaças, Lamentos |
| 11–20 | Pântano de Ossos | lodo verde-escuro | ossadas gigantes, árvores de pântano, cabanas | Afogados, Sanguessugas |
| 21–30 | Forja Infernal | pedra negra com veios laranja | bigornas, correntes, chaminés, fornalhas | Forjados, Vigias |
| 31–40 | Ninho Biomecânico | carne/metal escuro | ovos, torres, tanques, cabos | Caçadores, Reprodutores |
| 41–50 | Catacumbas Congeladas | pedra do cemitério tingida de azul-gelo | criptas, lápides, arcos de ossos, torres do ninho, correntes | Lamentos, Vigias, Sanguessugas |

**Clima (S-24-02):** cada bioma tem um VFX de ambiente em cubos ao redor do herói: neblina no cemitério, chuva no pântano, brasas na forja, vento no ninho e gelo caindo nas catacumbas (`weather` em `data/biomes.json`, parâmetros em `data/render.json` `weather`). Ele usa até 30% do `particlePool` do preset, não é desenhado no Mínimo (pool de 100) e cai para metade com a redução de flashes.

As Catacumbas Congeladas (5º bioma) reaproveitam tiles e props voxel existentes: o chão é o do cemitério com tinta fria aplicada ao ler a faixa de tiles (`LIGHTING.floorBiomeTint`), e os props vêm do cemitério, do pântano e do ninho; a música é a do cemitério até haver faixa própria. A S-18 modela os cinco biomas de novo. Biomas afetam **pool de spawn** e **visual**; não afetam stats base (a dificuldade vem do round). O pool de spawn segue a mistura 60% bioma atual, 30% anterior e 10% seguinte da lista.

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

A 1.0 tem três **classes** (ADR-0030, trilha S-20 da `v0.7.0`; substitui os três heróis da `v0.6.0`): o herói não troca de arma na run, porque cada classe tem a sua arma fixa. Cada classe define a arma, ajustes nos stats base e uma passiva, em `data/heroes.json`. Até a S-18-06 as duas classes novas usam o modelo do Warrior recolorido (`tint`).

| Classe | Arma | Stats base (além da tabela 7.1) | Passiva | Desbloqueio |
| --- | --- | --- | --- | --- |
| Warrior (`warrior`, o antigo Carrasco) | Espada Enferrujada: arco de 130° que acerta todos os inimigos dentro | — | **Placas Enferrujadas:** sem bônus numérico | desde o início |
| Ranged (`ranged`) | Bumerangue de Ferro: voa até o alvo e ricocheteia no inimigo mais próximo ainda não atingido (raio de 9 u); atinge 3 alvos no nível 1 da arma e 20 no nível 10 | HP 90, velocidade 6,3, crítico 8%, esquiva 5%, raio de pickup 2,8 u | **Olho do Pelotão:** +10% de chance de crítico | marco `boss_round_10`: matar o chefe do round 10 |
| Mago (`mage`) | Machado Mágico: pancada em arco de 240° em volta do herói; o raio dobra do nível 1 (2,7 u) ao nível 10 (5,4 u) | HP 60, armadura 1, raio de pickup 2,5 u | **Saber do Ossuário:** +10% de dano | marco `boss_round_20`: matar o chefe do round 20 |

**Nível da arma (1 a 10):** acompanha o nível do herói (o mesmo nível das cartas de level-up), limitado a 10; não há compra nem upgrade de arma. Os números por nível (`damageMult`, `attackSpeedBonusPerTier`, `rangeBonusPerTier` e, no bumerangue, `projectile.bounces`) estão em `data/weapons.json`. Os marcos usam `stats.bestBossRound` do perfil, o último round de chefe morto em qualquer run; um save da `v0.6.0` recebe esse valor derivado do recorde (os chefes antigos ficavam nos rounds 10, 20 e 30). A run salva vira uma run de Warrior com a espada; o Fuzilado e a Penitente saem. Os números de dano, pickup e HP do Mago saíram da S-26.

### 7.1 Stats base (round 1, sem meta-árvore)

Valem para o Warrior; as outras classes sobrepõem só os campos da tabela acima.

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

### 8.4 Magias da classe (S-20-02, ADR-0030)

Cada classe tem seis magias em `data/spells.json`, com o nome de cada uma em `locales/` (`spell.<id>`): quatro **ofensivas automáticas**, uma **cura** e uma **super**. As quatro automáticas disparam sozinhas pela recarga (`intervalSeconds`) e reaproveitam os cinco comportamentos das magias de item da `v0.6.0` (projétil, discos em órbita, relâmpago em cadeia, mina e pulso em área). Cada classe escolhe quatro deles com números próprios:

| Classe | Automáticas | Cura | Super |
| --- | --- | --- | --- |
| Warrior | Onda de Choque (pulso), Lâminas Giratórias (órbita), Abrolhos (mina), Lança Arremessada (projétil) | Fôlego de Guerra: 25% do HP máximo, recarga de 30 s | Redemoinho de Aço: raio de 5,5 u |
| Ranged | Salva de Tiros (projétil), Corrente de Ferro (cadeia), Armadilha (mina), Cartuchos Orbitais (órbita) | Kit de Campo: 20%, 25 s | Chuva de Chumbo: raio de 7 u |
| Mago | Raio Arcano (projétil), Relâmpago (cadeia), Nova Arcana (pulso), Fogos-Fátuos (órbita) | Sifão Vital: 22%, 28 s | Tempestade Arcana: raio de 8 u |

- **Cura:** acionada pelo jogador (E, B no controle, botão no HUD). Restaura uma fração do HP máximo e depois espera a recarga; com a barra cheia ou o herói morto, o toque não gasta a recarga. A recarga recomeça pronta a cada round.
- **Super:** acionada pelo jogador (Q, Y no controle, botão no HUD). Carrega com **100 abates no round**; cada uso dentro do mesmo round soma **5** aos abates da próxima carga (100, 105, 110...). Ao disparar, dura **5 s** e, a cada 0,25 s, atinge todos os inimigos dentro do raio em volta do herói. A carga e o custo recomeçam no início de cada round. A barra de carga fica no HUD ao lado dos dois botões (embaixo ao centro no desktop; à esquerda do dash no toque).
- **Nível das magias (1 a 10):** o nível 1 é de graça; o Ossuário sobe cada magia até o 10 (S-22-01). Cada nível soma 15% ao dano (cura: +6%) e tira 4% do intervalo e da recarga. As teclas e os botões do controle entram no remap das Opções.
- Os números são provisórios até a S-26; o bot do simulador cura abaixo de 50% de HP e dispara a super assim que carrega.

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

- Recompensa (ADR-0030): 1 fragmento de elite garantido (100%, creditado na hora da morte e mostrado no HUD e na loja, §17.4), 25 almas e cura de 25 HP. Não há mais baú nem escolha de item.
- Entra 10 s após o início do round, com aviso sonoro e marcador na borda da tela.
- Se o round acabar com a elite viva, ela some sem recompensa (pressão).

## 12. Chefes

Decisão D02, revista pelo ADR-0030: dez chefes únicos, um a cada 5 rounds (5, 10, …, 50), em ordem fixa; depois do round 50 vem o modo infinito, com chefe sorteado a cada 5 rounds (sorteio a partir do round 51, `randomRosterFromRound`) e modificadores de elite. Round de chefe sem timer; enrage a cada 60 s (+15% dano e velocidade, acumulativo). Horda reduzida continua (30% do spawn normal).

### 12.1 Roster e entrega por fase

| Round | Chefe | Fase de entrega | Arquétipo | HP base (round 10) | Padrões |
| --- | --- | --- | --- | --- | --- |
| 5 | O Carcereiro de Ossos | PROTÓTIPO | tanque lento com investida | 1.800 | modelo do Coveiro menor: investida, golpe de pá, invoca 4 Carcaças a 50% HP |
| 10 | O Coveiro | PROTÓTIPO | tanque lento com investida | 4.800 | investida em linha (telegrafada 1 s), golpe de pá em arco, invoca 6 Carcaças a 50% HP |
| 15 | A Bruxa do Lodo | PROTÓTIPO | invocadora | 8.000 | modelo da Matriarca menor: Afogados, poça de lodo, grito |
| 20 | A Matriarca do Pântano | ALPHA | invocadora | 12.500 | solta 3 Sanguessugas a cada 8 s, poça de lodo (lentidão), grito (knockback) |
| 25 | O Titã de Escória | PROTÓTIPO | área e projéteis | 13.500 | modelo do Forjador maior: martelo, correntes em 6 direções, fase 2 com armadura 25 |
| 30 | O Forjador | ALPHA | área e projéteis | 15.000 | martelo (onda de choque radial), lança correntes em 4 direções, fase 2 com armadura 30 |
| 35 | O Espreitador da Ninhada | PROTÓTIPO | rápido, caça | 30.000 | modelo do Caçador Alfa maior: furtividade, salto, visão térmica |
| 40 | O Caçador Alfa | BETA | rápido, caça | 60.000 (provisório) | `stealth`: fica invisível 3 s (as armas não o miram) e ataca pelas costas; `leap`: salto com área; `thermal_vision`: persegue atravessando obstáculos |
| 45 | O Soberano Gélido | PROTÓTIPO | dois estágios | 62.000 | modelo da Rainha menor: varredura, poça de gelo (lentidão), salto |
| 50 | A Rainha do Ninho | BETA | dois estágios | 65.000 (provisório) | `eggs`: ovos destrutíveis que eclodem Caçadores; `sweep`: cauda em varredura; `fly_bomb`: na fase 2 (50% HP) voa e bombardeia |
| 55+ | sorteio do roster (dez chefes) | — | — | HP(N) = HP_base_do_chefe × (1 + 0,35 × (N − round_original) / 10) | + 1 modificador de elite a partir do 60; 2 a partir do 100 |

Os cinco chefes novos (rounds 5, 15, 25, 35 e 45) pegam emprestado o modelo voxel de um chefe antigo, adaptado por escala (`model` e `scale` em `data/bosses.json`; a tinta ficou de fora porque clonar o material com contorno lança erro) até a S-18 modelar os dez. Os nomes e o tema grimdark são propostas do agente, a validar pelo PO. O HP de cada chefe no round em que ele aparece está em `data/bosses.json` (`hpBaseRound10`) e foi calibrado na S-26 para as três classes.

HP escala com o multiplicador de dificuldade (D13). Dano de contato dos chefes: (3 + 0,18 × N) × multiplicador do chefe (Coveiro ×1, Matriarca ×2, Forjador ×2, Caçador Alfa ×1,5, Rainha ×2; `contactDamageMult` em `bosses.json`); projéteis 18 + 1,2 × N (**proposta**). Os padrões de área e projétil escalam esse contato: grito ×3, martelo ×4, correntes ×3. HP e dano saíram do simulador (A-02-03) e foram recalibrados na S-26 para o loop de um chefe a cada 5 rounds: no round do próprio chefe o HP é o `hpBaseRound10` (o termo de escala zera). A curva fechada em 2026-11-12 é 1.800, 4.800, 5.600, 6.200, 5.200, 5.800, 13.000, 12.000, 14.000 e 16.000 nos rounds 5 a 50. O sorteio do roster começa no round 51 (`randomRosterFromRound` em `rounds.json`).

Cada chefe tem **cinco ataques** (os passivos, como invocar, armadura de fase, visão térmica e ovos, não contam, nem o `fly_bomb` da Rainha, que só existe na fase 2), sorteados pelo fluxo `combat` da seed entre os que podem começar na distância atual, e **todo ataque avisa no chão antes de ferir**: arco, linha, círculo ou anel vermelho (`BossTelegraph`) ou uma bomba marcada no chão (`BossBomb`) com tempo de reação mínimo de 0,3 s. O tempo de aviso é multiplicado pela dificuldade (`telegraphMult` em `rounds.json`: Fácil ×1,25, Normal ×1, Difícil ×0,85, Nightmare ×0,7). O ataque genérico novo é o `target_blast` (a rajada de bombas do `fly_bomb`, sem a fase 2); os demais reaproveitam os padrões existentes com números próprios.

### 12.2 Regras gerais

- Entrada: 3 s de cinemática curta (câmera afasta 20%, nome em tela, fala de voz), inimigos comuns congelam.
- Barra de HP do chefe no topo do HUD, com marcadores de fase.
- Morte do chefe: execução (animação de 1,5 s, câmera aproxima), 100 + 10 × N almas, 1 relíquia de chefe garantida (100%, §17.4) e 1 ponto de upgrade de arma grátis.
- Demo: o Coveiro (round 10) está incluso (D04).

## 13. Rounds e dificuldade

### 13.1 Duração (D03, baseline Brotato)

| Round | Duração |
| --- | --- |
| 1 | 30 s |
| 2–18 | +5 s por round (35, 40, …, 115 s) |
| 19+ | 120 s |
| chefe | sem timer; enrage a cada 60 s |

Redesenho v0.7.0 (ADR-0030): a duração sobe de 20–60 s para 30–120 s. Os rounds de chefe passam a ser a cada 5 (Parte 1A do ROADMAP); a tabela de tempo acumulado antiga caducou e entra na revisão da S-26.

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
| `luck` | Sorte | pontos | 1% de chance por ponto de um segundo sorteio de nível na loja | — | §17.1 (nível da oferta da loja) |
| `harvest` | Colheita | pontos | +1 fragmento no fim do round por ponto | — | cresce 5% por round (baseline) |

Stats secundários (só por itens): `pickup_range` (%), `xp_gain` (%), `shop_price` (%), `explosion_size` (%), `knockback` (%), `enemy_speed` (%), `boss_damage` (%), `free_rerolls`.

## 15. Raridades e consumíveis

### 15.1 Raridades

| Tier | Nome | Cor (ver Art Bible §3) | Cor daltônico | Preço base típico |
| --- | --- | --- | --- | --- |
| 1 | Normal | osso `#D9C9A3` | ● | 15–25 |
| 2 | Raro | azul `#4C7FB8` | azul claro ◆ | 30–50 |
| 3 | Épico | roxo `#7A4FB8` | magenta ▲ | 60–100 |
| 4 | Lendário | laranja `#E07A2A` | laranja ★ | 120–200 |
| 5 | Mítico | amarelo `#F5D04A` | amarelo ✦ | 240–320 |

Decisão do PO (2026-10-31): cinco raridades na UI, `tier: 1..5` nos dados. Os nomes antigos (Comum, Incomum, Raro, Lendário) viram Normal, Raro, Épico e Lendário; os preços e as chances por tier de 15.2 continuam valendo até o Est atualizar os dados.

### 15.4 Consumíveis

Caem de destrutíveis e de elites: Frasco de Sangue (cura 20% HP imediato), Ímã de Ossos (puxa todos os fragmentos por 3 s). Não ficam no inventário; efeito ao pegar.

### 15.5 Itens e sinergias (removidos na v0.7.0)

Os itens, as etiquetas e as sinergias saíram (ADR-0030, S-25-01): o equipamento da §17 não tem etiqueta nem efeito especial, só atributos por nível. Saíram junto o catálogo (`data/items.json`, com o esquema), o motor de efeitos de item (aura, espinhos, sangramento, explosão ao matar, onda a cada N abates, ímã de XP, ressurreição), a faixa de itens do HUD e da tela de resultados, os marcos que liberavam item, os ícones e textos `item.*` e `effect.*`, e o retrato animado do Mercador. As magias automáticas de cada classe (`data/spells.json`, §7) reaproveitam os cinco comportamentos (`bolt`, `orbit`, `chain`, `mine`, `nova`) do antigo motor. O áudio `sfx_ui_synergy` e `sfx_player_revive` ficou no repositório, sem uso.

## 16. Level-up

Decisão D10: fragmentos dão XP e ouro ao mesmo tempo. Ao subir de nível, o jogo pausa e oferece 3 cartas; o jogador escolhe 1.

### 16.1 Curva de XP (proposta, inspirada em VS)

```text
xp_para_proximo(L) = 8 + 5 × (L - 1)   # XP para passar do nível L para L+1: 1→2 = 8, 10→11 = 53, 20→21 = 103 (A-02-03; era 10 + 8 × (L - 1))
xp_por_fragmento = 1 (×(1 + xp_gain/100))
```

Com ~32 fragmentos no round 1 e ~140 no round 10, espera-se nível ~4 no round 3 e ~15 no round 10. Alvo: 1 a 2 level-ups por round na faixa 5–20.

### 16.2 Cartas

Pool de cartas de stat (peso igual): +5 HP máx, +4% dano, +5% velocidade de ataque, +3 armadura, +4% velocidade, +3% crítico, +3% esquiva, +0,25 regen (0,05 HP/s sozinha, pela fórmula contínua de §8.2), +2% roubo de vida, +4 sorte, +1 colheita, +0,3 u alcance. A partir do nível 10, cartas "duplas" com 10% de chance (dois bônus menores: 2 cartas diferentes do pool, cada uma a 50% do valor; decisão do Orq de 2026-10-31). Cada carta mostra o nome próprio (Vigor, Fúria, Frenesi…), o efeito, a raridade (normal; a dupla é Épica) e o atributo antes e depois de escolher; o baú de elite usa a mesma tela. Reroll de cartas: não existe na 1.0 (simplicidade); nó do Ossuário pode dar 1 reroll por run.

## 17. Loja

Decisão D05: tela entre rounds. O NPC físico do ALPHA saiu na v0.7.0 (ADR-0030): a tela é o diálogo do Mercador de Ossos.

### 17.1 Estrutura

Redesenho da v0.7.0 (ADR-0030, S-21): a loja vende só equipamento. Não há mais itens, armas, consumíveis nem sinergias.

- 6 slots de equipamento: capacete, armadura, calças, botas, anel e amuleto. Cada slot tem nível de 0 (vazio) a 10; os atributos de cada nível ficam em `data/equipment.json` e valem pelo nível inteiro (a peça nova substitui a anterior, não soma).
- A loja oferece 1 peça por slot que ainda está abaixo do nível 6, sempre de nível maior que o equipado (nunca peça pior ou igual). Nos primeiros rounds a oferta é o próximo nível; a cada `jumpEveryRounds` rounds (8) a oferta pode saltar até 1 nível a mais, no máximo `maxJump` (2). Cada ponto de sorte é 1% de chance de um segundo sorteio, ficando o maior nível.
- Níveis 1 a 6: ouro (preço base por nível em `equipment.json`: 12, 24, 45, 80, 130, 200, escalado por §17.2). Níveis 7 a 10 não são vendidos: fragmentos de elite (7 a 9) e relíquia de chefe (10), no slot que o jogador escolher (§17.4).
- Lock: grátis e ilimitado; a oferta travada mantém preço e sobrevive ao próximo round enquanto ainda for um upgrade.
- Reroll: fórmula abaixo.
- Não há venda nem troca de peça: comprar um nível maior no mesmo slot substitui o anterior.
- Mostra os 6 slots equipados, os stats atuais do herói e o delta (verde ou vermelho) ao passar o mouse, focar ou tocar numa oferta.

### 17.2 Fórmulas (baseline Brotato)

```text
preco(base, N)   = floor((base + N + base × 0,15 × N) × (1 + shop_price/100)), mínimo 1
reroll_inc(N)    = max(1, floor(0,4 × N))
reroll_1(N)      = floor(0,75 × N) + reroll_inc(N)
reroll_k(N)      = reroll_1(N) + (k - 1) × reroll_inc(N)     # reseta a cada loja
```

Exemplos: peça de nível 1 (base 12) no round 1 = 14; peça de nível 6 (base 200) no round 10 = 510 (a escala por round vale para todo o preço). Reroll no round 10: 11, 15, 19…

### 17.4 Fragmentos de elite e relíquias (S-21-02)

- Cada elite morta dá **1 fragmento de elite** e cada chefe morto dá **1 relíquia**, sempre (100%), creditados no ato (`MaterialDropped`). Os valores ficam em `elites.json` `reward.fragments` e `rounds.json` `boss.rewardRelics`. Elite que foge no fim do round não dá nada.
- Na loja, cada slot de equipamento que já chegou ao nível 6 mostra o botão de subir um nível com material, no slot que o jogador escolher: nível 7 custa 2 fragmentos, o 8 custa 3, o 9 custa 4 e o 10 custa 1 relíquia (`equipment.json` `upgrades`). Sem o material a compra é recusada; fragmentos nunca pagam o nível 10 nem a relíquia paga os níveis 7 a 9.
- O HUD (carteira) e a loja mostram os dois contadores; o checkpoint da run guarda os dois (`eliteFragments`, `relics`).

### 17.3 Mercador de Ossos (S-21-03)

- A loja abre sozinha ao fim de cada round vencido, sem andar até ninguém (ADR-0030). O Mercador deixou o mapa: não há NPC físico, seta, aviso de falar nem espera de 20 s.
- Na tela da loja ele continua com o retrato, uma fala sob o nome e a voz (D24): saudação ao abrir, compra, sem ouro, despedida e, a cada 12 s com o jogador parado na loja, um comentário.
- Pós-1.0: ofertas especiais do Mercador (1 peça de nível alto com desconto a cada 10 rounds).

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

### 19.1 Estrutura (S-22-01, ADR-0030)

O Ossuário é uma **árvore de quadrados ligados por classe** (uma aba por classe: Warrior, Ranged e Mago). Cada classe tem **6 colunas**, uma para cada magia (as 4 automáticas, a cura e a super, §8.4), e cada coluna tem **9 quadrados**, um por nível de 2 a 10; o nível 1 é de graça. Os quadrados de uma coluna se ligam em sequência (o nível k exige o nível k−1). Cada quadrado comprado sobe a magia em um nível (+15% de dano, ou +6% de cura, e −4% de recarga; §8.4). A árvore sai de `data/spells.json` (as magias) e de `data/ossuary.json` (os preços).

Custo por nível, igual para todas as magias: 20, 35, 55, 85, 130, 190, 280, 400 e 560 almas (1.755 por magia, 10.530 por classe, 31.590 a árvore toda de 162 quadrados). O jogador compra qualquer coluna das três classes, também as das classes ainda bloqueadas.

A árvore de atributos da `v0.6.0` (5 ramos de 6 nós: Carne, Aço, Sombra, Ouro e Ruína, 10.250 almas) saiu. O save migra devolvendo **100% das almas gastas** nela (`migrateOssuary`, schema 15) e começa a árvore nova do zero. O dash passou a vir liberado para toda classe, com 1 carga; os outros efeitos da árvore antiga (+HP, +dano, ouro inicial, rerolls de cartas, loja com item Raro, Filactério fraco) foram embora com ela.

### 19.2 Regras

- Reset total do Ossuário: permitido, devolve 100% das almas (sem punição; encoraja experimentar).
- A demo (D04) mostra o Ossuário completo, mas só os quadrados até o nível 4 de cada magia são comprados; o resto exibe cadeado "jogo completo" (`demoMaxLevel` em `data/ossuary.json`).

## 20. Progressão e desbloqueios

| Marco | Desbloqueia |
| --- | --- |
| Primeira morte | Ossuário abre |
| Round 10 vencido | Dificuldade (nada; só almas) e marcador de recorde |
| Round 20 em Difícil (`grim`) | Nightmare |
| 1.000 kills acumulados | item `cube_of_wrath` entra no pool |
| 10.000 kills | item `warlord_banner` entra no pool |
| 5 chefes mortos | item `executioner_mark` entra no pool |
| Chefe do round 10 morto | classe Ranged (§7) |
| Chefe do round 20 morto | classe Mago (§7) |
| Round 50 | skin "Carrasco de Ferro Negro" (cosmético) |
| Pós-1.0 | personagens por marcos (Bruxa do Pântano: 3 Matriarcas mortas; Forjado Renegado: round 30 em Grim) |

Recordes mostrados no menu: maior round por dificuldade, total de kills, total de almas, chefes mortos.

### 20.1 Desafio diário (S-13-01)

- **Menu → "Desafio diário".** A seed vem da data UTC (`YYYY-MM-DD`, muda às 00:00 UTC para todo mundo) por um hash fixo (`dailySeed`), a classe do dia sai de outro hash da mesma data entre as classes que o jogador desbloqueou (`dailyHero`, ADR-0030: quem só tem o Warrior joga sempre com o Warrior), e a dificuldade é sempre Normal. A mesma data e o mesmo conjunto de classes desbloqueadas dão a mesma seed e a mesma classe em qualquer máquina; uma run diária retomada mantém a classe com que começou.
- **Uma tentativa pontuada por dia, por slot.** A primeira run do desafio que termina no dia grava uma linha (data, round, tempo de combate, abates); as seguintes do mesmo dia valem como treino: jogam e contam para a conta (almas, recordes, estatísticas), mas não entram na tabela. Uma run abandonada antes de terminar não pontua; ela continua salva e "Continuar" a retoma, mesmo que a meia-noite UTC passe.
- **Tabela local** dos últimos 30 dias com pontuação (mais novo primeiro), na própria tela do desafio. O ranking online fica para a Parte 2 do ROADMAP (precisa do App ID da Steam).

## 21. UI e HUD

### 21.1 Telas

| Tela | Conteúdo | Fase |
| --- | --- | --- |
| Boot/Título | logo, "pressione para começar" (unlock de áudio), versão | PROTÓTIPO |
| Menu principal | Continuar (só se já houve um slot usado), Novo jogo, Desafio diário, Ossuário, Opções, "Wishlist na Steam" (só quando o build recebe `GC_WISHLIST_URL`) e Sair (só no desktop), com o botão principal maior; em telas baixas os botões ficam em duas colunas; bloco de recordes por dificuldade; brasas animadas sobre a arte (paradas com redução de movimento); selo "DEMO" em destaque quando aplicável | PROTÓTIPO |
| Slots de save | 3 slots: nome, último jogo, melhor round, almas e se há run em andamento; slot ocupado pede confirmação para sobrescrever; "Apagar" com confirmação | ALPHA |
| Desafio diário | data UTC, herói e arma do dia, dificuldade Normal, se a tentativa pontuada de hoje já foi usada e a tabela local dos últimos 30 dias (data, round, tempo, abates); "Jogar" começa a run do dia (§20.1) | BETA |
| Seleção de herói | 3 cartões: retrato (recolorido por token), arma inicial, passiva e, se bloqueado, a condição de desbloqueio; entre os slots e a dificuldade (novo jogo e "Jogar de novo"); o herói escolhido vai no checkpoint da run | BETA |
| Seleção de dificuldade | Fácil/Normal/Difícil abertas, Nightmare com cadeado; uma linha de sabor por dificuldade; escolha (preenchimento âmbar e losango) e foco (contorno osso) nunca se parecem; seed e tutorial opcionais (S-08-01) | ALPHA |
| HUD in-run | ver 21.2 | PROTÓTIPO |
| Level-up | 3 cartas centrais com raridade, ícone e `atributo atual → novo`; painel de atributos à esquerda, com o delta verde ou vermelho da carta em foco (só em telas largas de desktop; some em 896 × 414 e 800 × 360); botão de troca com o saldo de trocas, visível; pausa | PROTÓTIPO |
| Loja | abre sozinha ao fim do round: 6 ofertas de equipamento (uma por slot, em linhas compactas nas telas baixas), os 6 slots equipados com nível e botão de subir com material, fragmentos e relíquias, stats com prévia do delta, reroll, lock, ouro uma vez só, almas do perfil rotuladas, "Próximo round" (§17) | PROTÓTIPO |
| Chefe | barra de HP topo, nome, marcadores de fase | PROTÓTIPO (Coveiro) |
| Morte/Resultado | round, tempo de luta, kills, dano por fonte em barras (arma, magias, itens, sangramento), causa da morte com nome e ícone, build final com ícones e contadores, almas ganhas (contador animado) com o progresso até o próximo desbloqueio do Ossuário, seed; numa run do desafio diário, um selo diz se ela pontuou ou foi treino; na demo, o botão de wishlist | PROTÓTIPO |
| Ossuário | 5 ramos em colunas, nós com custo, saldo de almas, reset. Comprado ("✓ Comprado"), comprável (moldura sólida com brilho e preço) e bloqueado (moldura tracejada, ▣, texto AA) se distinguem sem cor; no desktop as colunas ocupam a altura da tela (S-08-02) | ALPHA |
| Opções | áudio (3 sliders), vídeo (escala de renderização, qualidade, fullscreen, vsync), gameplay (gore, shake, flash, escala UI, daltônico), controles (remap). Qualidade numa linha só; brilho e contraste em % com 100% no neutro; três colunas no desktop e duas em paisagem abaixo de 1024 px (S-08-03) | ALPHA |
| Fim da demo | após vencer o Coveiro: resumo + botões "Comprar na Steam" / "Google Play" / "Continuar no Ossuário (limitado)" e "Wishlist na Steam" (quando há URL) | BETA |
| Pausa | Esc (PC) ou Start (controle) abre; no celular, botão "‖" no canto superior direito, ao lado da velocidade. Continuar, Opções, Sair para o menu (confirmação; a run fica salva no início do round) | PROTÓTIPO |

### 21.4 Slots de save e retomar a run (decisão do PO, 2026-10-31)

- **Três slots**, cada um um perfil completo (almas, Ossuário, recordes, estatísticas, marcos e skins). Opções e teclas são globais e não mudam de slot.
- **Novo jogo** abre a escolha de slot, depois a do herói (§7) e depois a dificuldade. Um slot ocupado só é usado depois de confirmar que o perfil dele será apagado; um slot vazio entra direto. Cada slot ocupado também tem "Apagar", com confirmação.
- **Continuar** aparece quando já houve um slot usado e abre o último: retoma a run em andamento dele; sem run, abre o perfil e vai para a escolha de herói e depois a de dificuldade. O Ossuário e as Opções do menu valem para o slot atual.
- **Retomar a run:** o jogo salva o estado da run ao começar cada round (depois de sair da loja). Ao retomar, a run volta ao início desse round com a mesma economia, build, HP e sorteios; os inimigos não são salvos, o round recomeça limpo. Morrer ou terminar a run apaga o checkpoint. Ver SDD 06 seção 2.1.

### 21.2 HUD in-run

- Topo-esquerda: retrato do herói 64 px com o nível num selo no canto, barra de HP (número centralizado) e, logo abaixo, barra de XP fina sem texto.
- Topo-centro: "ROUND n" pequeno sobre o timer grande (m:ss, 40 px), os dois só durante um round cronometrado (fora dele a placa some); nos últimos 5 s do round o timer fica `blood-light` e pulsa em `steps()`. Na luta de chefe a barra do chefe ocupa o lugar e o timer some: placa com o nome, pips de fase, marcador por mudança de fase e moldura que pulsa quando o chefe está em fúria. Abaixo de 25% de HP a barra do herói ganha moldura `blood-light` e pulsa.
- Topo-direita: ouro (moeda), almas da run (caveira) e abates, com os botões de velocidade, pausa e opções em ícones quadrados logo abaixo; ícone de elite ativa.
- Base-esquerda: arma atual numa moldura de 56 px com 4 pips de tier, e a faixa de itens (ícones de 32 px em moldura da cor da raridade, contador quando maior que 1, no máximo 10 e depois um chip "+N"). Em tela de toque a arma vai para o lado dos vitais e a faixa some (o joystick ocupa a base-esquerda; os itens aparecem na loja e na pausa).
- Margem de 24 px no desktop e de 12 px no mínimo (ou a safe area) no mobile. Nada cobre o herói nem o anel de 6 u ao redor dele (retângulo central de 600×400 px a 1080p, proporcional nos outros alvos).
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

**Catálogo em 2026-11-01:** 82 SFX, 10 músicas e 40 falas. Os 12 efeitos que faltavam para a lista mínima desta seção voltaram ao catálogo: coleta `02` e `03`, upgrade de arma, disparo da bazuca, aura de elite, UI de cancelar, carta e almas, vento, e um ataque do Coveiro, da Matriarca e do Forjador. As faixas próprias da Matriarca e do Forjador continuam de fora.

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
| Morte de inimigo | desmembra em 4–8 cubos com física simples (0,8 s, sem colisão entre si); decal de sangue e uma marca do corpo ficam no chão a run inteira (teto por preset em `data/render.json` `vfx.floorMarkCaps`: 600/400/200/100/50 do Ultra ao Mínimo; ao estourar, somem primeiro as marcas mais antigas e mais distantes do herói); fragmento salta e cai |
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

**Dificuldade Fácil (implementada em c643158, aberta desde o início por decisão do PO):** inimigos ×0,75 de HP e dano e almas ×0,75. Medida com a dificuldade real (`--difficulty easy`, 128 × 35, relatórios `reports/balance-easy-greedy.json` e `reports/balance-easy-tank.json`, com a espada em 3,2 u e o Ímã no tier 3): greedy p50 35 com 81% vivas (kill dos chefes 56 / 60 / 71 s, ouro por preço 1,52), tank p50 35 com 85% vivas (kill 76 / 89 / 107 s, ouro por preço 1,53). Faixas (decisão do Orq, 2026-10-31, em `rangesFor`): p50 30–35 nas duas políticas, vivas ≤ 85% (greedy) e ≤ 90% (tank), IQR ≤ 25, ouro por preço 1,2–1,8 como no Normal (a faixa mais baixa de 1,1 que se propôs por parâmetro não é necessária) e kill dos chefes nas faixas do Normal com o limite inferior ×0,75, porque os chefes têm 75% do HP (gravedigger 34–90 s, demais 45–120 s, tank até 150 s). O greedy fica no limite: a Matriarca morre em 59,6 s, abaixo dos 60 s do Normal, que o limite ×0,75 acomoda. O ouro por preço de 2,15 visto num smoke do S2 vinha do Ímã de Ossos no tier 2, já rebalanceado.

O Forjador é o chefe mais lento para o tank (148 s em Normal, 172 s em Grim) porque a fase 2 tem armadura 30 e o tank tem pouco dano: a armadura pune quem luta de perto com pouco dano e premia dano alto, o que combina com o desenho do chefe. Não recomendo mexer nos dados do Forjador agora; revisitar depois do playtest B-04 se um jogador defensivo real reportar luta arrastada.

### 25.2 Os três heróis (S-12-03, 2026-11-11)

Medido com `bun run sim --runs 64 --rounds 35 --seed 1 --hero <id> --difficulty <d> [--ossuary <perfil de 25.1>] --check` (relatórios em `reports/balance-heroes-<herói>-<dificuldade>-s1.json`). Sem `--policy`, o simulador escolhe o bot pela arma inicial: espada (corpo a corpo) usa o greedy de sempre; qualquer arma de fogo usa o bot **kite** (`packages/game/src/bot/policy.ts`, `kiteSteer`), que compra e escolhe cartas como o greedy mas recua de uma multidão curvando de lado, orbita o alvo dentro do alcance, busca fragmentos quando o campo está limpo e nunca usa o dash (com o dash do Ossuário o kite chegava ao round 33 em Nightmare, contra a faixa de 11 a 18). As faixas são as mesmas do greedy (25 e 25.1).

O primeiro diagnóstico (política greedy parada contra a horda) levou a inflar os heróis novos (HP 200, armadura 8, pickup 7, dano e velocidade de ataque até +85%, −30% e −40% de dano em chefes). Com o kite esses números ficaram fortes demais (84% e 91% de vivos), então voltaram a valores de design: HP 100 e 110, armadura 4 e 2, pickup 4,65 e 4, sem penalidade de dano em chefe. Os campos `damage` e `attackSpeed` de `base` são bônus aditivos (+70% e +70% no Fuzilado; +60% e +80% na Penitente), como no `hero.json`.

| Herói | Dificuldade | p50 | IQR | Vivas | Faixas que falham |
| --- | --- | --- | --- | --- | --- |
| Carrasco | Normal | 24 | 20,5 | 44% | — |
| Carrasco | Difícil | 19,5 | 14,3 | 25% | — |
| Carrasco | Nightmare | 16 | 12,0 | 13% | kill do Coveiro 105,9 s (limite 90 s; a amostra de 64 e a faixa estreita, não a passiva) |
| O Fuzilado | Normal | 17 | 18,0 | 30% | p50 (18–26), kill da Matriarca 57,5 s (60–120) |
| O Fuzilado | Difícil | 15 | 7,0 | 13% | — |
| O Fuzilado | Nightmare | 15,5 | 10,0 | 13% | — |
| A Penitente | Normal | 18,5 | 19,3 | 31% | — |
| A Penitente | Difícil | 17 | 9,3 | 19% | — |
| A Penitente | Nightmare | 16 | 9,0 | 14% | — |

**O que falta (S-12-03 segue parcial):** o Fuzilado em Normal fica a 1 round da faixa e a Matriarca morre 2,5 s cedo demais. A pistola é a arma de dano único mais forte contra chefes e a mais fraca contra multidão, e o p50 do bot é muito sensível: o raio de pickup move a mediana de 17 a 31 entre 4,65 e 5,5 e o gold por preço de 1,80 a 2,09 (o limite é 1,8 em Nightmare), de modo que não há um número em `data/heroes.json` que feche as duas pontas sem uma penalidade contra chefes (descartada) ou uma mudança na própria pistola (por exemplo perfuração 1, que afeta qualquer herói que a use). O Carrasco em Nightmare segue igual. Uma segunda seed não foi medida com os números finais. A S-26 substitui esse alvo: o Fuzilado e a Penitente saíram.

### 25.3 Três classes no loop novo (S-26, 2026-11-12)

Medido com `bun run sim --runs 64 --rounds 35 --seed <1|1001> --hero <warrior|ranged|mage> --difficulty <normal|grim|nightmare> --check`. Sem `--policy`, o Warrior e o Mago usam o bot greedy e o Ranged usa o kite. Grim e Nightmare seguem sem o perfil de Ossuário da §25.1: a árvore agora é de magias e o bot não compra nós no meio da run. As faixas de p50, de IQR e de vivas da §25.1 continuam. O que mudou no `--check`, porque um chefe a cada 5 rounds e classes que batem num alvo de cada vez não cabem nas faixas de 2026-10-31:

| Métrica | Faixa |
| --- | --- |
| Kill do chefe do round 5 | 12–120 s |
| Kill do chefe do round 10 (Coveiro continua com teto 90 s) | 25–90 s |
| Kill de chefe do round 15 ou 20 | 40–120 s |
| Kill de chefe do round 25 em diante (bot que não é tank) | 40–180 s |
| Fúria | < 3 |
| Ouro por round / preço médio da peça | 1–1,6 |
| Chefe que ninguém matou | a métrica de tempo é ignorada; a fúria continua valendo |

O piso de 40 s a partir do round 15 é o de uma luta, não o de uma aula. O teto de 180 s a partir do round 25 é o instante da terceira fúria (uma a cada 60 s). As 18 combinações (3 classes × 3 dificuldades × seeds 1 e 1001) passam; os relatórios estão em `reports/balance-<classe>-<dificuldade>-s<seed>.json`. O CI (`balance.yml`) continua com o Warrior em Normal nas duas seeds.

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

- Câmera: a área visível no chão é um trapézio (elevação 55°, §5); a largura cresce com o aspecto. Com o raio 28,5 (25,5 no mobile), o topo da tela fica a ≈ 11 u do herói e os cantos de cima a ≈ 20 u em 16:9 e a ≈ 21 u nos dois alvos mobile, então o anel de spawn (22–30 u) fica inteiro fora da tela nos quatro alvos (teste em `packages/render/src/scene/camera.test.ts`). Numa janela de desktop mais larga que 2:1 os cantos de cima passam de 22 u; se isso aparecer em playtest, subir o mínimo do anel em `rounds.json`.
- HUD: ancorado por cantos com safe area (`env(safe-area-inset-*)` no mobile, mínimo 24 px); escala de UI 100% em 1080p, 125% em 1440p (auto), 100% em mobile com alvos de toque ≥ 48 px.
- Texto mínimo: 14 px em 1080p, 16 px em 1440p, 13 px em mobile (fonte pixel em múltiplos inteiros: 8/16/24 px).
- Telas (loja, level-up, Ossuário) usam layout em colunas no desktop e lista horizontal rolável no mobile (ver Art Bible §17).
- QA obrigatório: capturas de Playwright nos 4 viewports em cada PR de UI (SDD 11); benchmark de performance nos 2 alvos mobile (SDD 14).
- Fontes dos percentuais (fornecidas pelo PO, não verificadas): ver `docs/brainstorming.md` §7.2.
