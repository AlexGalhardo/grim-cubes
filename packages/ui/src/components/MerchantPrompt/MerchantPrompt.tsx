import { t } from "@gc/core";
import type { JSX } from "react";

export interface MerchantPromptView {
	/** Direction to him on screen, radians clockwise from "up". */
	angle: number;
	/** Close enough to talk: the prompt becomes the action. */
	near: boolean;
	/** Seconds before the shop opens by itself. */
	secondsLeft: number;
}

export interface MerchantPromptProps {
	view: MerchantPromptView;
	onTalk: () => void;
}

/** While the Merchant waits (A-05-01): an arrow toward him, and the talk action once the hero is close. */
/** The screen reader hears the countdown every 5 s (20, 15, 10, 5), not every second. */
export const announcedSeconds = (seconds: number): number => Math.max(0, Math.ceil(seconds / 5) * 5);

export function MerchantPrompt({ view, onTalk }: MerchantPromptProps): JSX.Element {
	return (
		<button
			type="button"
			data-testid="merchant-prompt"
			data-near={view.near ? "true" : "false"}
			disabled={!view.near}
			onClick={onTalk}
			className="pointer-events-auto absolute top-16 left-1/2 z-20 flex min-h-12 -translate-x-1/2 items-center gap-3 border-2 border-iron-dark bg-night-2/90 px-4 font-display text-base text-bone enabled:border-ember enabled:text-ember-light"
		>
			<span
				role="img"
				aria-label={t("merchant.arrow")}
				data-testid="merchant-arrow"
				className="inline-block"
				style={{ transform: `rotate(${view.angle}rad)` }}
			>
				{"\u2191"}
			</span>
			<span className="flex flex-col items-start">
				<span>{view.near ? t("merchant.talk") : t("merchant.go")}</span>
				<span
					aria-hidden="true"
					data-testid="merchant-countdown"
					className="font-body text-xs text-bone-dark"
				>
					{t("merchant.countdown", { seconds: view.secondsLeft })}
				</span>
			</span>
			<span role="status" aria-live="polite" className="sr-only" data-testid="merchant-announce">
				{t("merchant.countdown", { seconds: announcedSeconds(view.secondsLeft) })}
			</span>
		</button>
	);
}
