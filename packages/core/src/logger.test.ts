import { expect, test } from "vitest";
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
