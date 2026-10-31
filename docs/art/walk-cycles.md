# Ciclos de caminhada: ajuste anti-deslize

Fórmula: com a perna de comprimento `L` (px, do quadril ao chão) girando `±θ` num ciclo de `T` segundos, o pé fica no chão metade do ciclo e se afasta do corpo `2·L·sin θ`, ou seja a velocidade de passada é `4·L·sin θ / T`. O pé não desliza quando ela é igual à velocidade de referência `v` (`walkRefSpeed` em `data/enemies.json`, `speed` em `data/bosses.json`) vezes 64 px/u. O jogo escala a reprodução por `|velocidade| / walkRefSpeed` (`hordeRenderer`).

| Modelo | L (px) | v (u/s) | T (s) | θ (°) | passada (px/s) | alvo (px/s) | deslize |
| --- | --- | --- | --- | --- | --- | --- | --- |
| husk | 44 | 3.5 | 0.4167 | 32 | 224 | 224 | 0% |
| wail | 25 | 5.5 | 0.25 | 52 | 315 | 352 | 10% |
| drowned | 28 | 2.8 | 0.333 | 32 | 178 | 179 | 1% |
| leech | 20 | 4.5 | 0.25 | 55 | 262 | 288 | 9% |
| forged | 54 | 3.0 | 0.5 | 26 | 189 | 192 | 1% |
| hunter (traseiras) | 32 | 6.5 | 0.25 | 50 | 392 | 416 | 6% |
| hunter (dianteiras) | 54 | 6.5 | 0.25 | 30 | 432 | 416 | 0% |
| breeder | 40 | 2.0 | 0.5 | 24 | 130 | 128 | 0% |
| gravedigger | 120 | 2.4 | 1.3333 | 25 | 152 | 154 | 1% |
| swamp_matriarch | 90 | 2.0 | 1.1667 | 25 | 130 | 128 | 0% |
| forgemaster | 100 | 1.8 | 1.5 | 25 | 113 | 115 | 2% |
| alpha_hunter (traseiras) | 120 | 4.2 | 0.6667 | 22 | 270 | 269 | 0% |
| alpha_hunter (dianteiras) | 206 | 4.2 | 0.6667 | 13 | 278 | 269 | 0% |
| nest_queen | 110 | 2.2 | 1.3333 | 25 | 139 | 141 | 1% |

Pernas alongadas: o `wail` e a `leech` ganharam pernas mais longas (do quadril ao chão, 16 para 25 px no `wail`, 12 para 20 px na `leech`), mantendo a altura total dentro da faixa do §5.1 (`wail` 63 px = 0,98 u, com o tronco encurtado de 14 para 10 px; `leech` 58 px = 0,91 u, com o corpo subindo 8 px). Com o ciclo mínimo do VAT (3 quadros, 0,25 s) e amplitudes de 52° e 55°, o deslize cai a cerca de 10%. As patas traseiras do `hunter` (6%) ficam como estão. O `watcher` é fixo (`walk` quase parado, ±4°) e o `breeder` anda a 2 u/s no `enemies.json`.

`attack` dos inimigos agora tem antecipação: o braço (e o corpo, já existente) recua primeiro (`-50°` no editor, `+50°` no arquivo) e só então vai à frente (`+100°` no editor, `-100°` no arquivo). Nos chefes, `idle` passa a 1 s (respiração mais pesada) e `walk` ganha o balanço do corpo (2 px).

As chaves do `walk` são senoides amostradas a cada 1/12 s nos inimigos (o VAT assa a 12 fps) e a cada 1/24 s nos chefes, com o ciclo `T` dividido em quadros inteiros, para que o Blockbench (que prende as chaves a 24 fps) não deforme o ritmo.
