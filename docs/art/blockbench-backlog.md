# Backlog de arte (Blockbench)

Auditoria offline de 2026-10-31 (MCP `blockbench` indisponível na sessão). Fonte: leitura dos 74 `.bbmodel`
(contagem de elementos, bounding box em px, grupos, clipes), capturas de `docs/art/review/` (só 22 modelos têm captura;
os demais foram auditados por geometria) e Art Bible §3, §5–§8, §14 + GDD §10–§12.

Custo: P = até 1 sessão curta, M = 1 a 2 sessões, G = 3+ sessões. Risco = o que o jogo/build depende e não pode quebrar.

## Achados gerais

1. Todos os modelos são **placeholders de cor chapada**: uma cor por cubo, sem pintura de textura (sem AO, desgaste,
   rampa de matiz, rostos). Art Bible §7 exige AO pintada, desgaste e luz do topo; hoje nenhum asset cumpre.
2. Orçamento de elementos subusado: herói 11/24, Mercador 9/28, chefes 12–13/48, inimigos 7–9 (limites 10–20),
   props 3–8 (limite 4/8/16). Há margem para silhueta sem estourar o build.
3. **Bounding boxes contradizem §5.3**: Afogado (54×106×24) é igual à Carcaça (54×104×24), mas deveria ser "largo e
   baixo"; Caçador (38×104×29) é um humanoide em pé, mas deveria ser "quadrúpede longo" (comprimento em Z).
   Carcaça, Vigia e Afogado ficam quase indistinguíveis em preto sólido.
4. Animações têm 1 a 5 animadores por clipe (ex.: `attack` com 2, `hit` com 1): são poses mínimas. O VAT dos inimigos
   herda isso; ganho de leitura é barato porque o VAT é assado e não custa em runtime.
5. Props com 1 grupo e 3 elementos (barril, caixa, urna, lápide 02) leem como "caixas"; a identidade vem só da cor.

## Prioridade 1: herói

| Asset | Problema | Melhoria | Custo | Risco |
| --- | --- | --- | --- | --- |
| `hero/hero` | Captura: cabeça laranja sem rosto nem cabelo, sem olhos; tronco vermelho liso; ombreiras cinza sem desgaste; 11/24 elementos. Lê como boneco genérico, não "Carrasco" robusto. Sem cicatriz, capuz ou cinto. | Blockout: ombreira esquerda maior (assimetria), capuz/máscara de carrasco, cinto, bracelete, bota; usar os 13 elementos livres. Textura 64×64: rampa vermelho-sangue/ferro, AO nos cantos, cicatriz em pixel, ferrugem nas ombreiras. Revisar `dash` (5 animadores, ok) e `victory`. | G | Grupos `root>body>head/arm_l/arm_r/weapon_socket`, `leg_l/leg_r`; clipes obrigatórios; altura 1,9 u (124 px = 1,94, manter); `weapon_socket` na mão |

## Prioridade 2: armas (todas 32 px, 3 a 4 elementos, sem grupos de socket além do raiz)

| Asset | Problema | Melhoria | Custo | Risco |
| --- | --- | --- | --- | --- |
| `weapons/weapon_sword` | 4 elementos, lâmina reta 16×64×6 sem guarda marcada nem desgaste | Lâmina lascada (assimetria), guarda, pomo; textura com fio claro e ferrugem | P | Comprimento 0,6–1,4 u; origem na empunhadura |
| `weapons/weapon_pistol` | 3 elementos, 8×22×30; silhueta de "bloco" | Cão, guarda-mato, cano com boca; textura metal gasto | P | Ponto de saída do projétil (muzzle) depende da ponta em +Z |
| `weapons/weapon_smg` | 4 elementos, quase igual ao pistol em leitura | Carregador curvo em degraus, coronha, mira; diferenciar do pistol | P | Muzzle em +Z |
| `weapons/weapon_mg` | 14×36×61, caixa longa sem alça | Bipé, caixa de munição lateral, cano ventilado | M | Muzzle em +Z; peso visual vs. herói |
| `weapons/weapon_bazooka` | 20×30×68, tubo reto | Boca alargada, ombreira, alça frontal; marcação de perigo (laranja só nos tokens) | M | Muzzle em +Z; ≤ 8 elementos |

