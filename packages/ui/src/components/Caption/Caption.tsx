import type { JSX } from "react";

/** The subtitle of a boss voice line: low and centred, announced politely to screen readers. */
export function Caption({ text }: { text: string }): JSX.Element {
	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="caption"
			className="absolute right-4 bottom-16 left-4 z-40 mx-auto max-w-2xl bg-night/80 px-4 py-2 text-center font-display text-lg text-bone"
		>
			{text}
		</div>
	);
}
