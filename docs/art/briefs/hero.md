# Brief: herói (Carrasco)

Arquivo: `assets/src/models/hero/hero.bbmodel` (+ `hero_d.png`, 64×64). Escala 64 px/u, altura 1,9 u (121 a 124 px), orçamento 24 elementos (hoje 11).

## Silhueta-alvo

Robusto e encapuzado: tronco largo, ombreira esquerda maior que a direita (assimetria), capuz com ponta caída nas costas, cinto largo. Deve ser reconhecível em preto sólido a 64 px pela ombreira dupla e pelo capuz pontudo.

Frente (cada `#` ≈ 4 px):

```text
     /##\
    |####|
  ####/\####
 ###########
  ## #### ##
  ## #### ##
     ####
     #  #
    ##  ##
```

Lado (frente à direita):

```text
    __/#
   |###|>
   |###|
   |###|
   |###|
   |###|
   ##  ##
   ##  ##
```

## Medidas por grupo (px)

| Grupo | Elemento | Tamanho X×Y×Z | Posição |
| --- | --- | --- | --- |
| `leg_l` / `leg_r` | perna | 16×52×16 | x ±10, y 0 a 52 |
| `leg_l` / `leg_r` | bota (novo) | 18×10×20 | y 0 a 10, z +2 |
| `body` | tronco | 30×44×20 | y 52 a 96 |
| `body` | cinto (novo) | 32×6×22 | y 70 a 76 |
| `body` | placa peitoral | 20×20×4 | z +12 |
| `body` | faixa diagonal (novo, rot. 22,5°) | 6×34×2 | z +11 |
| `head` | cabeça | 26×26×26 | y 96 a 122 |
| `head` | capuz | 30×14×30 | y 110 a 124 |
| `head` | ponta do capuz (novo) | 10×16×8 | z −16, y 100 a 116 |
| `head` | máscara (novo) | 22×10×2 | z +14, y 100 a 110 |
| `arm_l` | braço | 14×40×14 | x −22 |
| `arm_l` | ombreira grande | 18×12×26 | y 86 a 98 |
| `arm_r` | braço | 14×40×14 | x +22 |
| `arm_r` | ombreira pequena | 14×10×22 | y 86 a 96 |
| `arm_l` / `arm_r` | braçadeira (novo) | 16×8×16 | y 60 a 68 |

Total previsto: 22 a 24. Origem no centro da base, frente em +Z.

## Paleta (≤ 12 cores, só tokens de `palette.ts`)

`blood`, `bloodLight` (rampa do capuz e do tronco), `iron`, `ironDark`, `ironLight` (ombreiras, cinto, botas), `boneDark` (pele, rosto), `bone` (olhos e cicatriz), `emberLight` e `ember` (só o acento do herói, Art Bible §3.3), `shadow` (sombra de matiz), `night` (fundo de AO). Sem `#FFFFFF`/`#000000`.

## Textura

- AO de 1 px sob ombreiras, na junção cinto/tronco e nas bases das botas.
- Luz do topo: faces de cima na rampa clara de cada token.
- Desgaste: ferrugem (`rust`) nas arestas das ombreiras e lascas claras no cinto; cicatriz em pixel na bochecha esquerda.
- Sem dithering em personagem; olhos no `_e.png` só se houver brasa (acento `ember`).

## Animação (24 fps)

| Clipe | Nota |
| --- | --- |
| `idle` | respiração: body ±2°, ombreira grande sobe 1 px |
| `run` | passada alternada de 50°, body inclinado ~10° à frente, pés sem deslizar |
| `attack_melee` | arm_r de −100° a +35°, torção de body ±10° |
| `attack_ranged` | pose: arm_r a −90° mantido |
| `hit` | body −15° seco |
| `dash` | body +45° à frente, braços atrás |
| `death` | body +90°, root desce `legH/2` |
| `victory` | os dois braços a −160° |

## Não pode mudar

Grupos `root > body > head | arm_l | arm_r > weapon_socket` e `root > leg_l | leg_r`; `weapon_socket` na mão direita; os 8 clipes com os nomes exatos; textura `hero_d.png` 64×64; altura 1,9 u; registrar `hero/hero` em `authored.json`.
