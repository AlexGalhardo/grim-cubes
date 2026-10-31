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

test("unsubscribing during a publish is safe and skips listeners not yet reached", () => {
	const store = createStore(0);
	const calls: string[] = [];
	let offB: () => void = () => {};
	store.subscribe(() => {
		calls.push("a");
		offB();
	});
	offB = store.subscribe(() => calls.push("b"));
	store.subscribe(() => calls.push("c"));
	store.publish(1);
	expect(calls).toEqual(["a", "c"]);
});
