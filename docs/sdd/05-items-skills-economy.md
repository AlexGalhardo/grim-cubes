# SDD 05 — Itens, skills e economia

Requisitos: GDD §14–§20, §25.

## 1. Dados como fonte única

Todos os números vivem em `data/*.json`, validados por JSON Schema (`data/schema/*.schema.json`) no build (`bun run data:check`) e carregados por loaders tipados (`packages/game/src/data`). O simulador (`tools/sim`) e o jogo usam os mesmos loaders.

Os loaders importam os JSON (`resolveJsonModule`; `rootDir: "../.."` só no `tsconfig` de `packages/game`) e os atribuem a tipos explícitos (`heroData: HeroData = heroJson`). Se um arquivo mudar de forma, `bun run typecheck` falha; o `data:check` valida os valores. `toEnemyDefs` e `toBiomeDefs` convertem para as defs dos sistemas. `apps/web` e `tools/*` importam de `@gc/game`, nunca o JSON cru.

| Arquivo | Conteúdo |
| --- | --- |
| `hero.json` | stats base do herói, caps, fórmulas (armadura, regen, gatilho de roubo de vida), dash, combate (i-frames, contato, knockback, prioridade de alvo), raio |
| `heroes.json` | as três classes (S-20-01): Warrior, Ranged e Mage, cada uma com arma fixa, sobreposições dos stats base de `hero.json`, passiva e `tint`; o Warrior é o padrão |
| `world.json` | chunk, raios de carga/descarga, chunks por passo, pool, limiar de origin shift, props por chunk (SDD 03) |
| `props.json` | props: `id`, `sizeClass` (orçamento de elementos, Art Bible §5.1), `kind` |
| `enemies.json` | 8 tipos: hp/dano base e incremento, velocidade, `walkRefSpeed`, raio, `sizeClass`, behavior, fragmentos, bioma |
| `elites.json` | 4 modificadores |
| `bosses.json` | 10 chefes, um a cada 5 rounds (5 a 50): HP, padrões e fase de entrega (o dano de contato e de projétil fica em `rounds.json` `boss`) |
| `weapons.json` | as três armas das classes (espada, bumerangue, machado mágico); o nível acompanha o nível do herói. Pistola, SMG, metralhadora e bazuca continuam no arquivo para os testes do sistema de arma e não entram na run |
| `cards.json` | 12 cartas de level-up + regra de carta dupla |
| `ossuary.json` | os preços da árvore de magias (`levelCosts`, um por nível de 2 a 10) e o corte da demo (`demoMaxLevel`); os nós saem de `spells.json` (S-22-01) |
| `spells.json` | as seis magias de cada classe (4 automáticas, cura e super), a escala por nível e a carga da super (S-20-02) |
| `rounds.json` | duração, fluxo da run, chefe (enrage, horda, dano), IA (`ai`), fórmulas de spawn, mistura de biomas, fragmentos, XP, loja (saltos de nível e fatores de preço), almas, dificuldades |
| `equipment.json` | 6 slots de equipamento, 10 níveis cada com os atributos e o preço em ouro até `goldMaxLevel`, e o custo em materiais dos níveis acima |
| `biomes.json` | ver SDD 03 |

Modificadores de stat usam um formato único:

```json
{ "stat": "armor", "op": "add", "value": 3 }
{ "stat": "damage", "op": "add", "value": 0.05 }
{ "stat": "max_hp", "op": "mul", "value": 0.7 }
```

Ordem de aplicação em `statsSystem`: base → `add` (somatório) → `mul` (produto) → caps. Efeitos especiais (`on_kill_explode`, `revive_once`, `bleed_on_crit`, …) são ids enumerados em `rules/effects.ts`, cada um com handler puro e teste.

## 2. PlayerStats

Objeto plano recalculado quando `dirty` (compra, carta, nó do Ossuário, item): `{ maxHp, hpRegen, lifeSteal, damage, attackSpeed, critChance, critMult, range, armor, dodge, speed, luck, harvest, pickupRadius, xpGain, shopPrice, explosionSize, knockback, enemySpeed, bossDamage, freeRerolls }`. Unidades: percentuais como fração (0,05 = +5%); `speed` e `pickupRadius` já em u/s e u (base de `hero.json` × (1 + soma dos `add`) × `mul`); `range` em u somado; `armor`, `luck`, `harvest` e `hpRegen` em pontos. O mapeamento `stat` → campo fica em `STAT_FIELDS` (`rules/stats.ts`). Caps conforme GDD §14 aplicados no final. Snapshot vai ao store para a UI mostrar deltas na loja.

## 3. Loja

A loja vende só equipamento (ADR-0030, S-21; `data/equipment.json`, GDD §17). `createShopSystem` guarda `levels[]` (nível de 0 a 10 de cada slot, na ordem do arquivo), as ofertas `ShopSlot { slot, level, price, locked, sold }` e o contador de rerolls.

- `generateShop(ctx, keep)` (`rules/shop.ts`): uma oferta por slot ainda abaixo de `goldMaxLevel`, de nível `equipado + 1 + salto`, com `salto` sorteado em `0..min(maxJump, floor(round / jumpEveryRounds))` no stream `shop` (a sorte dá um segundo sorteio, fica o maior) e no máximo `goldMaxLevel`: nunca peça pior que a equipada. Ofertas travadas e ainda válidas sobrevivem.
- `shopPrice(base, round, shopPrice%)` e `rerollPrice(round, k)` em `rules/shop.ts` (fórmulas GDD §17.2); `base` é o preço do nível em `equipment.json`.
- Comprar: iguala `levels[slot]` ao nível da oferta, paga o preço e chama `stats.setEquipment(equipmentModifiers(...))`. Os atributos da peça substituem os da anterior; ficam fora de `stats.modifiers`, então o checkpoint guarda os níveis, não modificadores.
- Lock: grátis; oferta travada sobrevive à próxima loja com o mesmo preço enquanto o nível ainda for maior que o equipado.

