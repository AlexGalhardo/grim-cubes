import { t } from "@gc/core";
import type { JSX } from "react";
import { useDialogNav } from "../../nav/useDialogNav";

export type OssuaryNodeState = "owned" | "available" | "locked" | "demo";

/** One square: the level it takes its spell to. */
export interface OssuaryNodeView {
	id: string;
	/** The spell level the square reaches, 2 to 10. */
	level: number;
	/** What the square does, for the tooltip and the screen reader ("Level 2", "+15% damage"). */
	lines: readonly string[];
	cost: number;
	state: OssuaryNodeState;
	affordable: boolean;
}

/** A column of the class tree: one spell and its squares, level 2 at the top. */
export interface OssuaryBranchView {
	id: string;
	name: string;
	/** `auto` (cast by itself), `heal` or `super` (cast by the player): picks the accent. */
	kind: "auto" | "heal" | "super";
	/** One-word type under the spell name ("Automatic"). */
	theme?: string | undefined;
	/** The spell level now, shown over the column. */
	level: number;
	nodes: readonly OssuaryNodeView[];
}

export interface OssuaryClassView {
	id: string;
	name: string;
}

export interface OssuaryViewModel {
	souls: number;
	/** The classes, one tab each; the tree below belongs to `selectedClass`. */
	classes: readonly OssuaryClassView[];
	selectedClass: string;
	branches: readonly OssuaryBranchView[];
	/** Souls a reset would give back (the whole tree, every class). */
	refund: number;
}

export interface OssuaryActions {
	buy(id: string): void;
	reset(): void;
	close(): void;
	selectClass(id: string): void;
}

export interface OssuaryProps {
	view: OssuaryViewModel;
	actions: OssuaryActions;
}

/** Column accent: header tint and the border of bought squares. */
const KIND: Readonly<Record<OssuaryBranchView["kind"], { header: string; border: string; glyph: string }>> = {
	auto: { header: "from-iron-dark to-night-2 border-iron-light", border: "border-iron-light", glyph: "⚔" },
	heal: { header: "from-sludge/40 to-night-2 border-sludge", border: "border-sludge", glyph: "✚" },
	super: { header: "from-mud to-night-2 border-ember", border: "border-ember", glyph: "✦" },
};
const PRESS =
	"transition-[translate,box-shadow] duration-fast active:translate-y-1 active:shadow-none focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2";

const stateLabel = (state: OssuaryNodeState): string =>
	state === "owned"
		? t("ossuary.owned")
		: state === "locked"
			? t("ossuary.locked")
			: state === "demo"
				? t("ossuary.demo")
				: "";

/**
 * The permanent tree (GDD 19) as linked squares: a tab per class, six columns (the class's spells) of nine squares
 * (levels 2 to 10) joined top to bottom. A square is a button that buys it when it is available and affordable; each
 * state also differs in shape and words, not only in colour.
 */
