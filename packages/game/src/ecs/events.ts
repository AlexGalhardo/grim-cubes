export const EventType = {
	/** a = amount, b = 1 when critical, entity = target. */
	Damaged: 1,
	/** b = 1 when the entity was purged at round end: no drops, no souls. */
	Died: 2,
	/** a = dx, b = dz: the world origin moved; Position and PrevPosition were already shifted by (-dx, -dz). */
	OriginShifted: 3,
	/** The hero evaded a hit. */
	Dodged: 4,
	/** a = amount taken by the hero; c = 1 for a leech drain (a leak: no hit pulse or shake). */
	PlayerHit: 5,
	/** a = round number. */
	RoundStarted: 6,
	/** a = round number. */
	RoundEnded: 7,
	/** a, b = unit direction x, z; c = reach in u. The hero swung a melee weapon. */
	Swung: 8,
	/** a, b = unit direction x, z. The hero fired a projectile. */
	Fired: 9,
	/** a, b = where the shot was fired. The projectile pool was full and the shot was dropped. */
	PoolExhausted: 10,
	/** a, b = centre x, z; c = radius. A projectile detonated. */
	Exploded: 12,
	/** a, b = x, z of the arrival; the elite enters in 2 s (warning sound, edge marker). */
	EliteIncoming: 13,
	/** a, b = x, z; c = modifier id (1-based, `Elite.modifier`); entity = the elite. */
	EliteSpawned: 14,
	/** a, b = x, z. An elite or boss chest dropped. */
	ChestDropped: 15,
	/** a, b = x, z of the chest that was opened; the offer is on screen. */
	ChestOpened: 16,
	/**
	 * a, b = unit direction x, z; c = seconds until the hit lands; entity = the boss. Always preceded by a
	 * BossPattern event that names the pattern. Exception: for mud_pool a, b are the x, z of the spot the pool
	 * will land on.
	 */
	BossTelegraph: 17,
	/** a, b = x, z of the summoner; c = number summoned. */
	BossSummon: 18,
	/** a, b = x, z; the boss died. */
	BossDied: 19,
	/** a = new enrage stack count. */
	BossEnraged: 20,
	/** a, b = x, z; entity = the elite. The round ended with the elite alive: it leaves without a reward. */
	EliteEscaped: 21,
	/** a, b = unit direction x, z; c = seconds until the charge; entity = the enemy (hunter windup). */
	EnemyTelegraph: 22,
	/** a, b = x, z where the shot left; c = unused. A watcher fired a projectile. */
	EnemyShotFired: 23,
	/** a = index of the pattern in the boss's `patterns` list (bosses.json); entity = the boss. A pattern started. */
	BossPattern: 24,
	/** a, b = x, z; c = radius. The boss left a lingering pool there (lifetime: the pattern's durationSeconds). */
	BossPool: 25,
	/** a, b = x, z; c = radius. The boss screamed: the hero in range was shoved away. */
	BossScream: 26,
	/** a, b = unit direction x, z; c = dash duration in seconds; entity = the hero. A dash began. */
	DashStarted: 27,
	/** a, b = x, z; c = radius. The boss slammed the ground (hammer): the hero in range was thrown back. */
	BossShockwave: 28,
	/** a = phase number entered (2 = the armoured phase); entity = the boss. */
	BossPhase: 29,
	/** The hero was revived (Phylactery): leave the death pose; entity = the hero. */
	Revived: 30,
	/** a, b = x, z; c = index of the prop in its chunk; entity = prop type id. A breakable prop broke. */
	PropBroken: 31,
	/** a, b = x, z; c = kind (1 blood vial, 2 bone magnet). A consumable dropped. */
	ConsumableDropped: 32,
	/** a = kind (1 blood vial, 2 bone magnet); the hero picked a consumable up. */
	ConsumablePicked: 33,
	/**
	 * a = 1 when the boss vanished, 0 when it showed itself; b = the opacity to draw it with while stealthed
	 * (also `Stealth.alpha[entity]`); c = seconds of stealth (0 on the reveal); entity = the boss.
	 */
	BossStealth: 34,
	/**
	 * a, b = x, z of the landing spot; c = seconds in the air; entity = the boss. The leap took off from the boss's
	 * current position; the landing is a BossShockwave (a, b = x, z; c = radius).
	 */
	BossLeap: 35,
	/** a, b = x, z; c = seconds until it hatches; entity = the egg (it carries `Egg`, Health and Radius). */
	BossEggLaid: 36,
	/** a, b = x, z; entity = the egg. The hero destroyed it before it hatched. */
	BossEggBroken: 37,
	/** a, b = x, z; c = the Hunter's entity id; entity = the egg, which is removed. */
	BossEggHatched: 38,
	/** a, b = unit direction x, z; c = reach in u; entity = the boss. The tail sweep landed (arc in bosses.json). */
	BossSweep: 39,
	/** a, b = x, z of the target; c = seconds until the bomb explodes (then an Exploded event); entity = the boss. */
	BossBomb: 40,
	/** a = piles collected this step; b, c = x, z of the hero; entity = the hero. */
	FragmentPicked: 41,
	/**
	 * a, b = x, z of the enemy the spiked boots hurt; c = distance from the hero to it (the hero's own position is the
	 * render's: direction = enemy - hero); entity = the enemy. At most once per enemy per contact cooldown.
	 */
	ThornsHit: 42,
	/** a = new level. The run paused and a card offer is waiting. */
	LevelUp: 11,
} as const;

export const EVENT_CAPACITY = 1024;

export type EventVisitor = (type: number, a: number, b: number, c: number, entity: number) => void;

export interface EventBuffer {
	/** Overwrites the oldest event when full. */
	push(type: number, a: number, b: number, c: number, entity: number): void;
	/**
	 * Visits events oldest to newest, then empties the buffer. Allocates nothing.
	 * The visitor must not call `push` during the consume.
	 */
	consume(visit: EventVisitor): void;
	readonly size: number;
	/** Events overwritten before being consumed, since creation (SDD 02 section 4). */
	readonly dropped: number;
}

export function createEventBuffer(capacity = EVENT_CAPACITY): EventBuffer {
	const type = new Uint8Array(capacity);
	const a = new Float32Array(capacity);
	const b = new Float32Array(capacity);
	const c = new Float32Array(capacity);
	const entity = new Uint16Array(capacity);
	let head = 0;
	let size = 0;
	let dropped = 0;

	return {
		push(t, ea, eb, ec, e): void {
			const slot = (head + size) % capacity;
			type[slot] = t;
			a[slot] = ea;
			b[slot] = eb;
			c[slot] = ec;
			entity[slot] = e;
			if (size < capacity) size++;
			else {
				head = (head + 1) % capacity;
				dropped++;
			}
		},
		consume(visit): void {
			for (let i = 0; i < size; i++) {
				const slot = (head + i) % capacity;
				visit(type[slot] ?? 0, a[slot] ?? 0, b[slot] ?? 0, c[slot] ?? 0, entity[slot] ?? 0);
			}
			head = 0;
			size = 0;
		},
		get size(): number {
			return size;
		},
		get dropped(): number {
			return dropped;
		},
	};
}

/** Drains `events` into `visit`; render and ui call this once per frame after `simulate`. */
export function consumeEvents(events: EventBuffer, visit: EventVisitor): void {
	events.consume(visit);
}