## 4. Level-up

`xpForLevel(config, L) = 10 + 8 (L−1)` é a XP para passar do nível L para L+1 (GDD §16.1). O `pickupSystem` (e a colheita) acumula XP e soma `pendingLevelUps` a cada nível cruzado. O `levelUpSystem`, durante `Round`/`BossRound`, pausa a run (`Paused`), emite `LevelUp` e apresenta as cartas; com vários níveis pendentes, as ofertas se encadeiam. `drawCards(rng.cards, config, level)`: 3 cartas distintas do pool; a partir do nível 10, 10% de chance por slot de carta dupla, que são 2 cartas diferentes a 50% do valor cada (GDD §16.2). A escolha aplica os modificadores no `statsSystem` (`dirty`).

## 5. Almas e Ossuário

- `rules/souls.ts`: `soulsForRun(roundsCompleted, elites, bossKills[], difficulty, modifiers)` conforme GDD §18.2. Creditadas em `MetaState.souls` na tela de resultado (e em abandono, sem bônus).
- `buildOssuaryTree(ossuary, spells)` (`rules/ossuary.ts`) monta os quadrados: 3 classes × 6 magias × 9 níveis (2 a 10), cada um com `requires` (o nível de baixo) e `cost`. `MetaState.ossuary: Record<nodeId, true>` com `nodeId = <magia>_<nível>`; o nível de uma magia é 1 mais o maior quadrado dela que a conta tem (`spellLevel`) e a sessão o lê ao montar as magias da classe (`buildClassSpells`). O Ossuário não gera mais modificadores nem flags da run: o dash vem liberado e as outras alavancas da árvore antiga saíram.
- Reset: devolve 100% das almas (somatório dos custos), limpa o record.
- Demo: `meta.isDemo` limita compra aos 2 primeiros nós de cada ramo (`node.index <= 1`).

## 6. Simulador de balanceamento (`tools/sim`)

- `bun run sim [--runs N] [--seed S] [--rounds R] [--difficulty normal] [--hero warrior|ranged|mage] [--policy greedy|kite|tank] [--ossuary <nós>] [--jobs J] [--out arquivo.json] [--check]` roda `game` em Node sem render, com o mesmo `simulate`. Sem `--policy`, `policyForHero` escolhe greedy para o Warrior e o Mago e kite para o Ranged. A run `i` usa a seed `S + i`; as runs se dividem em worker threads (`--jobs`, padrão até 8). Flags desconhecidas falham.
- Políticas (`tools/sim/policy.ts`, B-02-02): `greedy` (padrão, valor de dano) e `tank` (`--policy tank`, relatório `tank-kite`, arquivo `...-tank.json`): pesa HP máximo, armadura, regeneração e roubo de vida várias vezes mais, valoriza `revive_once` e os efeitos de sobrevivência, compra menos upgrades de arma, fica parada e luta com a vida alta, foge do centro dos inimigos abaixo de 30% de vida (ou de 60% com algo em cima), cede terreno numa multidão com a vida abaixo de 80% e gasta o dash quando está ferida e cercada. O orçamento de passos por round é de 150 s (90 s na greedy), porque a luta contra os chefes dura mais. A greedy não mudou: os hashes das runs ficam iguais.
- Saída: `reports/sim-<data>-seed<S>-runs<N>.json` (ignorado pelo git; relatórios de fechamento commitados usam outro nome, ex.: `reports/balance-a0203-final.json`) e um resumo no terminal: distribuição do round de morte (p50, IQR, quantas ficaram vivas), tempo de kill e pilhas de fúria por chefe, ouro/preço e level-ups por round.
- `tools/sim/tune.ts` roda a simulação em memória com overrides temporários dos dados (HP e dano dos inimigos, HP e padrões dos chefes, grupos de `rounds.json`) para experimentar sem editar `data/*.json`; nada é gravado, e os números vencedores são copiados à mão para o JSON.
- Alvos (`tools/sim/report.ts`, GDD §25.3, S-26): p50 de morte 18–26 / 14–22 / 11–18 em Normal / Grim / Nightmare para bot que não é tank; IQR ≤ 25; no máximo 45% das runs vivas (`ALIVE_LIMIT`); kill do chefe 12–120 s no round 5, 25–90 s no Coveiro (round 10), 40–120 s nos rounds 15 e 20, e 40–180 s do round 25 em diante quando o bot não é tank; fúria < 3; ouro por preço da peça 1–1,6; level-ups/round 1–2. Chefe que ninguém matou não tem tempo de kill para julgar. Com `--check`, alvo falho encerra com código 3. O CI (`balance.yml`) roda o Warrior em Normal, seeds 1 e 1001, 64 runs × 35 rounds. A matriz local das três classes está em `reports/balance-<classe>-<dificuldade>-s<seed>.json`.
- Velocidade alvo: ≥ 10.000 rounds/min em Node (sem render, sem VFX).

## 7. Testes

- `rules/*`: tabelas de casos com valores do Brotato como oráculo (preço, reroll, tier).
- `statsSystem`: ordem add/mul/caps; armadura negativa.
- Loja: garantias dos rounds 1–2; lock persiste; venda de arma devolve 50%.
- Ossuário: `requires`, 162 quadrados e o custo total, reset devolve tudo, demo bloqueia os níveis acima de `demoMaxLevel`; a migração do save devolve as almas da árvore antiga.
- Schema: todo JSON valida; ids únicos; referências cruzadas existem (`enemyPool` aponta para ids válidos).
