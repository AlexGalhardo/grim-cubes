# Brief: Carcaça (`husk`)

Arquivo: `assets/src/models/enemies/husk.bbmodel` (+ `husk_d.png`, 64×64). Categoria `enemies` (VAT), 64 px/u, altura 1,6 a 1,9 u (hoje 104 px = 1,6), orçamento 16 elementos (hoje 8). Inimigo mais frequente do bioma 0: persegue em linha reta (3,5 u/s).

## Silhueta-alvo

Humanoide curvado: ombro caído, tronco inclinado, um braço esticado à frente e o outro pendurado, cabeça inclinada. Magro, trapos e uma costela à mostra.

Lado (frente à direita), cada `#` ≈ 4 px:

```text
     __
    /##\
   ####/
  #####====>
  ####
   ## ##
   ## ##
```

Frente:

```text
     ###
   #######
  ##|####|##
  ## #### ##
     ####
     ## ##
     ## ##
```

## Medidas por grupo (px)

| Grupo | Elemento | X×Y×Z | Posição |
| --- | --- | --- | --- |
| `leg_l` / `leg_r` | perna | 14×44×14 | x ±9 |
| `leg_l` / `leg_r` | pé (novo) | 14×4×18 | z +2 |
| `body` | torso (hunch 22,5°) | 30×38×18 | y 44 a 82 |
| `body` | trapo na cintura | 32×8×20 | y 50 |
| `body` | costelas | 20×14×4 | z +11 |
| `head` | cabeça | 22×22×22 | y 82 a 104 |
| `head` | mandíbula solta (novo) | 14×4×10 | z +10 |
| `arm_l` | braço pendurado | 12×46×12 | x −21 |
| `arm_r` | braço esticado (rotação 45° no clipe) | 12×46×12 | x +21 |
| `arm_r` | mão em garra (novo) | 10×6×10 | y fim do braço |

Total previsto 12 a 14. `hit_socket` no tronco.

## Paleta

`boneDark` (pele e torso), `bone` (cabeça, costelas, dentes), `graveGreen` (trapo, mofo), `stoneDark` (pernas), `bloodLight` (mancha), `shadow` (matiz). ≤ 12 cores.

## Textura

Rasgos de pele em `boneDark` escuro, costela em `bone` lascada, manchas de sangue seco em `blood`, mofo em `graveGreen` nos ombros; AO de 1 px sob o trapo e nas axilas; olhos sem brilho.

## Animação (12 fps, assada no VAT)

| Clipe | Nota |
| --- | --- |
| `idle` | oscila em pé, cabeça pende ±3° |
| `walk` | arrasta os pés, amplitude 30°, braço esticado fixo; pés sem deslizar (3,5 u/s) |
| `attack` | arm_r a −100° e body +10° (lunge) |
| `hit` | body −15° |
| `death` | cai (body +90°); interrompido pelo desmembramento após 0,2 s |

## Não pode mudar

Grupos `root > body > head | arm_l | arm_r` e `root > leg_l | leg_r`; `hit_socket`; os 5 clipes de `enemies`; textura 64×64; altura 1,6 a 1,9 u.
