import type { JSX } from "react";

export interface StatLineView {
	label: string;
	value: string;
	/** Matches the keys of `ShopSlotView.preview` and `CardChange.id`. */
	id?: string | undefined;
}

/** What a focused offer or card does to one stat: the value after, the signed delta and whether it is an improvement (higher is better for every listed stat). */
export interface StatPreview {
	after: string;
	delta: string;
	better: boolean;
}

export interface StatListProps {
	stats: readonly StatLineView[];
	/** One column (the level-up panel) or two side by side from `mobile-l` up (the shop). */
	columns?: 1 | 2;
	/** Stat id -> change of the focused offer, shown as `now → after` and a green or red delta. */
	preview?: Readonly<Record<string, StatPreview>> | undefined;
}

const isNegative = (value: string): boolean => value.startsWith("-") || value.startsWith("−");

/** The hero's stat lines, shared by the shop and the level-up panel. */
export function StatList({ stats, columns = 2, preview }: StatListProps): JSX.Element {
	const half = columns === 2 ? Math.ceil(stats.length / 2) : stats.length;
	const groups = columns === 2 ? [stats.slice(0, half), stats.slice(half)] : [stats];
	return (
		<div className={`grid grid-cols-1 gap-x-4 ${columns === 2 ? "mobile-l:grid-cols-2" : ""}`}>
			{groups.map((group, c) => (
				<dl
					key={c === 0 ? "left" : "right"}
					className={`font-body text-sm desktop:text-base ${c === 1 ? "mobile-l:border-iron-dark mobile-l:border-l-2 mobile-l:pl-4" : ""}`}
				>
					{group.map((line) => {
						const after = line.id ? preview?.[line.id] : undefined;
						return (
							<div
								key={line.label}
								data-testid={after ? "stat-preview" : undefined}
								className={`flex justify-between gap-2 border-iron-dark border-b py-0.5 desktop:py-1 ${after ? "-mx-1 border-2 border-ember bg-iron-black px-1" : ""}`}
							>
								<dt className="text-bone">{line.label}</dt>
								<dd className={isNegative(line.value) ? "text-danger" : "text-heal"}>
									{after ? `${line.value} → ${after.after}` : line.value}
									{after ? (
										<span
											data-testid={`shop-delta-${line.id}`}
											className={`ml-1 ${after.better ? "text-heal" : "text-danger"}`}
										>
											({after.delta})
										</span>
									) : null}
								</dd>
							</div>
						);
					})}
				</dl>
			))}
		</div>
	);
}
