export interface Store<T> {
	get(): T;
	publish(next: T): void;
	subscribe(listener: (state: T) => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
	let state = initial;
	const listeners = new Set<(state: T) => void>();
	return {
		get: () => state,
		publish(next) {
			state = next;
			// Iterates the Set directly (no copy per publish, so no allocation). A listener may unsubscribe itself or
			// another during the loop: a Set skips deleted entries it has not reached yet. One added meanwhile is visited
			// in the same pass.
			for (const listener of listeners) listener(state);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
