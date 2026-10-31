# SDD 04 — Combate, spawn e IA

Requisitos: GDD §8–§13. Tudo roda em `packages/game`, sem Babylon.

## 1. Spatial hash

`createSpatialHash` em `@gc/core`: grade uniforme no plano XZ, célula 2 u (≈ diâmetro do maior inimigo comum). Os slots (potência de 2) recebem `hash(cellX, cellZ) & mask` e guardam listas encadeadas em arrays fixos (`head`, `next`, `ids`, `xs`, `zs`). Um `stamp` por consulta evita visitar o mesmo slot duas vezes. A grade é reconstruída por completo a cada passo e não aloca depois de criada.

Há um único hash dinâmico, só de inimigos: `separationSystem.hash`, reconstruído na separação e reaproveitado por `targetingSystem`, `weaponSystem` e `projectileSystem`. O `pickupSystem` percorre as pilhas de fragmento em linha (no máximo 50). Os props bloqueantes usam a própria grade de chunks como hash estático (SDD 03 §4). Urnas (`Breakable`, por `breakables.insertInto`) e ovos da Rainha (`Egg`, por `boss.insertInto`) entram no hash de inimigos a cada passo para armas e projéteis os acertarem; a regra do que pode ser atingido é `isHittable` (`ecs/hittable.ts`: inimigo, urna ou ovo).

Consultas: `queryCircle(x, z, r, out: Uint16Array): number` (sem alocação; para quando `out` enche).

## 2. Mira e armas

- `targetingSystem`: a cada `retargetEvery` passos (3) ou quando o alvo morre ou sai do alcance, consulta o hash de inimigos num raio = alcance da arma; escolhe menor `dist × (isBossOrElite ? 0.8 : 1)`. Guarda `targetEntity`; se morreu ou saiu do alcance, reescolhe.
- `weaponSystem`: cooldown fracionário. A cada disparo soma `1 / (min(taxa, 12) × STEP)` passos e preserva o resto (8/s alterna 8 e 7 passos), com piso de −1 para não acumular rajada. Taxa = `attacksPerSecond × (1 + attackSpeedBonusPerTier × tier + attackSpeed%)`; o cap de 12 ataques/s vem de `hero.json`. Dados da arma em `weapons.json` (fonte única):

```json
{ "id": "pistol", "kind": "single_shot", "range": 12, "attacksPerSecond": 2, "damage": 10, "knockback": 0.5, "projectile": { "count": 1, "pierce": 0, "speed": 28, "radius": 0.15 }, "special": { "id": "crit_chance_bonus", "params": { "value": 0.15 } }, "unlockRound": 1, "price": 20, "upgradePrices": [30, 65, 140], "damageMult": [1, 1.5, 2.2, 3.2], "attackSpeedBonusPerTier": 0.1, "rangeBonusPerTier": 0.5 }
```

- Tipos (`kind`, os mesmos do GDD §9):
  - `melee` (espada): dano a todos no setor de `arcDegrees` dentro do alcance + raio do inimigo; knockback radial por inimigo.
  - `single_shot` (pistola), `burst` (SMG) e `continuous` (MG): projétil com `count` e `spreadDegrees`; a dispersão é sorteada em `rng.weapon`.
  - `explosive` (bazuca): explode no acerto ou no fim da vida; dano em área com queda linear de 100% a 50% na borda; knockback radial; evento `Exploded`; o herói leva `selfFraction` (50%) do dano se estiver dentro do raio; raio × (1 + `explosionSize`).
- Especiais vindos de `special` em `weapons.json`:
  - SMG: ×1,3 com o alvo a ≤ 4 u, distância medida no disparo, não no impacto.
  - MG: −20% de velocidade do herói enquanto atira; a penalidade dura `lingerSeconds` (do `special`) após o último tiro.
- Velocidades de projétil (provisórias, calibrar no sim): pistola 28, SMG 30, MG 32, bazuca 16 u/s. O teste de acerto é pontual por passo. Com raio mínimo de contato 2 × (0,3 + 0,15) = 0,9 u, velocidades acima de cerca de 54 u/s podem atravessar o alvo sem acertar.
- Projéteis: pool fixo de 512 entidades com `Projectile` + `Position` + `Velocity` + `Radius`; vida em passos = `ceil(range / speed / STEP)`. A cada passo, o projétil consulta o hash de inimigos e, ao acertar, manda dano para a fila e decrementa `pierce`. A mesma entidade nunca é atingida duas vezes pelo mesmo projétil: há um histórico circular dos 8 últimos ids (`ProjectileHits`), não bitmask. Com o pool cheio, o tiro é descartado com o evento `PoolExhausted`.

