# Brief: Coveiro (`gravedigger`)

Arquivo: `assets/src/models/bosses/gravedigger.bbmodel` (+ `gravedigger_d.png`, 64×64). Categoria `bosses`, 64 px/u, altura 4 a 6 u (hoje 296 px = 4,6), largura 3 a 4 u, orçamento 48 elementos (hoje 12). Primeiro chefe (round 10): tanque lento com investida, golpe de pá em arco e invocação de Carcaças.

## Silhueta-alvo

Gigante encapuzado e corcunda com uma pá enorme. A pá é o telégrafo do golpe em arco, então precisa ler de longe. Ombros assimétricos (esquerdo com ombreira de pedra), lanterna pendurada, terra acumulada nas costas.

Frente (cada `#` ≈ 8 px):

```text
        ####
      ########
   ###############
  ## ########## ##
  ## ########## ##   |
  ## ########## ##  [#]
     ###    ###      #
     ###    ###
     ###    ###
```

Lado (frente à direita):

```text
     ###
   #######
  #########>   |
  #########    #
  #########   ###
   ##   ##
   ##   ##
```

## Medidas por grupo (px)

| Grupo | Elemento | X×Y×Z | Posição |
| --- | --- | --- | --- |
| `leg_l` / `leg_r` | perna | 40×120×40 | x ±28 |
| `leg_l` / `leg_r` | bota (novo) | 46×16×52 | y 0 a 16 |
| `body` | torso | 110×110×60 | y 120 a 230 |
| `body` | cinto de couro | 116×20×66 | y 200 |
| `body` | corcunda (novo) | 70×40×40 | z −30, y 200 a 240 |
| `body` | lanterna (novo, emissiva) | 16×20×16 | x −50, z +34 |
| `head` | cabeça | 60×60×60 | y 230 a 290 |
| `head` | capuz | 66×14×66 | y 286 a 300 |
| `head` | bico do capuz (novo) | 30×30×20 | z +34 |
| `arm_l` | braço | 36×100×36 | x −73 |
| `arm_l` | ombreira de pedra (novo) | 56×24×56 | y 206 a 230 |
| `arm_r` | braço | 36×100×36 | x +73 |
| `arm_r` | ombreira | 56×24×56 | y 206 a 230 |
| `shovel` | cabo | 8×150×8 | z +30 |
| `shovel` | lâmina (em degraus) | 44×56×6 | z +30 |
| `shovel` | terra na lâmina (novo) | 36×10×4 | z +30 |

Total previsto 28 a 36. `hit_socket` no peito. Altura total máxima 6 u (384 px).

## Paleta

`stone`, `stoneDark` (corpo e capuz), `rust` (couro, ombreiras, pá), `ironDark` (lâmina), `boneDark` (rosto), `emberLight` e `ember` (lanterna), `graveGreen` (musgo), `night`, `shadow` (AO e matiz). ≤ 12 cores.

## Textura

Terra seca nas botas e na pá em degraus de `rust`; lascas e rachaduras em `stone`; musgo nos ombros; desgaste na lâmina com fio claro; AO sob o capuz e entre cinto e torso; lanterna no `_e.png`.

## Animação (24 fps)

| Clipe | Nota |
| --- | --- |
| `idle` | respiração pesada, body ±2°, pá balança |
| `walk` | passada curta de 25°, pisada forte (body desce 2 px) |
| `enrage` | escala do body até 1,1 e volta; cabeça sobe |
| `phase_change` | body −22,5° e cabeça +22,5° (rugido), invoca Carcaças |
| `death_execution` | body +90° e root desce `legH/2` |

Os ataques (investida, golpe de pá em arco, invocação) usam `walk`/`enrage` por enquanto. A pá precisa de uma pose de elevação legível 1 s antes do golpe.

## Não pode mudar

Grupos `root > body > head | arm_l | arm_r` e `root > leg_l | leg_r`, `shovel` (filho de `arm_r`) e `hit_socket`; os 5 clipes de `bosses`; textura 64×64; altura 4 a 6 u.
