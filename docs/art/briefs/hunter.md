# Brief: Caçador (`hunter`)

Arquivo: `assets/src/models/enemies/hunter.bbmodel` (+ `hunter_d.png`, 64×64). Categoria `enemies` (VAT), 64 px/u, orçamento de 16 a 20 elementos. O placeholder do gerador (branch `art/placeholders-ao`) já é quadrúpede: 100 px em Z por 78 de altura.

## Silhueta-alvo

Predador baixo e longo: dorso arqueado, cabeça de focinho comprido com crista, patas dianteiras longas em garra, cauda curta. Reconhecível pelo comprimento horizontal e pelo dorso curvo.

Lado (frente à direita), cada `#` ≈ 4 px:

```text
        ___
   ____/###\__
 _/#########  \=>
 ###########  ###
  ##      ##   ##
  ##      ##   ##
```

Topo:

```text
    ##    ##
   ############>
    ##    ##
```

## Medidas por grupo (px)

| Grupo | Elemento | X×Y×Z | Posição |
| --- | --- | --- | --- |
| `leg_l` / `leg_r` (traseiras) | coxa | 10×32×10 | x ±8, z −32 |
| `leg_l` / `leg_r` | pé com garra (novo) | 10×4×14 | y 0, z −28 |
| `body` | torso | 22×26×80 | y 32 a 58 |
| `body` | dorso arqueado (novo, rot. 22,5°) | 16×8×36 | y 58 a 66, z 0 |
| `body` | espinhos (novo) | 4×6×4, três | y 66, z −20, 0, 20 |
| `body` | cauda (novo) | 6×6×20 | z −50 |
| `head` | crânio | 20×20×26 | z 50, y 58 a 78 |
| `head` | focinho (novo) | 12×10×14 | z 70, y 60 a 70 |
| `head` | crista | 14×4×4 | y 78, z 64 |
| `arm_l` / `arm_r` (dianteiras) | pata | 8×54×8 | x ±15, z 32 |
| `arm_r` | garra | 6×10×6 | y 0, z 36 |

Total previsto 18 a 20. `hit_socket` no tronco (z +41, frente do torso).

## Paleta

`ironDark` (patas), `flesh` (torso), `iron` (cabeça, garras), `bone` (presas e espinhos), `bloodLight` (olhos, emissivo no `_e.png`), `shadow` (matiz de sombra). ≤ 12 cores.

## Textura

Pelagem pintada em faixas escuras no dorso, barriga clara; cicatriz diagonal no flanco; garras e presas lascadas em `bone`; AO de 1 px sob o torso e nas juntas das patas; olhos em `bloodLight`.

## Animação (12 fps, assada no VAT)

| Clipe | Nota |
| --- | --- |
| `idle` | respiração: body ±3°, cabeça balança |
| `walk` | trote: `leg_l` com `arm_r` e `leg_r` com `arm_l` em fase; amplitude 35°; pés não deslizam (velocidade 6,5 u/s) |
| `attack` | recua o corpo e investida: body −10° e +10°, arm_r a −100° |
| `hit` | body −15° seco |
| `death` | body +90° e root desce |

## Não pode mudar

Grupos `root > body > head | arm_l | arm_r` e `root > leg_l | leg_r` (as pernas traseiras são `leg_*`, as dianteiras `arm_*`); `hit_socket`; os 5 clipes de `enemies`; textura 64×64; sem grupos novos (não mexer em `REQUIRED_CLIPS`).
