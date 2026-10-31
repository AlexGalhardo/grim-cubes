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

export function Results({ view, onRestart }: ResultsProps): JSX.Element {
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
				<Panel title="Fim da run" riveted>
					<h1 id="results-title" className="sr-only">
						Resultados
					</h1>
					<dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-body text-sm mobile-l:text-base">
						<dt className="text-bone-dark">Round</dt>
						<dd className="text-right" data-testid="results-round">
							{view.round}
						</dd>
						<dt className="text-bone-dark">Recorde</dt>
						<dd className="text-right" data-testid="results-record">
							{view.record}
							{view.newRecord ? " (novo!)" : ""}
						</dd>
						<dt className="text-bone-dark">Abates</dt>
						<dd className="text-right" data-testid="results-kills">
							{view.kills}
						</dd>
						<dt className="text-bone-dark">Dano causado</dt>
						<dd className="text-right">{view.damage}</dd>
						<dt className="text-bone-dark">Causa da morte</dt>
						<dd className="text-right" data-testid="results-cause">
							{view.cause}
						</dd>
						<dt className="text-bone-dark">Seed</dt>
						<dd className="text-right" data-testid="results-seed">
							{view.seed}
						</dd>
					</dl>
					<ul className="my-3 font-body text-sm text-bone-dark" aria-label="Build">
						{view.build.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
					<p className="mb-4 text-ember-light">
						Almas: <span data-testid="results-souls">{souls}</span>
						<span className="text-bone-dark"> (total {view.totalSouls})</span>
					</p>
					<div className="flex justify-end">
						<Button size="lg" onClick={onRestart}>
							Jogar de novo
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
