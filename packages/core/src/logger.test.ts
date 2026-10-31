import { expect, test, vi } from "vitest";
import { createLogger, type LogLevel } from "./logger";

test("filters below the minimum level and tags the scope", () => {
	const seen: string[] = [];
	const log = createLogger("t", {
		level: "warn",
		sink: (l: LogLevel, s, m) => seen.push(`${l}:${s}:${m}`),
	});
	log.info("no");
	log.error("yes");
	expect(seen).toEqual(["error:t:yes"]);
});

test("the default sink writes to the console with and without data", () => {
	const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	const log = createLogger("scope");
	log.warn("plain");
	log.warn("with data", { a: 1 });
	expect(spy).toHaveBeenNthCalledWith(1, "[scope] plain");
	expect(spy).toHaveBeenNthCalledWith(2, "[scope] with data", { a: 1 });
	spy.mockRestore();
});