## 3. Dano

Fila `DamageQueue` (SoA, 1.024 entradas por passo): `{ target, amount, source, critChance, knockbackX, knockbackZ }`. O crítico é sorteado no `damageSystem` com `rng.combat` a partir de `critChance`, e `source` hoje é ignorado. `damageSystem` aplica em ordem:

```text
if target == hero:
    if invulnTicks > 0: skip
    if rng.dodge() < dodge: emit Dodged; skip
    amount *= armorMultiplier(armor)       # ver abaixo
    hp -= amount; invulnTicks = iFramesOnHitSeconds / STEP (hero.json, 0,3 s); emit PlayerHit
else:
    amount = base * (1 + damage%) * (crit ? critMult : 1) * (1 + bonusVsType)
    amount *= armorMultiplier(enemyArmor)  # Forjado tem armadura
    hp -= amount; hitFlash = 2; knockback (×0.5 elite, ×0.1 boss)
    lifeSteal: heroHeal += amount * lifeSteal% (cap 10 HP/s via acumulador)
    emit Damaged(amount, crit)
    if hp <= 0: emit Died
```

`armorMultiplier(a) = 100 / (100 + a × k)` para `a ≥ 0` e `2 − 100 / (100 + |a| × k)` para `a < 0` (simétrica e limitada abaixo de 2; ×1,40 em −10), com `k = armorConstant` (6,66, de `hero.json`). Fonte: GDD §8.2; a forma literal divergiria perto de −15.

Números de dano são eventos; `render` desenha.

## 4. Spawn

`rounds.json` define por round (ou fórmula): `total(N) = 20 + 12N`, `interval(N) = max(0.6, 1.5 − 0.045N)` s, `burst(N) = 2 + floor(N/4)`, cap 100. `spawnSystem` mantém `remaining`; a cada intervalo cria `burst` inimigos sorteando tipo pelo pool (`poolFor`) e posição (SDD 03 §5). Com o cap atingido, o próximo spawn remove sem drop o inimigo comum (sem `Boss`/`Elite`) mais distante do herói e nasce no lugar dele (GDD §6.4). Round de chefe: `total` = `remainingHordeFraction` (30%) do normal, intervalo × `hordeIntervalMult` (1,5), mais o chefe.

O pool por bioma (60/30/10, GDD §10.2) vem do bioma do ponto de spawn (`biomes.at` e `pools` de `biomes.json`, ligados em `session.ts`); o `poolFor` fixo (`husk` 6, `wail` 4) só vale no início do round.

Inicialização do inimigo: `hp = (base + (N−1) × inc) × difficultyMult`, `ContactDamage` idem, `Speed` fixo, mais `EnemyType`, `Behavior`, `Armor`, `Radius`, `Health` e `ContactCooldown` zerado. Clipe, mesh e slot de instância não são componentes: o render os deriva de `EnemyType`, `Facing`, `Attacking` e `HitFlash`.

## 5. IA (behaviorSystem)

Máquina de estados por tipo, em `enemies.json` campo `behavior` (nomes do data, a fonte única; `toEnemyDefs` mapeia para `BehaviorKind`):

