# SDD 04 — Combate, spawn e IA

Requisitos: GDD §8–§13. Tudo roda em `packages/game`, sem Babylon.

## 1. Spatial hash

Grade uniforme no plano XZ, célula 2 u (≈ diâmetro do maior inimigo comum), chaves `hash(cellX, cellZ)` em `Map<number, Uint16Array>` com buckets de tamanho fixo (32 entidades) e contador; reconstruída por completo a cada passo (100–600 entidades: custo < 0,1 ms). Dois hashes: `dynamic` (inimigos, fragmentos) e `static` (props, por chunk).

Consultas: `queryCircle(x, z, r, out: Uint16Array): number` (sem alocação).

## 2. Mira e armas

- `targetingSystem`: a cada passo (ou a cada 3 passos para economizar), consulta `dynamic` num raio = alcance da arma; escolhe menor `dist × (isBossOrElite ? 0.8 : 1)`. Guarda `targetEntity`; se morreu ou saiu do alcance, reescolhe.
- `weaponSystem`: cooldown em passos = `round(60 / attacksPerSecond)`. Dados da arma em `weapons.json`:

```json
{ "id": "pistol", "kind": "projectile", "range": 12, "attacksPerSecond": 2.0, "damage": 10, "projectileSpeed": 28, "pierce": 0, "spreadDeg": 0, "knockback": 0.5, "critBonus": 0.15, "tiers": { "damageMult": [1, 1.5, 2.2, 3.2], "attackSpeedBonus": [0, 0.1, 0.2, 0.3], "rangeBonus": [0, 0.5, 1, 1.5] }, "prices": { "base": 20, "upgrade": [30, 65, 140] }, "unlockRound": 1 }
```

- Tipos: `melee_arc` (espada: aplica dano a todos no setor de 120° e alcance; sem projétil), `projectile` (pistola, SMG, MG; SMG e MG com dispersão aleatória via `rng.weapon`), `explosive` (bazuca: projétil que explode em raio; dano em área com queda linear 100%→50% na borda; 50% do dano no herói se dentro do raio).
- Projéteis: entidade com `Projectile` + `Position` + `Velocity`; vida em passos = `range / speed × 60`; a cada passo consulta `dynamic` na célula; hit → fila de dano; `pierce` decrementa; mesma entidade não é atingida duas vezes pelo mesmo projétil (bitmask por projétil de 8 últimos alvos).

## 3. Dano

Fila `DamageQueue` (SoA, 1.024 entradas por passo): `{ target, amount, source, crit, knockbackX, knockbackZ }`. `damageSystem` aplica em ordem:

```text
if target == hero:
    if invulnTicks > 0: skip
    if rng.dodge() < dodge: emit Dodged; skip
    amount *= 100 / (100 + 6.66 * armor)   # armor pode ser negativa
    hp -= amount; invulnTicks = 18 (0.3 s); emit PlayerHit
else:
    amount = base * (1 + damage%) * (crit ? critMult : 1) * (1 + bonusVsType)
    amount *= 100 / (100 + 6.66 * enemyArmor)   # Forjado tem armadura
    hp -= amount; hitFlash = 2; knockback (×0.5 elite, ×0.1 boss)
    lifeSteal: heroHeal += amount * lifeSteal% (cap 10 HP/s via acumulador)
    emit Damaged(amount, crit)
    if hp <= 0: emit Died
```

Números de dano são eventos; `render` desenha.

## 4. Spawn

`rounds.json` define por round (ou fórmula): `total(N) = 20 + 12N`, `interval(N) = max(0.6, 1.5 − 0.045N)` s, `burst(N) = 2 + floor(N/4)`, cap 100. `spawnSystem` mantém `remaining`; a cada intervalo cria `burst` inimigos sorteando tipo pelo pool do bioma (60/30/10) e posição (SDD 03 §5). Round de chefe: `total` = 30% do normal, intervalo ×1,5, mais o chefe.

Inicialização do inimigo: `hp = (base + (N−1) × inc) × difficultyMult`, `damage` idem, `speed` fixo, `Anim.clip = walk`, `Render.meshId` por tipo, `instanceSlot` do pool de thin instances do tipo.

## 5. IA (behaviorSystem)

Máquina de estados por tipo, em `enemies.json` campo `behavior`:

| Behavior | Estados | Regras |
| --- | --- | --- |
| `chase` | Chase | `Velocity = normalize(hero − pos) × speed` |
| `zigzag` | Chase | chase + seno perpendicular (amplitude 1,5 u, período 0,8 s) |
| `tank` | Chase | chase lento; knockback recebido ×0,3 |
| `latch` | Chase → Latched | ao tocar, gruda: segue o herói a `speed × 1,2`, 1 HP/s; solta ao ser atingido |
| `shooter` | Idle | fixo; se herói a < 10 u, atira projétil lento (8 u/s) a cada 2 s |
| `charger` | Chase → Windup(0,5 s) → Charge(0,6 s, 3× speed) → Recover(1 s) | investida a cada 3 s quando a < 8 u; telegrafia via evento |
| `breeder` | Chase | lento; a cada 4 s cria 1 `wail` adjacente (conta no cap) |

Separação (soft collision): para cada inimigo, soma vetor de repulsão dos vizinhos a < `r1 + r2` (força `1 − d/(r1+r2)`), aplicado a `Velocity` com peso 0,6. Chefes não são empurrados.

## 6. Elites

`roundSystem` no início de round comum: `if roundsSinceElite >= 5 || rng.elite() < 0.2` (round 1 nunca). Escolhe tipo do pool e um modificador (`elites.json`): multiplicadores de HP/velocidade/armadura, flags `vampiric`, `explosive`. Entra 10 s após o início (evento `EliteIncoming` 2 s antes para o som). Morte: `deathSystem` cria baú (`Chest` entity com `tier: 4`, `choices: 2`), +25 almas, +25 HP ao abrir. Fim do round com elite viva: entidade removida, evento `EliteEscaped`.

## 7. Chefes

`bosses.json`: HP base, dano, padrões com timings. `bossSystem` implementa cada chefe como máquina de estados com padrões parametrizados (`charge`, `swing_arc`, `summon`, `pool`, `shockwave`, `chains`, `stealth`, `leap`, `eggs`, `sweep`, `fly_bomb`). Cada padrão: `windup` (telegrafia: evento com forma e duração), `active` (hitbox), `recover`. Fases por % de HP. Enrage: a cada 3.600 passos (60 s) `enrageStacks++` (+15% dano/velocidade). Morte: `BossDied` → `Dying(1.5 s)` com execução, baú de chefe (`tier ≥ 3`, `choices: 3`), almas, upgrade grátis de arma.

A partir do round 60: sorteio no roster com `eliteModifiers` 1 (≥60) ou 2 (≥100); HP escala conforme GDD §12.1.

## 8. Testes

- Unit por regra pura (`rules/damage.ts`, `rules/spawn.ts`, `rules/elite.ts`): tabelas de casos.
- Unit por sistema com world sintético (ex.: 3 inimigos, 1 projétil com pierce 1 → 2 danos).
- Integration: simular rounds 1–10 com herói parado e arma T1 e verificar que o cap de 100 nunca é excedido e que o total de spawns bate com a fórmula.
- Simulação de balanceamento (SDD 05 §6).
