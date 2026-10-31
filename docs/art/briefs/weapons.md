# Brief: armas

Arquivos: `assets/src/models/weapons/weapon_{sword,pistol,smg,mg,bazooka}.bbmodel` (+ `_d.png`, 32×32). Escala 64 px/u, tamanho 0,6 a 1,4 u, orçamento 8 elementos (hoje 3 a 4). Origem na empunhadura; o cano aponta para +Z.

## Silhuetas-alvo

Cada arma distinta em preto sólido. Lado (frente à direita), cada `#` ≈ 4 px:

```text
sword      pistol     smg         mg            bazooka
  ^         ____       _______    __=======     ==========>
  #        |####>     |#######>  |###[bipod]>   (#########)>
  #         ##         ## #       ## ##          ##
 -#-
  #
```

## Medidas por arma (px)

| Arma | Elemento | X×Y×Z |
| --- | --- | --- |
| `weapon_sword` | cabo | 4×12×4 |
| | guarda assimétrica | 18×4×6 |
| | pomo | 8×6×6 |
| | lâmina lascada (2 degraus) | 6×44×2 e 4×8×2 |
| `weapon_pistol` | empunhadura | 6×14×8 |
| | corpo | 8×8×24 |
| | cão (novo) | 3×4×4 |
| | guarda-mato (novo) | 6×2×8 |
| | boca do cano | 4×4×8 |
| `weapon_smg` | empunhadura | 6×14×8 |
| | corpo | 10×10×34 |
| | carregador em 2 degraus (novo) | 6×18×6 e 6×6×6 |
| | coronha (novo) | 6×8×10 |
| | cano | 4×4×10 |
| `weapon_mg` | empunhadura | 6×14×8 |
| | corpo | 12×12×40 |
| | cano com ventilação (novo) | 6×6×22 |
| | caixa de munição lateral | 14×10×12 |
| | bipé (novo) | 2×10×2, dois |
| `weapon_bazooka` | empunhadura | 6×14×8 |
| | tubo | 16×16×56 |
| | boca alargada | 20×20×10 |
| | alça frontal (novo) | 4×10×4 |
| | ombreira traseira | 12×12×6 |

## Paleta

`iron`, `ironDark`, `ironLight`, `rust`, `boneDark` (cabos), `emberLight` só em detalhe de perigo no bazooka. ≤ 12 cores.

## Textura

Metal com arestas claras em `ironLight` e ferrugem (`rust`) nas bordas; AO de 1 px sob guarda e carregador; lâmina com fio claro e lascas escuras; sem preto puro.

## Animação

Armas são estáticas (sem clipes). O movimento vem do herói (`attack_melee` balança a espada; `attack_ranged` mantém a pose).

## Não pode mudar

Origem na empunhadura, cano em +Z (ponto de saída do projétil), comprimento 0,6 a 1,4 u, textura 32×32 `_d.png`, orçamento de 8 elementos, registro em `authored.json` de cada arma refinada.
