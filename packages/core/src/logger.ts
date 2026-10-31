export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogSink = (level: LogLevel, scope: string, message: string, data?: unknown) => void;

export interface Logger {
	debug(message: string, data?: unknown): void;
	info(message: string, data?: unknown): void;
	warn(message: string, data?: unknown): void;
	error(message: string, data?: unknown): void;
}

export interface LoggerOptions {
	level?: LogLevel;
	sink?: LogSink;
}

const ORDER: Readonly<Record<LogLevel, number>> = { debug: 0, info: 1, warn: 2, error: 3 };

const consoleSink: LogSink = (level, scope, message, data) => {
	// Sole sanctioned console writer (SDD 01 §7).
	const write = console[level].bind(console);
	if (data === undefined) write(`[${scope}] ${message}`);
	else write(`[${scope}] ${message}`, data);
};

export function createLogger(scope: string, options: LoggerOptions = {}): Logger {
	const min = ORDER[options.level ?? "info"];
	const sink = options.sink ?? consoleSink;
	const emit =
		(level: LogLevel) =>
		(message: string, data?: unknown): void => {
			if (ORDER[level] >= min) sink(level, scope, message, data);
		};
	return { debug: emit("debug"), info: emit("info"), warn: emit("warn"), error: emit("error") };
}