## Prioridade 3: inimigos 1–8 (64 px/u, VAT: clipes `idle walk attack hit death` obrigatórios)

| Asset | Problema | Melhoria | Custo | Risco |
| --- | --- | --- | --- | --- |
| `enemies/husk` (Carcaça) | Bbox 54×104×24 ereta; §5.3 pede humanoide curvado; 8 elementos | Tronco inclinado à frente, ombro caído, braço esticado; textura pele mortiça com rasgos | M | `hit_socket`; altura 1,6–1,9 u; VAT |
| `enemies/wail` (Lamento) | Captura: cabeça enorme bege com 2 olhos vermelhos, corpo escuro quase invisível; silhueta boa mas sem boca/grito | Boca aberta (buraco pintado), corpo fino com trapos; olhos no `_e.png` | P | Altura 0,8–1,0 u (58 px = 0,9 ok); rápido: `walk` em zigue-zague precisa ler |
| `enemies/drowned` (Afogado) | Placeholder já corrigido no gerador (branch `art/placeholders-ao`): torso 56×30, pernas 20, `legH` 28; falta identidade (sem algas, rosto, textura molhada) | Seguir `docs/art/briefs/drowned.md`: ombros caídos, algas em degraus, textura azul-musgo úmida | M | Peso do tanque; altura 1,6–1,9 u; mesmos grupos do biped |
| `enemies/leech` (Sanguessuga) | 7 elementos, 44×52×42: não confirmado como cilindro segmentado | Segmentos escalonados (anéis), ventosa frontal, brilho de sangue emissivo | M | Gruda: precisa de escala pequena (0,8–1,0 u); `attack` = mordida |
| `enemies/forged` (Forjado) | 82×142×32, ombros grandes mas só 9/20 elementos, sem armadura visível | Ombreiras com pontas, placa peitoral, braço martelo; textura ferro com brasa nas juntas | M | Armadura 10 deve ler como metal; altura 2,2–2,6 u |
| `enemies/watcher` (Vigia) | 38×106×32 lembra humanoide fino, não "torre com olho"; fixo (sem `walk` útil) | Base larga, haste, olho grande emissivo no topo; `attack` = carga do olho | M | Fixo: `walk` mantém o clipe obrigatório mas pode ser quase `idle`; ponto de disparo do projétil |
| `enemies/hunter` (Caçador) | Placeholder já quadrúpede no gerador (branch `art/placeholders-ao`): 100 px em Z por 78 de altura; pernas traseiras = `leg_l/leg_r`, dianteiras = `arm_l/arm_r`, sem grupo novo, `REQUIRED_CLIPS` intactos; falta dorso curvo, cabeça de predador e textura | Seguir `docs/art/briefs/hunter.md` | M | Manter os nomes dos grupos e o `walk`; `hit_socket`; investida a cada 3 s precisa ler |
| `enemies/breeder` (Reprodutor) | 92×138×58, 9 elementos; precisa de "saco inchado com pernas curtas" e ponto de onde sai o Lamento | Saco com casca/ovos, boca-útero, pernas curtas; `attack` = expelir | M | `hit_socket`; altura 2,2–2,6 u; spawn do Lamento usa a posição do modelo |

## Prioridade 4: chefes (64 px/u, ≤ 48 elementos, clipes `idle walk enrage phase_change death_execution`)

| Asset | Problema | Melhoria | Custo | Risco |
| --- | --- | --- | --- | --- |
| `bosses/gravedigger` (Coveiro) | Captura: caixa de tronco + pá fina; 12/48 elementos, rosto vazio, sem escala de chefe (silhueta parece herói gordo) | Capuz, cabeça, pá enorme em arco, lanterna, ombros assimétricos, terra pintada; mais massa nas pernas | G | Altura 4–6 u (296 px = 4,6); pá é o telégrafo do golpe em arco; `hit_socket` |
| `bosses/swamp_matriarch` | 13/48, 216×304×79 | Cabeça com tentáculos/raízes, saco de sanguessugas nas costas, saia de lodo; `phase_change` e grito visíveis | G | Solta Sanguessugas: ponto de spawn; escala 4–6 u |
| `bosses/forgemaster` (Forjador) | 13/48, 250×286×106 | Martelo gigante, avental, correntes nos braços (4 direções), forja no peito emissiva; fase 2 com placas | G | Martelo = onda radial; armadura 30 na fase 2 precisa de leitura |

