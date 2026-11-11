import { t } from "@gc/core";
import type { JSX } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Icon, type IconRef } from "../Icon/Icon";

export type OssuaryNodeState = "owned" | "available" | "locked" | "demo";

export interface OssuaryNodeView {
	id: string;
	lines: readonly string[];
	cost: number;
	state: OssuaryNodeState;
	affordable: boolean;
	icon?: IconRef | undefined;
}

export interface OssuaryBranchView {
	id: string;
	name: string;
	/** One-word theme under the branch name ("Survival"). */
	theme?: string | undefined;
	nodes: readonly OssuaryNodeView[];
}

export interface OssuaryViewModel {
	souls: number;
	branches: readonly OssuaryBranchView[];
	/** Souls a reset would give back. */
	refund: number;
}

export interface OssuaryActions {
	buy(id: string): void;
	reset(): void;
	close(): void;
}

export interface OssuaryProps {
	view: OssuaryViewModel;
	actions: OssuaryActions;
}

/** Branch accent: header tint and the border of bought nodes (PO mockup menu-ossuary.png). */
const BRANCH: Readonly<Record<string, { header: string; border: string; glyph: string }>> = {
	flesh: { header: "from-blood to-night-2 border-blood-light", border: "border-blood-light", glyph: "♥" },
	steel: { header: "from-iron-dark to-night-2 border-iron-light", border: "border-iron-light", glyph: "⚔" },
	shadow: { header: "from-shadow to-night-2 border-mist", border: "border-mist", glyph: "☾" },
	gold: { header: "from-mud to-night-2 border-ember", border: "border-ember", glyph: "●" },
	ruin: { header: "from-sludge/40 to-night-2 border-sludge", border: "border-sludge", glyph: "♜" },
};
const FALLBACK = { header: "from-iron-dark to-night-2 border-iron", border: "border-iron", glyph: "◆" };
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
 * The permanent tree (GDD 19), laid out like the PO mockup: five branch columns of six nodes linked top to bottom,
 * all on one screen. A node is a button that buys it when it is available and affordable.
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
				<div className="grid grid-cols-1 gap-3 landscape:grid-cols-5 mobile-l:grid-cols-5 desktop:flex-1">
					{view.branches.map((branch) => {
						const accent = BRANCH[branch.id] ?? FALLBACK;
						return (
							<section
								key={branch.id}
								aria-label={branch.name}
								data-testid={`ossuary-branch-${branch.id}`}
								className="flex min-w-0 flex-col"
							>
								<div
									className={`panel-riveted mb-2 flex items-center gap-3 border-2 bg-linear-to-b px-3 py-2 ${accent.header}`}
								>
									<span aria-hidden="true" className="font-display text-3xl text-bone">
										{accent.glyph}
									</span>
									<div className="min-w-0">
										<h2 className="font-display text-xl text-bone uppercase">
											{branch.name}
										</h2>
										{branch.theme ? (
											<p className="font-display text-xs text-bone-dark uppercase">
												{branch.theme}
											</p>
										) : null}
									</div>
								</div>
								{branch.nodes.map((node, i) => {
									const [title, ...rest] = node.lines;
									const owned = node.state === "owned";
									const available = node.state === "available";
									const dim = node.state === "locked" || node.state === "demo";
									const status =
										stateLabel(node.state) || t("ossuary.cost", { cost: node.cost });
									// Each state also differs in shape and words, not only in colour: a written "bought" with a check,
									// a glowing solid frame with the price, or a dashed frame with a lock square.
									const look = owned
										? `${accent.border} bg-linear-to-b from-iron-dark to-night-2`
										: available
											? "border-ember bg-linear-to-b from-iron-black to-night-2 shadow-[0_0_10px_var(--color-ember)]"
											: "border-dashed border-iron bg-night-2";
									const badge = owned ? (
										<span className="text-heal">
											<span aria-hidden="true">✓ </span>
											{t("ossuary.owned")}
										</span>
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
											<span aria-hidden="true">{dim ? "▣ ☠ " : "☠ "}</span>
											{node.cost}
										</span>
									);
									return (
										<div
											key={node.id}
											className="flex flex-col items-stretch desktop:flex-1"
										>
											{i > 0 ? (
												<span
													aria-hidden="true"
													className="mx-auto h-2 w-0.5 shrink-0 bg-rust"
												/>
											) : null}
											<button
												type="button"
												data-testid={`ossuary-node-${node.id}`}
												data-state={node.state}
												disabled={!available}
												onClick={() => actions.buy(node.id)}
												className={`flex min-h-14 items-center gap-2 border-2 p-2 text-left desktop:flex-1 desktop:gap-3 desktop:p-3 ${look} ${PRESS} enabled:hover:border-ember-light`}
											>
												<span className="hidden size-10 shrink-0 items-center justify-center border-2 border-iron-dark bg-night desktop:flex desktop:size-12">
													{node.icon ? <Icon icon={node.icon} /> : null}
												</span>
												<span className="min-w-0 flex-1">
													<span
														className={`block font-display text-sm desktop:text-lg ${dim ? "text-iron-light" : "text-bone"}`}
													>
														{title}
													</span>
													{rest.map((line) => (
														<span
															key={line}
															className={`block font-body text-xs desktop:text-base ${dim ? "text-iron-light" : "text-bone-dark"}`}
														>
															{line}
														</span>
													))}
													<span
														aria-hidden="true"
														className="mt-1 block font-display text-sm desktop:hidden"
													>
														{badge}
													</span>
												</span>
												<span
													aria-hidden="true"
													className="hidden shrink-0 font-display text-sm desktop:block desktop:text-lg"
												>
													{badge}
												</span>
												<span className="sr-only">{status}</span>
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
