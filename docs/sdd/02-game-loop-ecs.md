# SDD 02 — Game loop e ECS

## 1. Game loop

Fixed timestep com acumulador (Gaffer on Games), passo `STEP = 1/60 s`, clamp de `dt` em 0,25 s, no máximo 5 passos por frame (evita espiral da morte; se exceder, o jogo desacelera e registra `slowFrame`).

```ts
// packages/game/src/loop.ts (resumo do código)
export function createLoop(hooks: LoopHooks): Loop {
	// hooks: simulate(step), render(alpha), publish(now); o world fica nas closures do app
	function frame(nowMs: number): void {
		const dt = last === null ? 0 : Math.min((nowMs - last) / 1000, MAX_DT); // MAX_DT = 0,25
		last = nowMs;
		if (!paused) {
			acc += dt;
			let steps = 0;
			while (acc >= STEP && steps < MAX_STEPS) {
				hooks.simulate(STEP);
				acc -= STEP;
				steps++;
			}
			if (acc >= STEP) { acc = 0; slowFrame++; } // descarta o atraso em vez de acumular
		}
		hooks.render(acc / STEP); // alpha para interpolação
		hooks.publish(nowMs);     // o app limita a publicação a HUD_HZ = 12 (apps/web)
	}
	return { frame, pause, resume, slowFrame };
}
```

- Pausa (level-up, loja, menu): `simulate` não roda; `render` continua (animação de UI); timer do round congela.
- Em background (`visibilitychange`): pausa automática.
- Timer do round e cooldowns usam contagem de passos (inteiros), não `Date.now()`, para determinismo.

## 2. ECS com bitecs 0.4.0 (ADR-0005)

### 2.1 Componentes (SoA, TypedArrays)

| Componente | Campos | Tipo |
| --- | --- | --- |
| `Position` | `x, z` | f32 (relativa à origem, ver SDD 03 §1) |
| `PrevPosition` | `x, z` | f32 (para interpolação) |
| `Velocity` | `x, z` | f32 |
| `Facing` | `yaw` | f32 (`atan2(vx, vz)`: 0 olha para +z, positivo gira para +x; escrito pelo `movementSystem`) |
| `Radius` | `r` | f32 (colisão circular) |
| `Health` | `hp, max` | f32 |
| `Armor` | `value` | f32 |
| `Speed` | `value` | f32 (u/s) |
| `ContactDamage` | `value` | f32 |
| `ContactCooldown` | `ticks` | u8 |
| `Attacking` | `ticks` | u8 (passos restantes do clipe de ataque; lido pelo render) |
| `Invulnerable` | `ticks` | u8 (i-frames do herói) |
| `EnemyType` | `id` | u8 (índice em `enemies.json`) |
| `Elite` | `modifier` | u8 (0 = não elite) |
| `Boss` | `id` | u8 (`phase`, `enrageStacks` e `enrageTimer` entram com a P-05-07) |
| `Behavior` | `kind, state, timer` | u8, u8, u16 (`targetX/targetZ` só se `charge`/`latch_drain` precisarem, A-02-02a) |
| `Projectile` | `damage, critChance, knockback, pierce, life, explosionRadius, selfFraction` | f32, f32, f32, u8, u16, f32, f32 |
| `ProjectileHits` | `ids` (anel de 8 por projétil), `cursor` | u16, u8 |
| `Fragment` | `value, magnetTimer` | u16, u16 |
| `HitFlash` | `ticks` | u8 |
| `Knockback` | `x, z, ticks` | f32, f32, u8 |
| `PlayerFaction`, `EnemyFaction` | — | tags |

Não existem componentes `Anim`, `Render` nem `Lifetime`: o render deriva clipe, mesh e instância de `EnemyType`, `Facing`, `Attacking` e `HitFlash`, e a vida útil do projétil está em `Projectile.life`. `Prop` vira entidade só para props destrutíveis (provisório até P-01-05).

