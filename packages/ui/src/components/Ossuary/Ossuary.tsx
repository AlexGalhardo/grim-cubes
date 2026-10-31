import { t } from "@gc/core";
import { type JSX, useState } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Icon, type IconRef } from "../Icon/Icon";
import { Panel } from "../Panel/Panel";

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

const STATE_STYLE: Readonly<Record<OssuaryNodeState, string>> = {
	owned: "border-sludge text-bone",
	available: "border-ember text-bone",
	locked: "border-mist text-bone-dark opacity-70",
	demo: "border-mist text-bone-dark opacity-50",
};
const stateLabel = (state: OssuaryNodeState): string =>
	state === "owned"
		? t("ossuary.owned")
		: state === "locked"
			? t("ossuary.locked")
			: state === "demo"
				? t("ossuary.demo")
				: "";

/**
 * The permanent tree (GDD 19): one column per branch on wide screens, tabs on small ones. A node is a button
 * that buys it when it is available and affordable.
 */
export function Ossuary({ view, actions }: OssuaryProps): JSX.Element {
	const [tab, setTab] = useState(0);
	const branches = view.branches;
	const renderBranch = (branch: OssuaryBranchView, hidden: boolean): JSX.Element => (
		<div
			key={branch.id}
			data-testid={`ossuary-branch-${branch.id}`}
			className={`${hidden ? "hidden desktop:flex" : "flex"} flex-1 flex-col gap-2`}
		>
			<h2 className="font-display text-base text-ember-light">{branch.name}</h2>
			{branch.nodes.map((node) => (
				<button
					key={node.id}
					type="button"
					data-testid={`ossuary-node-${node.id}`}
					data-state={node.state}
					disabled={node.state !== "available"}
					onClick={() => actions.buy(node.id)}
					className={`flex min-h-12 flex-col gap-1 border-2 bg-night-2 p-2 text-left font-body text-sm transition-colors duration-fast ${STATE_STYLE[node.state]} ${node.state === "available" && !node.affordable ? "text-danger" : ""} enabled:hover:text-ember-light`}
				>
					{node.icon ? <Icon icon={node.icon} /> : null}
					{node.lines.map((line) => (
						<span key={line}>{line}</span>
					))}
					<span className="font-display text-xs text-currency">
						{stateLabel(node.state) || t("ossuary.cost", { cost: node.cost })}
					</span>
				</button>
			))}
		</div>
	);

	const nav = useDialogNav<HTMLDivElement>({ onCancel: actions.close });
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="ossuary-title"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-6xl">
				<Panel title={t("ossuary.panel")} riveted>
					<h1 id="ossuary-title" className="sr-only">
						{t("ossuary.title")}
					</h1>
					<p className="mb-3 text-currency" data-testid="ossuary-souls">
						{t("ossuary.souls", { souls: view.souls })}
					</p>
					<div role="tablist" className="mb-3 flex flex-wrap gap-2 desktop:hidden">
						{branches.map((branch, i) => (
							<button
								key={branch.id}
								type="button"
								role="tab"
								aria-selected={tab === i}
								onClick={() => setTab(i)}
								className={`h-10 border-b-2 px-3 font-display text-base pointer-coarse:min-h-12 ${tab === i ? "border-ember text-ember-light" : "border-transparent text-bone-dark"}`}
							>
								{branch.name}
							</button>
						))}
					</div>
					<div className="flex gap-3">
						{branches.map((branch, i) => renderBranch(branch, i !== tab))}
					</div>
					<div className="mt-4 flex flex-wrap justify-between gap-3">
						<Button onClick={actions.reset} disabled={view.refund === 0}>
							{t("ossuary.reset", { refund: view.refund })}
						</Button>
						<Button size="lg" onClick={actions.close}>
							{t("ossuary.back")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
