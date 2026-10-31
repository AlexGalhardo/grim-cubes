# Brief: Sanguessuga (`leech`)

Arquivo: `assets/src/models/enemies/leech.bbmodel` (+ `leech_d.png`, 64×64). Categoria `enemies` (VAT), classe pequena (≤ 10 elementos), altura 0,8 a 1,0 u. Rápido de gruda: gruda no herói e drena 1 HP/s (GDD §10).

## Silhueta

Corpo segmentado deitado, de cauda fina a frente erguida; ventosa circular na frente com a boca escura e dentes em anel; dois ganchos curtos nas laterais da frente; dois pés curtos. Em preto sólido: arco baixo que sobe para a ventosa.

## Elementos (10)

2 pés, 3 anéis + cauda (tronco, `body`), ventosa e boca (`head`), 2 ganchos (`arm_l`/`arm_r`). `hit_socket` no tronco.

## Paleta

`flesh`, `bloodLight`, `blood`, `shadow`, `night` (boca), `bone`/`boneDark` (dentes e ganchos). ≤ 12 cores.

## Textura

Anéis em bandas de `shadow`, brilho de sangue em `bloodLight`, AO de 1 px entre anéis; boca em `night` com dentes `bone`.

## Animação

Os 5 clipes de inimigo sem renomear; `attack` é a mordida (já existente).
