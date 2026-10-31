# Brief: segunda passada do Caçador Alfa e da Rainha do Ninho

Arquivos: `assets/src/models/bosses/alpha_hunter.bbmodel` e `nest_queen.bbmodel` (+ `_d.png`, 64×64). Chefes de late game (rounds 40 e 50, GDD §12.1), os que mais aparecem no fim da run. Mesmos grupos, sockets, clipes e orçamento de 48 elementos; alturas e larguras do §5.1 (4 a 6 u de altura, 3 a 4 u de largura).

## Caçador Alfa: leitura da furtividade

`stealth` deixa o Alfa invisível por 3 s; o que sobra na tela tem de bastar para o jogador achar e temer o chefe.

- **Placas laterais** (4 por lado, `ironLight` com ferrugem) que quebram o contorno do flanco: lê como caçador blindado, mesmo meio transparente.
- **Olhos em fenda** `bloodLight` (dois) sob uma sobrancelha `ironDark`, no lugar do visor contínuo; é o que o `_e.png` acende. É o rosto do `thermal_vision`.
- **Chifres curtos** de osso na nuca, para a silhueta de cima.
- **Camuflagem pintada**: manchas `mist` no flanco e veias `bloodLight` no dorso; contraste suficiente para a silhueta sumir no escuro e as veias não.
- Mantém 5 espinhos e a cauda em três partes; patas e grupos intactos.

## Rainha do Ninho: abdômen visível de frente

Hoje o abdômen fica atrás do tronco e some de frente. A Rainha tem de ler como "mãe de ovos" já na primeira olhada.

- **Arco do abdômen** em dois blocos sobre as costas (`arch_a`, `arch_b`), mais largo que a cabeça (±56 px), de modo que aparece dos dois lados dela e acima dos ombros.
- **Bolsas laterais** (`sac_l`, `sac_r`) atrás dos braços, com pústulas `bloodLight` e ovos de osso à vista.
- **Pústulas frontais** `bloodLight` nas faces voltadas para a frente do arco (as que o jogador vê).
- Asas, cauda, chifres e braços como estão (largura máxima 240 px, dentro de 4 u).

## Paleta (≤ 12 cores por textura)

Alfa: `ironDark`, `iron`, `ironLight`, `flesh`, `bone`, `bloodLight`, `blood`, `mist`, `shadow`, `night`, `rust`.
Rainha: `flesh`, `bloodLight`, `blood`, `bone`, `boneDark`, `ironDark`, `emberLight` (membrana), `shadow`, `night`.

## Critérios

`assets:build` passa; a lista de sockets e os 5 clipes de chefe seguem; o `_e.png` regenerado por `tools/assets-gen/emissive.ts`; capturas de frente, lado e 3/4; silhueta em preto sólido a 64 px de frente e de lado.
