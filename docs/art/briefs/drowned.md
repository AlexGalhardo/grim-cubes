# Brief: Afogado (`drowned`)

Arquivo: `assets/src/models/enemies/drowned.bbmodel` (+ `drowned_d.png`, 64×64). Categoria `enemies` (VAT), 64 px/u, altura 1,6 a 1,9 u, orçamento 16 elementos. O placeholder do gerador (branch `art/placeholders-ao`) já é largo e baixo: torso 56×30, pernas 20, `legH` 28.

## Silhueta-alvo

Tanque lento: ombros caídos e largos, tronco curvado para a frente, braços compridos arrastando, cabeça pequena afundada entre os ombros, algas penduradas. Em preto sólido, deve ser o mais largo dos inimigos comuns, bem diferente da Carcaça.

Frente (cada `#` ≈ 4 px):

```text
      ###
  ###########
 ##############
 ##############
 ##  ######  ##
 ##  ######  ##
 ##   ####   ##
     ##  ##
```

Lado (frente à direita):

```text
     ##
   _####_
  /######\>
  ########
  ##    ##
```

## Medidas por grupo (px)

| Grupo | Elemento | X×Y×Z | Posição |
| --- | --- | --- | --- |
| `leg_l` / `leg_r` | perna | 20×28×18 | x ±16 |
| `body` | torso (hunch 22,5°) | 56×40×30 | y 28 a 68 |
| `body` | ombro caído (novo) | 16×10×28, dois | x ±34, y 56 a 66 |
| `body` | costelas (novo) | 40×4×2 | z +16 |
| `head` | cabeça | 26×22×26 | y 68 a 90 |
| `head` | algas | 24×6×24 | y 90 a 96 |
| `head` | mandíbula caída (novo) | 14×6×10 | z +12, y 68 a 74 |
| `arm_l` / `arm_r` | braço | 16×40×16 | x ±36 |
| `arm_l` / `arm_r` | alga no braço (novo) | 6×18×4 | z +10 |

Total previsto 14 a 16. `hit_socket` no tronco.

## Paleta

`graveGreen`, `graveGreenLight` (algas e pele esverdeada), `boneDark`, `bone` (costelas, dentes), `stoneDark` (sombra fria), `shadow` (matiz). ≤ 12 cores.

## Textura

Aspecto molhado: pontos claros pequenos em `graveGreenLight` nos ombros; gotas escuras abaixo das algas; rasgos na pele e costelas em `bone`; AO de 1 px sob os ombros e na junção braço/tronco; musgo nas arestas.

## Animação (12 fps, assada no VAT)

| Clipe | Nota |
| --- | --- |
| `idle` | balanço lento do corpo ±3°, braços pendurados |
| `walk` | passo pesado, amplitude 30°, body oscila; pés não deslizam (velocidade 2,8 u/s) |
| `attack` | empurrão: ambos os braços a −90° e body à frente |
| `hit` | body −15° |
| `death` | desaba para a frente (body +90°) |

## Não pode mudar

Grupos `root > body > head | arm_l | arm_r` e `root > leg_l | leg_r`; `hit_socket`; os 5 clipes de `enemies`; textura 64×64; altura 1,6 a 1,9 u.
