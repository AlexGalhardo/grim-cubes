import type { JSX, ReactNode } from "react";

export interface PanelProps {
	title?: string | undefined;
	riveted?: boolean;
	children?: ReactNode;
}

export function Panel({ title, riveted = false, children }: PanelProps): JSX.Element {
	return (
		<section
			className={`border-2 border-iron-dark bg-night-2/85 p-3 text-bone desktop:p-4 ${riveted ? "panel-riveted" : ""}`}
		>
			{title ? (
				<h2 className="mb-3 border-rust border-b-2 pb-2 font-display text-base leading-tight">
					{title}
				</h2>
			) : null}
			{children}
		</section>
	);
}