export function Ossuary({ view, actions }: OssuaryProps): JSX.Element {
	const nav = useDialogNav<HTMLDivElement>({ onCancel: actions.close });
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="ossuary-title"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-linear-to-b from-night/95 to-shadow/95 p-2 mobile-l:p-4"
		>
			<div className="m-auto flex w-full max-w-[1700px] flex-col gap-3 desktop:my-0 desktop:min-h-full">
				<div className="flex items-center justify-between gap-4 border-rust border-b-2 pb-2">
					<h1
						id="ossuary-title"
						className="font-display text-3xl text-bone uppercase desktop:text-4xl"
					>
						{t("ossuary.title")}
					</h1>
					<p
						className="font-display text-xl text-bone desktop:text-2xl"
						data-testid="ossuary-souls"
					>
						<span aria-hidden="true">☠ </span>
						{t("ossuary.souls", { souls: view.souls })}
					</p>
				</div>
				<div role="tablist" aria-label={t("ossuary.classes")} className="flex flex-wrap gap-2">
					{view.classes.map((cls) => {
						const selected = cls.id === view.selectedClass;
						return (
							<button
								key={cls.id}
								type="button"
								role="tab"
								aria-selected={selected}
								data-testid={`ossuary-class-${cls.id}`}
								onClick={() => actions.selectClass(cls.id)}
								className={`min-h-10 border-2 px-4 font-display text-base uppercase desktop:min-h-12 desktop:text-xl ${selected ? "border-ember bg-linear-to-b from-iron-black to-night-2 text-ember-light" : "border-iron bg-night-2 text-bone"} ${PRESS} enabled:hover:border-ember-light`}
							>
								{cls.name}
							</button>
						);
					})}
				</div>
				<div
					role="tabpanel"
					className="grid grid-cols-3 gap-2 landscape:grid-cols-6 mobile-l:grid-cols-6 desktop:flex-1"
				>
					{view.branches.map((branch) => {
						const accent = KIND[branch.kind];
						return (
							<section
								key={branch.id}
								aria-label={branch.name}
								data-testid={`ossuary-branch-${branch.id}`}
								className="flex min-w-0 flex-col items-center"
							>
								<div
									className={`panel-riveted mb-2 flex w-full flex-col items-center gap-0.5 border-2 bg-linear-to-b px-1 py-2 text-center ${accent.header}`}
								>
									<span aria-hidden="true" className="font-display text-2xl text-bone">
										{accent.glyph}
									</span>
									<h2 className="font-display text-xs text-bone uppercase leading-tight desktop:text-base">
										{branch.name}
									</h2>
									{branch.theme ? (
										<p className="font-display text-[0.65rem] text-bone-dark uppercase desktop:text-xs">
											{branch.theme}
										</p>
									) : null}
									<p
										data-testid={`ossuary-level-${branch.id}`}
										className="font-display text-xs text-ember-light desktop:text-sm"
									>
										{t("ossuary.level", { level: branch.level })}
									</p>
								</div>
								{branch.nodes.map((node, i) => {
									const owned = node.state === "owned";
									const available = node.state === "available";
									const dim = node.state === "locked" || node.state === "demo";
									const status =
										stateLabel(node.state) || t("ossuary.cost", { cost: node.cost });
									// A written "bought" with a check, a glowing solid frame with the price, or a dashed frame with
									// a lock square.
									const look = owned
										? `${accent.border} bg-linear-to-b from-iron-dark to-night-2`
										: available
											? "border-ember bg-linear-to-b from-iron-black to-night-2 shadow-[0_0_10px_var(--color-ember)]"
											: "border-dashed border-iron bg-night-2";
									const badge = owned ? (
										<span className="text-heal">✓</span>
									) : (
										<span
											className={
												dim
													? "text-iron-light"
													: node.affordable
														? "text-bone"
														: "text-danger"
											}
										>
											{dim ? "▣" : "☠"} {node.cost}
										</span>
									);
									return (
										<div key={node.id} className="flex flex-col items-center">
											{i > 0 ? (
												<span
													aria-hidden="true"
													className="h-2 w-0.5 shrink-0 bg-rust"
												/>
											) : null}
											<button
												type="button"
												data-testid={`ossuary-node-${node.id}`}
												data-state={node.state}
												disabled={!available}
												title={node.lines.join(", ")}
												onClick={() => actions.buy(node.id)}
												className={`flex size-14 flex-col items-center justify-center border-2 text-center desktop:size-[4.5rem] ${look} ${PRESS} enabled:hover:border-ember-light`}
											>
												<span
													aria-hidden="true"
													className={`font-display text-lg leading-none desktop:text-2xl ${dim ? "text-iron-light" : "text-bone"}`}
												>
													{node.level}
												</span>
												<span
													aria-hidden="true"
													className="font-display text-[0.65rem] leading-tight desktop:text-sm"
												>
													{badge}
												</span>
												<span className="sr-only">
													{node.lines.join(", ")}. {status}
												</span>
											</button>
										</div>
									);
								})}
							</section>
						);
					})}
				</div>
				<div className="flex flex-wrap items-center gap-3 border-rust border-t-2 pt-3">
					<button
						type="button"
						onClick={actions.reset}
						disabled={view.refund === 0}
						className={`min-h-12 border-2 border-iron bg-linear-to-b from-iron to-iron-dark px-5 font-display text-lg text-bone shadow-[0_4px_0_var(--color-night)] disabled:opacity-50 ${PRESS}`}
					>
						{t("ossuary.reset", { refund: view.refund })}
					</button>
					{view.refund > 0 ? (
						<p className="font-body text-sm text-ember-light">
							<span aria-hidden="true">⚠ </span>
							{t("ossuary.resetHint", { refund: view.refund })}
						</p>
					) : null}
					<button
						type="button"
						onClick={actions.close}
						className={`ml-auto min-h-12 min-w-40 border-2 border-ember-light bg-linear-to-b from-ember to-rust px-6 font-display text-xl text-night uppercase shadow-[0_4px_0_var(--color-mud)] hover:from-ember-light ${PRESS}`}
					>
						{t("ossuary.back")}
					</button>
				</div>
			</div>
		</div>
	);
}
