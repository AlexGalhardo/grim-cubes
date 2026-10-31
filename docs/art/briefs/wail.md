# Brief: Lamento (`wail`)

Arquivo: `assets/src/models/enemies/wail.bbmodel` (+ `wail_d.png`, 64×64). Categoria `enemies` (VAT), 64 px/u, altura 0,8 a 1,0 u (hoje 58 px = 0,9), orçamento 10 elementos (hoje 8). Rápido (5,5 u/s), zigue-zague, HP baixo.

## Silhueta-alvo

Cabeça enorme e corpo fino: uma cabeça-caveira de boca aberta num grito, corpo em trapos, braços finos. É o mais fácil de reconhecer em preto sólido (cabeça maior que o corpo).

Frente (cada `#` ≈ 4 px):

```text
   ##########
  ############
  ##  ####  ##
  ##  ####  ##
  ############
      ####
      #  #
     ##  ##
```

Lado:

```text
   #####
  #######>
  #######
    ##
    ##
```

## Medidas por grupo (px)

| Grupo | Elemento | X×Y×Z | Posição |
| --- | --- | --- | --- |
| `leg_l` / `leg_r` | perna | 8×16×8 | x ±6 |
| `body` | torso | 14×14×10 | y 16 a 30 |
| `body` | trapo (novo) | 16×6×12 | y 16 a 22 |
| `head` | cabeça | 38×28×26 | y 30 a 58 |
| `head` | olhos (já existem) | 6×4×2, dois | z +14, y 44 a 48 |
| `head` | boca aberta (novo, escura) | 12×8×2 | z +14, y 32 a 40 |
| `arm_l` / `arm_r` | braço | 6×22×6 | x ±10 |

Total previsto 10. `hit_socket` no tronco.

## Paleta

`bone` (cabeça), `boneDark`, `shadow` e `mist` (corpo), `bloodLight` (olhos, emissivo no `_e.png`), `night` (boca). ≤ 12 cores.

## Textura

Cabeça: rachaduras em `boneDark`, dentes marcados pela boca aberta (buraco pintado em `night`), lascas na testa; AO de 1 px sob a cabeça e no pescoço; olhos em `bloodLight`.

## Animação (12 fps, assada no VAT)

| Clipe | Nota |
| --- | --- |
| `idle` | cabeça balança ±3° |
| `walk` | passadas curtas e rápidas, amplitude 35°; zigue-zague dá a leitura |
| `attack` | arm_r a −100° e cabeça para a frente (grito) |
| `hit` | body −15° |
| `death` | tomba, cabeça encosta no chão |

## Não pode mudar

Grupos `root > body > head | arm_l | arm_r` e `root > leg_l | leg_r`; `hit_socket`; os 5 clipes de `enemies`; textura 64×64; altura 0,8 a 1,0 u.
