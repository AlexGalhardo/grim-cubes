export const EventType = {
	/** a = amount, b = 1 when critical, entity = target. */
	Damaged: 1,
	Died: 2,
	/** a = dx, b = dz: the world origin moved; Position and PrevPosition were already shifted by (-dx, -dz). */
	OriginShifted: 3,
	/** The hero evaded a hit. */
	Dodged: 4,
	/** a = amount taken by the hero. */
	PlayerHit: 5,
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
