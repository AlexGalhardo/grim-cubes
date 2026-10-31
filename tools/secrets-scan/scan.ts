const PATTERNS: readonly RegExp[] = [
	/\bsk_[A-Za-z0-9]{4,}/,
	/ELEVENLABS_API_KEY\s*=\s*\S+/,
	/xi-api-key["']?\s*[:=]\s*["']?\S+/i,
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