| Behavior (inimigo) | Estados | Regras | Estado |
| --- | --- | --- | --- |
| `chase` (`husk`) | Chase | `Velocity = normalize(hero − pos) × speed` | implementado |
| `zigzag` (`wail`) | Chase | chase + seno perpendicular (`amplitude` 1,5 u, `periodSeconds` 0,8 s, de `behaviorParams`); fase defasada por entidade | implementado |
| `push` (`drowned`) | Chase | chase lento; knockback recebido × `knockbackTakenMult` (0,3), aplicado como `KnockbackResist` = 0,7 no `damageSystem` | implementado |
| `latch_drain` (`leech`) | Chase → Latched (`Behavior.state` 1) | ao tocar, gruda: segue o herói a `speed × speedMult` (1,2) e drena `drainHpPerSecond` (1) direto em `Health.hp` do herói, por passo (sem armadura nem i-frames: é vazamento, não golpe); solta quando perde HP (`PrevHealth`). O dano de contato normal continua com o cooldown | implementado |
| `armored` (`forged`) | Chase | chase; armadura de `behaviorParams.armor` (10) vai para `Armor` | implementado (IA = chase) |
| `ranged_static` (`watcher`) | Idle | parado; se o herói está a < `projectileRange` (10 u), atira a cada `intervalSeconds` (2 s) um projétil de `projectileSpeed` 8 u/s e raio 0,25 com dano = `ContactDamage`. `EnemyShotPool` + `enemyShotSystem` (vida = alcance/velocidade; acerta o herói pelo raio; o `movementSystem` move); evento `EnemyShotFired` | implementado (o render desenha o projétil em `render/vfx/projectiles.ts`) |
| `charge` (`hunter`) | Chase → Windup(`windupSeconds` 0,5) → Rush(`chargeSeconds` 0,6, `speedMult` 3) → Recover(`recoverSeconds` 1) | investida a cada `chargeIntervalSeconds` (3 s) quando a < `triggerDistance` (8 u); direção travada no windup (`Facing.yaw`); evento `EnemyTelegraph` | implementado |
| `spawner` (`breeder`) | Chase | lento; a cada `spawnIntervalSeconds` (4 s) cria `spawnCount` `spawnEnemy` (`wail`) ao redor (conta no cap: só cria enquanto os vivos < cap) | implementado |

Os timers de `ranged_static` e `spawner` usam `Behavior.aux`. Os 8 tipos entram pelo pool do bioma onde o inimigo nasce.

Contato com o herói: dano de `ContactDamage` com cooldown por inimigo (`contactCooldownSeconds` 0,5 s) e `Attacking.ticks` = `attackAnimationSeconds` para o clipe de ataque.

Separação (soft collision): para cada inimigo em movimento, soma o vetor de repulsão dos vizinhos a < `r1 + r2` (força `1 − d/(r1+r2)`) e aplica `Velocity += push × separationWeight × |v|`. Peso 0,6, vindo de `rounds.json` `ai.separationWeight`. Escalar pela velocidade atual deixa parados os inimigos que não se movem. Dois inimigos exatamente sobrepostos se separam num eixo escolhido pelo id. Chefes não são empurrados.

## 6. Elites

`roundSystem` no início de round comum: `if roundsSinceElite >= 5 || rng.elite() < 0.2` (round 1 nunca). Escolhe tipo do pool e um modificador (`elites.json`): multiplicadores de HP/velocidade/armadura, flags `vampiric`, `explosive`. Entra 10 s após o início (evento `EliteIncoming` 2 s antes para o som). Morte: `deathSystem` cria baú (`Chest` entity com `tier: 4`, `choices: 2`), +25 almas, +25 HP ao abrir. Fim do round com elite viva: entidade removida, evento `EliteEscaped`.

## 7. Chefes

`bosses.json`: HP base e padrões com timings (o dano de contato e de projétil dos chefes fica em `rounds.json` `boss`). `bossSystem` implementa cada chefe como máquina de estados com padrões parametrizados (ids de `bosses.json`: `line_charge`, `shovel_arc`, `summon`, `mud_pool`, `scream`, `hammer_shockwave`, `chain_shot`, `phase_armor`, `invisible_ambush`, `leap_aoe`, `thermal_vision`, `egg_spawn`, `tail_sweep`, `flying_bombard`; `registerPattern` em `bossPatterns.ts`, e um padrão só precisa de `canStart`/`start`/`update`/`end`/`tick`/`shift` opcionais). Cada padrão: `windup` (telegrafia: evento com forma e duração), `active` (hitbox), `recover`. Fases por % de HP. Enrage: a cada 3.600 passos (60 s) `enrageStacks++` (+15% dano/velocidade). Morte: `BossDied` → `Dying(1.5 s)` com execução, baú de chefe (`tier ≥ 3`, `choices: 3`), almas, upgrade grátis de arma.

A partir do round 60: sorteio no roster com `eliteModifiers` 1 (≥60) ou 2 (≥100); HP escala conforme GDD §12.1.

## 8. Testes

- Unit por regra pura (`rules/damage.ts`, `rules/spawn.ts`, `rules/elite.ts`): tabelas de casos.
- Unit por sistema com world sintético (ex.: 3 inimigos, 1 projétil com pierce 1 → 2 danos).
- Integration: simular rounds 1–10 com herói parado e arma T1 e verificar que o cap de 100 nunca é excedido e que o total de spawns bate com a fórmula.
- Simulação de balanceamento (SDD 05 §6).
