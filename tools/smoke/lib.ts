export interface ConsoleEntry {
	type: string;
	text: string;
	url: string;
}

/** Vercel Deployment Protection bypass: the secret goes only into request headers, never into logs. */
export function bypassHeaders(env: Record<string, string | undefined>): Record<string, string> {
	const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
	if (secret === undefined || secret === "") return {};
	return { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" };
}

export function sameOrigin(requestUrl: string, targetUrl: string): boolean {
	try {
		return new URL(requestUrl).origin === new URL(targetUrl).origin;
	} catch {
		return false;
	}
}

/** Console errors that fail the smoke. A missing favicon is browser noise, not a game error. */
export function errorsFrom(entries: ConsoleEntry[]): string[] {
	return entries
		.filter((e) => e.type === "error" && !e.url.endsWith("/favicon.ico"))
		.map((e) => (e.url === "" ? e.text : `${e.text} (${e.url})`));
}

/** The target URL with `?debug=1`: a GC_DEBUG_API build only installs `window.gc.debug` when that parameter is set. */
export function withDebugParam(url: string): string {
	const probe = new URL(url);
	probe.searchParams.set("debug", "1");
	return probe.toString();
}

/** A production build must not expose the debug API (`window.gc.debug`, only in builds with GC_DEBUG_API=1). */
export function debugApiProblems(debugPresent: boolean): string[] {
	return debugPresent ? ["debug API present in production"] : [];
}

export interface SmokeArgs {
	url: string;
	out: string;
	timeoutMs: number;
}

export function parseArgs(argv: string[]): SmokeArgs {
	const value = (name: string): string | undefined => {
		const i = argv.indexOf(name);
		return i >= 0 ? argv[i + 1] : undefined;
	};
	const url = value("--url");
	if (url === undefined)
		throw new Error(
			"usage: bun run test:smoke -- --url <url> [--out reports/smoke.png] [--timeout 30000]",
		);
	const parsed = new URL(url);
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("--url must be http(s)");
	return {
		url,
		out: value("--out") ?? "reports/smoke.png",
		timeoutMs: Number(value("--timeout") ?? 30_000),
	};
}
