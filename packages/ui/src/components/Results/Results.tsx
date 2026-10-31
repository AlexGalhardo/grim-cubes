import { t } from "@gc/core";
import { type JSX, useEffect, useState } from "react";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface ResultsViewModel {
	round: number;
	kills: number;
	damage: number;
	/** Human readable cause of death. */
	cause: string;
	/** Weapon and items of the run, one entry per line. */
	build: readonly string[];
	/** Souls earned this run. */
	souls: number;
	/** Souls in the account after this run. */
	totalSouls: number;
	record: number;
	newRecord: boolean;
	seed: number;
}

export interface ResultsProps {
	view: ResultsViewModel;
	onRestart: () => void;
	/** Opens the Ossuary so the souls just earned can be spent before the next run. */
	onOssuary?: (() => void) | undefined;
}

const COUNT_STEPS = 20;
const COUNT_TICK_MS = 75;

/** The shown number climbs to `target` in fixed steps (Art Bible 16.6), ending exactly on it. */
function useCountUp(target: number): number {
	const [shown, setShown] = useState(0);
	useEffect(() => {
		let step = 0;
		const timer = setInterval(() => {
			step++;
			setShown(step >= COUNT_STEPS ? target : Math.floor((target * step) / COUNT_STEPS));
			if (step >= COUNT_STEPS) clearInterval(timer);
		}, COUNT_TICK_MS);
		return () => clearInterval(timer);
	}, [target]);
	return shown;
}

export function Results({ view, onRestart, onOssuary }: ResultsProps): JSX.Element {
	const souls = useCountUp(view.souls);
	useEffect(() => {
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === "Enter") onRestart();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onRestart]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="results-title"
			className="pointer-events-auto absolute inset-0 z-20 flex overflow-y-auto bg-night/85 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-3xl">
				<Panel title={t("results.panel")} riveted>
					<h1 id="results-title" className="sr-only">
						{t("results.title")}
					</h1>
					<dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-body text-sm mobile-l:text-base">
						<dt className="text-bone-dark">{t("results.round")}</dt>
						<dd className="text-right" data-testid="results-round">
							{view.round}
						</dd>
						<dt className="text-bone-dark">{t("results.record")}</dt>
						<dd className="text-right" data-testid="results-record">
							{view.record}
							{view.newRecord ? t("results.newRecord") : ""}
						</dd>
						<dt className="text-bone-dark">{t("results.kills")}</dt>
						<dd className="text-right" data-testid="results-kills">
							{view.kills}
						</dd>
						<dt className="text-bone-dark">{t("results.damage")}</dt>
						<dd className="text-right">{view.damage}</dd>
						<dt className="text-bone-dark">{t("results.cause")}</dt>
						<dd className="text-right" data-testid="results-cause">
							{view.cause}
						</dd>
						<dt className="text-bone-dark">{t("results.seed")}</dt>
						<dd className="text-right" data-testid="results-seed">
							{view.seed}
						</dd>
					</dl>
					<ul className="my-3 font-body text-sm text-bone-dark" aria-label={t("results.build")}>
						{view.build.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
					<p className="mb-4 text-ember-light">
						{t("results.souls")} <span data-testid="results-souls">{souls}</span>
						<span className="text-bone-dark">
							{t("results.totalSouls", { total: view.totalSouls })}
						</span>
					</p>
					<div className="flex flex-wrap justify-end gap-3">
						{onOssuary ? <Button onClick={onOssuary}>{t("results.ossuary")}</Button> : null}
						<Button size="lg" onClick={onRestart}>
							{t("results.restart")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
