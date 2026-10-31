import { expect, test } from "vitest";
import { createStore } from "./store";

test("publish notifies each subscriber exactly once", () => {
	const store = createStore(0);
	let calls = 0;
	store.subscribe(() => calls++);
	store.publish(1);
	expect(calls).toBe(1);
	expect(store.get()).toBe(1);
});

test("unsubscribe stops notifications", () => {
	const store = createStore(0);
	let calls = 0;
	const off = store.subscribe(() => calls++);
	off();
	store.publish(1);
	expect(calls).toBe(0);
});
