const PATTERNS: readonly RegExp[] = [
	/\bsk_(?:live_|test_)?[A-Za-z0-9]{20,}/,
	/ELEVENLABS_API_KEY\s*=\s*["']?[A-Za-z0-9_]{20,}/,
	/xi-api-key["']?\s*[:=]\s*["'][A-Za-z0-9_]{20,}["']/i,
	/\bghp_[A-Za-z0-9]{36}\b/,
	/\bgithub_pat_[A-Za-z0-9_]{22,}/,
	/\bAKIA[0-9A-Z]{16}\b/,
	new RegExp(`-----BEGIN [A-Z ]*${"PRIVATE"} KEY-----`),
];

/** Returns the 1-based line numbers that look like secrets. Never returns the matched text. */
export function findSecretLines(text: string): number[] {
	const hits: number[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		if (PATTERNS.some((pattern) => pattern.test(line))) hits.push(index + 1);
	});
	return hits;
}
