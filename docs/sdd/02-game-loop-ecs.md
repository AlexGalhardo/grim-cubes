# SDD 02 — Game loop e ECS

## 1. Game loop

Fixed timestep com acumulador (Gaffer on Games), passo `STEP = 1/60 s`, clamp de `dt` em 0,25 s, no máximo 5 passos por frame (evita espiral da morte; se exceder, o jogo desacelera e registra `slowFrame`).

```ts
// packages/game/src/loop.ts (esboço)
export function createLoop(world: World, hooks: LoopHooks): Loop {
	let acc = 0;
	let last = 0;
	function frame(now: number): void {
		const dt = Math.min((now - last) / 1000, 0.25);
		last = now;
		acc += dt;
		let steps = 0;
		while (acc >= STEP && steps < MAX_STEPS) {
			simulate(world, STEP);
			acc -= STEP;
			steps++;
		}
		hooks.render(world, acc / STEP);   // alpha para interpolação
		hooks.publish(world, now);         // throttled a 10–15 Hz
	}
	return { frame, pause, resume };
}
```

- Pausa (level-up, loja, menu): `simulate` não roda; `render` continua (animação de UI); timer do round congela.
- Em background (`visibilitychange`): pausa automática.
- Timer do round e cooldowns usam contagem de passos (inteiros), não `Date.now()`, para determinismo.

## 2. ECS com bitecs 0.4.0 (ADR-0005)

### 2.1 Componentes (SoA, TypedArrays)

| Componente | Campos | Tipo |
| --- | --- | --- |
| `Position` | `x, z` | f32 |
| `PrevPosition` | `x, z` | f32 (para interpolação) |
| `Velocity` | `x, z` | f32 |
| `Facing` | `angle` | f32 |
| `Radius` | `r` | f32 (colisão circular) |
| `Health` | `hp, max` | f32 |
| `Armor` | `value` | f32 |
| `EnemyType` | `id` | u8 (índice em `enemies.json`) |
| `Elite` | `modifier` | u8 (0 = não elite) |
| `Boss` | `id, phase, enrageStacks, enrageTimer` | u8, u8, u8, u16 |
| `Behavior` | `state, timer, targetX, targetZ` | u8, u16, f32, f32 |
| `Projectile` | `damage, pierce, life, ownerWeapon` | f32, u8, u16, u8 |
| `Fragment` | `value, magnetTimer` | u16, u16 |
| `Prop` | `kind, blocking` | u8, u8 |
| `Anim` | `clip, frame, speed` | u8, u16, f32 |
| `Render` | `meshId, instanceSlot, tint` | u8, u16, u32 |
| `Lifetime` | `ticks` | u16 |
| `HitFlash` | `ticks` | u8 |
| `Knockback` | `x, z, ticks` | f32, f32, u8 |

O herói é a entidade 0 com componentes extras (`PlayerStats` como objeto plano fora do ECS, pois é único e lido pela UI).

### 2.2 Pools e limites

`createWorld({ size: 4096 })`. Limites por tipo (ADR-0006): inimigos 100 (cap configurável), projéteis 512, fragmentos 400 (pilhas), partículas fora do ECS (render), props carregados ≤ 49 chunks × 12.

Entidades são recicladas: `removeEntity` + `addEntity` do bitecs. Nunca criar mais de `size`.

### 2.3 Ordem dos sistemas (por passo)

1. `inputSystem` — lê `InputState`, define `Velocity` do herói (dash).
2. `roundSystem` — timer, início/fim de round, transição para loja/chefe, sorteio de elite, enrage.
3. `spawnSystem` — rajadas conforme `rounds.json` e pool do bioma; cap de 100.
4. `behaviorSystem` — IA por `EnemyType` (perseguir, zigue-zague, investida, atirar, invocar); define `Velocity`.
5. `separationSystem` — soft collision entre inimigos via spatial hash (SDD 04).
6. `movementSystem` — `PrevPosition = Position; Position += Velocity × STEP`; colisão com props bloqueantes; origin shift.
7. `targetingSystem` — escolhe alvo da arma do herói (mais próximo, prioridade elite/chefe).
8. `weaponSystem` — cooldown, cria projéteis ou aplica dano em arco (espada).
9. `projectileSystem` — move, testa hit via spatial hash, perfuração, vida.
10. `damageSystem` — aplica fila de danos (herói e inimigos), crítico, armadura, roubo de vida, knockback, i-frames, eventos `Damaged`/`Died`.
11. `deathSystem` — drops (fragmentos, consumíveis, baús de elite/chefe), almas, estatísticas, recicla entidade.
12. `pickupSystem` — fragmentos no raio de pickup (magnet), XP e ouro, level-up (pausa).
13. `bossSystem` — fases, padrões, telegrafia (eventos para render).
14. `lifetimeSystem` — expira projéteis, flashes, knockbacks.
15. `chunkSystem` — carrega/descarrega chunks pelo anel (SDD 03).
16. `statsSystem` — recalcula `PlayerStats` derivados quando `dirty` (compra, carta, nó).

Cada sistema é `function system(world: World, step: number): void` e tem teste unitário próprio com world sintético.

## 3. Determinismo

- Todo sorteio passa por `rng.<stream>()` com seed derivada de `seed_run` (`hash32(seed_run, streamId)`); nunca `Math.random` em `game` (regra de lint).
- Simulação independente de frame rate (passo fixo) e de plataforma (sem floats dependentes de `Date`).
- Teste de regressão: rodar a mesma seed por 1.000 passos em Node e comparar hash do estado (`tests/integration/determinism.test.ts`). Objetivo: replays e runs diárias pós-1.0.

## 4. Eventos

Ring buffer de 1.024 eventos por passo (struct de arrays: `type: u8, a: f32, b: f32, c: f32, entity: u16`). `render` e `ui` consomem após `simulate`; eventos não consumidos no frame são descartados (nunca acumulam).

## 5. Estado da run (máquina de estados)

```text
Idle ─newRun─► RoundIntro(2s) ─► Round ─timer=0─► RoundOutro(1s) ─► Shop ─close─► RoundIntro …
                                   │ round % 10 == 0: BossIntro(3s) ─► BossRound ─boss dead─► RoundOutro
                                   │ levelUp: Paused(LevelUp) ─choose─► Round
                                   └ hp<=0: Dying(1.5s) ─► Results ─► Idle
```

Estado atual exposto no snapshot do store (`screen`), e a UI renderiza a tela correspondente.