## Prioridade 5: Mercador

| Asset | Problema | Melhoria | Custo | Risco |
| --- | --- | --- | --- | --- |
| `npc/bone_merchant` | Captura: capuz bege + manto escuro, 9/28 elementos, pouca identidade | Crânio sob capuz, mão estendida, bolsa de ossos, lanterna; `emerge`/`submerge` do chão com mais keyframes (hoje 1 animador) | M | `weapon_socket` (a loja usa); 2,3 u (152 px = 2,4, ajustar); 5 clipes obrigatórios |

## Prioridade 6: props (32 px/u; limite de elementos pequeno 4, médio 8, grande 16)

| Grupo | Assets | Problema | Melhoria | Custo | Risco |
| --- | --- | --- | --- | --- | --- |
| Cemitério (capturados) | `prop_tombstone_01/02`, `prop_cross_01`, `prop_urn_01`, `prop_bone_01`, `prop_bonepile_01`, `prop_dead_tree_01`, `prop_fence_01`, `prop_crypt_01`, `prop_grass_01` | 3 a 5 elementos, cores chapadas; lápide 02 e cruz sem lascas/musgo | Lascas, rachaduras e musgo pintados; topo arredondado em degraus; fence com ripas faltando; dead_tree com galhos em 45° | M (lote) | Teto por classe; sem grupos a mudar |
| Pântano | `prop_swamp_*` (8), `prop_reeds_01`, `prop_mushroom_01` | Idem; `reeds` 13×38×9 é fino demais a 32 px | Juncos em feixe, cogumelos com chapéu escalonado | M (lote) | Sem requisitos de grupo |
| Forja | anvil, furnace, chimney, spire, gearpile, slag, emberrock, pipe, cable, chain, circuit, antenna, tank, canister, crate, barrel, mesh | Chimney (126) e spire (168) são altos para "prop"; bigorna com 4 elementos sem bico | Bigorna com bico e base; brasas emissivas em `_e.png` | M (lote) | Props grandes ≤ 16; emissivos separados |
| Ninho | `prop_egg_01`, `prop_eggcluster_01`, `prop_pod_01` | Ovos como cubos lisos | Casca com rachadura, membrana emissiva | P | Reprodutor/Rainha reutilizam o visual |

## Prioridade 7: tiles (32×32, 1 cubo, 4 variantes por bioma)

| Asset | Problema | Melhoria | Custo | Risco |
| --- | --- | --- | --- | --- |
| `tiles/tile_{cemetery,swamp,forge,nest}_01..04` | 1 elemento; as capturas mostram variação mínima, risco de repetição visível | Pintar a textura: ruído estruturado (dithering permitido em chão), pedras/lama/placas/carne; variantes com marcas distintas; bordas sem costura | M por bioma | Tileabilidade nas 4 bordas; ≤ 12 cores; 32 px; cores da §3.2 por bioma |

## Ordem recomendada das 5 primeiras melhorias

1. Herói (`hero/hero`): maior retorno visual, aparece o tempo todo.
2. Caçador e Afogado: corrigem as bboxes que contradizem §5.3 e destravam a leitura em preto sólido a 64 px.
3. Coveiro (primeiro chefe, PROTÓTIPO): é o único chefe no escopo atual.
4. Carcaça + Lamento: inimigos mais frequentes (bioma 0) e os mais visíveis no começo do jogo.
5. Armas (pistol, smg, sword): ficam na mão do herói em toda tela.

## Ganhos baratos no gerador (propostos, não aplicados)

- Em `tools/assets-gen/catalog.ts`, corrigir a bbox do Afogado (largo e baixo) e do Caçador (comprimento em Z): é
  mudança de dimensões em placeholders ainda não refinados, e o teste de escala cobre. Evita trabalho manual depois.
- Em `tools/assets-gen/biped.ts`, uma textura de gerador com AO de 1 px nas bases e rampa de matiz (sombra azul/roxa)
  melhora todos os placeholders de uma vez. Pergunta para o Orq: aplico? (Nada alterado nesta sessão.)
