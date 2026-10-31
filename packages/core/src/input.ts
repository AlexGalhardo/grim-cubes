/** Read by `game` each step; written by platform sources (keyboard, gamepad) and the UI joystick. */
export interface InputState {
	/** -1..1, +x is screen right. */
	moveX: number;
	/** -1..1, +z is screen up (camera looks toward +z, ADR-0017). */
	moveZ: number;
	dash: boolean;
	pause: boolean;
}

export function createInputState(): InputState {
	return { moveX: 0, moveZ: 0, dash: false, pause: false };
}

/** Scales (x, z) down to unit length when longer, so diagonals are not faster. */
export function clampUnit(state: { moveX: number; moveZ: number }): void {
	const length = Math.hypot(state.moveX, state.moveZ);
	if (length > 1) {
		state.moveX /= length;
		state.moveZ /= length;
	}
}

/** Floating joystick: the base appears where the touch starts. Pointer coordinates are in CSS px. */
export interface VirtualStick {
	readonly active: boolean;
	/** Output, -1..1 (screen y grows downward, so dragging up gives +z). */
	readonly x: number;
	readonly z: number;
	readonly originX: number;
	readonly originY: number;
	readonly knobX: number;
	readonly knobY: number;
	down(id: number, x: number, y: number): void;
	move(id: number, x: number, y: number): void;
	up(id: number): void;
}

export function createVirtualStick(radius = 48): VirtualStick {
	let pointer = -1;
	let originX = 0;
	let originY = 0;
	let knobX = 0;
	let knobY = 0;

	return {
		get active(): boolean {
			return pointer !== -1;
		},
		get x(): number {
			return knobX / radius;
		},
		get z(): number {
			return 0 - knobY / radius;
		},
		get originX(): number {
			return originX;
		},
		get originY(): number {
			return originY;
		},
		get knobX(): number {
			return knobX;
		},
		get knobY(): number {
			return knobY;
		},
		down(id, x, y): void {
			if (pointer !== -1) return;
			pointer = id;
			originX = x;
			originY = y;
			knobX = 0;
			knobY = 0;
		},
		move(id, x, y): void {
			if (id !== pointer) return;
			let dx = x - originX;
			let dy = y - originY;
			const length = Math.hypot(dx, dy);
			if (length > radius) {
				dx = (dx / length) * radius;
				dy = (dy / length) * radius;
			}
			knobX = dx;
			knobY = dy;
		},
		up(id): void {
			if (id !== pointer) return;
			pointer = -1;
			knobX = 0;
			knobY = 0;
		},
	};
}
