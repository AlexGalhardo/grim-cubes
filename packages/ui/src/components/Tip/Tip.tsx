import { t } from "@gc/core";
import type { JSX } from "react";

export type TipId =
	| "move"
	| "fragments"
	| "merchant"
	| "shop"
	| "tutorialMove"
	| "tutorialKill"
	| "tutorialCollect";

const KEY: Readonly<Record<TipId, string>> = {
	move: "tip.move",
	fragments: "tip.fragments",
	merchant: "tip.merchant",
	shop: "tip.shop",
	tutorialMove: "tip.tutorialMove",
	tutorialKill: "tip.tutorialKill",
	tutorialCollect: "tip.tutorialCollect",
};

/** One contextual hint of the first round (A-07-01); sits low so it never covers the play area or a dialog. */
export function Tip({ id }: { id: TipId }): JSX.Element {
	return (
		<div
			role="status"
			data-testid="tip"
			data-tip={id}
			className="absolute bottom-3 left-1/2 z-10 w-[min(90vw,32rem)] -translate-x-1/2 border-2 border-iron-dark bg-night-2/90 p-2 text-center font-body text-sm text-bone"
		>
			{t(KEY[id])}
		</div>
	);
}
