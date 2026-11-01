# Brief: tocha e fogueira

Arquivos: `assets/src/models/props/prop_torch_01.*` e `prop_bonfire_01.*` (+ `_d.png`, `_e.png`), 32 px por unidade, textura 32x32, classe `medium` (8 elementos).

| Prop | Altura | Elementos | Dados |
| --- | --- | --- | --- |
| `prop_torch_01` | 2,0 u | 7 (base, poste com faixas, atadura, copa, duas chamas, espeto) | `decor`, raio 0,15, sem colisão; em todos os biomas |
| `prop_bonfire_01` | 0,94 u, cerca de 1,4 u de largura | 8 (4 toras cruzadas, caveira, fêmur, duas chamas) | `blocking`, raio 0,45; Cemitério e Forja |

- Paleta: ferro escuro e ferrugem na tocha; madeira escura (`wood`/`woodD`) e ossos na fogueira; fogo só em `ember` e `emberLight`.
- O `_e.png` sai do `tools/assets-gen/emissive.ts` e cobre só o fogo, para o brilho do S1 acender as chamas e não o poste nem as toras.
- Rotações de elementos em múltiplos de 22,5 graus (regra do pipeline).
