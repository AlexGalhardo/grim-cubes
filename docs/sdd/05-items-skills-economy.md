# SDD 05 — Itens, skills e economia

Requisitos: GDD §14–§20, §25.

## 1. Dados como fonte única

Todos os números vivem em `data/*.json`, validados por JSON Schema (`data/schema/*.schema.json`) no build (`bun run data:check`) e carregados por loaders tipados (`packages/game/src/data`). O simulador (`tools/sim`) e o jogo usam os mesmos loaders.

| Arquivo | Conteúdo |
| --- | --- |
| `enemies.json` | 8 tipos: hp/dano base e incremento, velocidade, raio, behavior, fragmentos, bioma |
| `elites.json` | 4 modificadores |
| `bosses.json` | 5 chefes: HP, dano, fases, padrões |
| `weapons.json` | 5 armas: stats por tier, preços |
| `items.json` | 40 itens: tier, modificadores de stat, efeitos especiais (por id de efeito), preço base |
| `cards.json` | 12 cartas de level-up + regra de carta dupla |
| `ossuary.json` | 5 ramos × 6 nós: custo, modificadores, efeitos |
| `rounds.json` | duração, fórmulas de spawn, chance de tier, drop de fragmento, dificuldades |
| `biomes.json` | ver SDD 03 |

Modificadores de stat usam um formato único:

```json
{ "stat": "armor", "op": "add", "value": 3 }
{ "stat": "damage", "op": "add", "value": 0.05 }
{ "stat": "max_hp", "op": "mul", "value": 0.7 }
```

Ordem de aplicação em `statsSystem`: base → `add` (somatório) → `mul` (produto) → caps. Efeitos especiais (`on_kill_explode`, `revive_once`, `bleed_on_crit`, …) são ids enumerados em `rules/effects.ts`, cada um com handler puro e teste.

## 2. PlayerStats

Objeto plano recalculado quando `dirty` (compra, carta, nó do Ossuário, item): `{ maxHp, hpRegen, lifeSteal, damage, attackSpeed, critChance, critMult, range, armor, dodge, speed, luck, harvest, pickupRange, xpGain, shopPrice, explosionSize, knockback, enemySpeed, bossDamage, freeRerolls }`. Caps conforme GDD §14 aplicados no final. Snapshot vai ao store para a UI mostrar deltas na loja.

## 3. Loja

Estado `ShopState { slots: Slot[4], rerollCount, locked: boolean[4], gold }`.

- `generateShop(rng.shop, round, hero, locked)`: para cada slot não travado: 35% arma (se arma atual < T4, 50% desse ramo vira "upgrade da arma atual"; senão arma nova do pool liberado por `unlockRound`), 65% item com tier sorteado por `rules/tier.ts` (GDD §15.2) e item sorteado dentro do tier sem repetir no mesmo shop. Rounds 1–2: garantia 1 arma + 3 itens.
- `price(base, round, shopPrice%)` e `rerollPrice(round, k)` em `rules/shop.ts` (fórmulas GDD §17.2), com testes de tabela (valores do Brotato como oráculo).
- Comprar arma: vende a atual por 50% do preço pago (guardado em `hero.weaponPaid`), substitui, `dirty`.
- Lock: grátis; slot travado sobrevive à próxima loja com o mesmo preço.

## 4. Level-up

`xpToLevel(L) = 10 + 8 (L−1)`; `pickupSystem` acumula XP; ao cruzar, emite `LevelUp` e a run entra em `Paused(LevelUp)`. `drawCards(rng.cards, level)`: 3 cartas distintas do pool; ≥ nível 10, 10% de chance de carta dupla. Escolha aplica modificadores e `dirty`.

## 5. Almas e Ossuário

- `rules/souls.ts`: `soulsForRun(roundsCompleted, elites, bossKills[], difficulty, modifiers)` conforme GDD §18.2. Creditadas em `MetaState.souls` na tela de resultado (e em abandono, sem bônus).
- `ossuary.json` nós com `requires` (nó anterior) e `cost`. `MetaState.ossuary: Record<nodeId, true>`. `applyOssuary(meta)` gera modificadores iniciais da run e flags (`dashUnlocked`, `dashCharges`, `freeRerolls`, `cardRerolls`, `startGold`, `guaranteedUncommon`, `extraLegendaryPool`).
- Reset: devolve 100% das almas (somatório dos custos), limpa o record.
- Demo: `meta.isDemo` limita compra aos 2 primeiros nós de cada ramo (`node.index <= 1`).

## 6. Simulador de balanceamento (`tools/sim`)

- `bun run sim --runs 500 --difficulty normal --policy greedy --seed 1` roda `game` em Node sem render: usa o mesmo `simulate` e uma política de jogador (`policy/greedy.ts`: move em direção oposta ao centroide dos inimigos próximos; compra pelo maior `score = Σ valor_stat × peso / preço`; carta de maior peso faltante).
- Saída `reports/sim-<data>.json` + resumo Markdown: distribuição de round de morte (p10/p50/p90), DPS por round, ouro/round, tempo de kill por chefe, level por round.
- Asserts (GDD §25): p50 de morte em [18, 26]; Coveiro em [45, 90] s; chefes seguintes em [60, 120] s; ouro/preço em [1,2, 1,8]; level-ups/round em [1, 2] nos rounds 5–20; desvio padrão ≤ 4 rounds. Falha = CI vermelho (job `balance`).
- Velocidade alvo: ≥ 10.000 rounds/min em Node (sem render, sem VFX).

## 7. Testes

- `rules/*`: tabelas de casos com valores do Brotato como oráculo (preço, reroll, tier).
- `statsSystem`: ordem add/mul/caps; armadura negativa.
- Loja: garantias dos rounds 1–2; lock persiste; venda de arma devolve 50%.
- Ossuário: `requires`, custo total 10.250, reset devolve tudo, demo bloqueia nó 3+.
- Schema: todo JSON valida; ids únicos; referências cruzadas existem (`enemyPool` aponta para ids válidos).
