import { type SaveNotice, t } from "@gc/core";
import type { JSX } from "react";

export const noticeText = (notice: SaveNotice): string => t(`notice.${notice}`);

/** Banner for save problems; sits at the top and does not block play. */
export function Notice({ notice }: { notice: SaveNotice }): JSX.Element {
	return (
		<div
			role="alert"
			data-testid="save-notice"
			className="pointer-events-auto absolute top-2 left-1/2 z-40 w-[min(90vw,40rem)] -translate-x-1/2 border-2 border-rust bg-night-2 p-3 font-body text-sm text-bone"
		>
			{noticeText(notice)}
		</div>
	);
}
