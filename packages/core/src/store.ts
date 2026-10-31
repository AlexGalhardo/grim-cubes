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
			for (const listener of [...listeners]) listener(state);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