Os ids do bitecs 0.4 começam em 1, e 0 significa "nenhuma entidade" nos eventos. O herói é localizado por `findHero` (query em cache). `PlayerStats` é um objeto plano fora do ECS, por ser único e lido pela UI. Todo campo SoA é zerado no `spawn()` (`resetComponents`), porque o bitecs recicla ids sem limpar os dados.

### 2.2 Pools e limites

`createWorld(createEntityIndex())`, com o limite de `MAX_ENTITIES = 4096` garantido em `spawn()`. Limites por tipo (ADR-0006): inimigos 100 (cap configurável), projéteis 512 (pool), pilhas de fragmento 50 no chão (`groundPileCap`, GDD §18.1), partículas fora do ECS (render). Props não são entidades, exceto os destrutíveis (provisório até P-01-05).

Entidades são recicladas: `removeEntity` + `addEntity` do bitecs. Nunca criar mais de `MAX_ENTITIES`.

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

Ordem real no PROTÓTIPO (emenda de 2026-10-31, `apps/web/src/main.tsx` e `tools/sim`): `roundSystem`/`spawnSystem` → `inputSystem` → `dashSystem` → `behaviorSystem` → `separationSystem` → `movementSystem` → `applyOriginShift` → `chunkSystem` → `targetingSystem` → `weaponSystem` → `projectileSystem` → `damageSystem` → `deathSystem` → `pickupSystem` → `statsSystem` → `levelUpSystem`. O input vem depois do round para não mover o herói nas telas de intro/loja, e o `chunkSystem` roda logo após o origin shift para o anel usar a posição do passo. `bossSystem` e `lifetimeSystem` entram nas tarefas que os criam. O `dashSystem` (A-04-02, `createDashSystem`) roda logo após o `inputSystem` e, enquanto o dash dura, sobrescreve a `Velocity` do herói e grava os i-frames em `Invulnerable`; o `inputSystem` não trata mais o dash (o item 1 acima descreve o desenho original).

Cada sistema é uma fábrica `createXSystem(deps)` que devolve `run(world, hero?)`. As queries usam `createQueryCache` (uma query registrada por world via `WeakMap`, `commitRemovals` + `.dense`, sem alocação por passo); `query()` direto do bitecs aloca e não é usado em `simulate`. Cada sistema tem teste unitário próprio com world sintético.

## 3. Determinismo

- Todo sorteio passa por `rng.<stream>()` com seed derivada de `seed_run` (`hash32(seed_run, streamId)`); nunca `Math.random` em `game` (regra de lint).
- Simulação independente de frame rate (passo fixo) e de plataforma (sem floats dependentes de `Date`).
- Teste de regressão: rodar a seed 42 por 3.600 passos em Node e comparar hash do estado (`tests/integration/determinism.test.ts`). Objetivo: replays e runs diárias pós-1.0.

## 4. Eventos

Ring buffer contínuo de 1.024 eventos (struct de arrays: `type: u8, a: f32, b: f32, c: f32, entity: u16`). Há um único consumidor: o render port chama `consumeEvents` uma vez por frame após `simulate`, e o `consume` esvazia o buffer. A UI não lê eventos; lê o snapshot do store. O visitor não pode chamar `push` durante o `consume`. Se o produtor ultrapassar 1.024 eventos não lidos, os mais antigos são sobrescritos e o contador `dropped` é incrementado (exposto em `?debug=1`; deve ser 0 nos testes).

## 5. Estado da run (máquina de estados)

```text
Idle ─newRun─► RoundIntro(2s) ─► Round ─timer=0─► RoundOutro(1s) ─► Shop ─close─► RoundIntro …
                                   │ round % 10 == 0: BossIntro(3s) ─► BossRound ─boss dead─► RoundOutro
                                   │ levelUp: Paused(LevelUp) ─choose─► Round
                                   └ hp<=0: Dying(1.5s) ─► Results ─► Idle
```

Estado atual exposto no snapshot do store (`screen`), e a UI renderiza a tela correspondente. Os estados existem em `RunState` (`systems/round.ts`). No PROTÓTIPO, `Shop` fecha sozinho com `closeShop()` (provisório até P-05-04) e `Results` recarrega a página (provisório até P-05-08), ambos em `apps/web`.
