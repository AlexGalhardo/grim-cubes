import { t } from "@gc/core";
import { type JSX, useState } from "react";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface DifficultyOptionView {
	id: string;
	name: string;
	/** "HP e dano ×1,25 · almas ×1,5" */
	summary: string;
	locked: boolean;
	/** Why it is locked ("Recorde Normal ≥ 20"); empty when open. */
	requirement: string;
}

export interface DifficultyViewModel {
	options: readonly DifficultyOptionView[];
	/** Difficulty highlighted when the screen opens. */
	selected: string;
}

export interface DifficultyActions {
	/** `seedText` is what the player typed; empty means a random seed. */
	start(difficultyId: string, seedText: string): void;
	cancel(): void;
}

export interface DifficultyProps {
	view: DifficultyViewModel;
	actions: DifficultyActions;
}

/** Picks the difficulty and an optional seed before a new run (GDD 17). */
export function Difficulty({ view, actions }: DifficultyProps): JSX.Element {
	const [selected, setSelected] = useState(view.selected);
	const [seed, setSeed] = useState("");
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="difficulty-title"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-xl">
				<Panel title={t("difficulty.panel")} riveted>
					<h1 id="difficulty-title" className="sr-only">
						{t("difficulty.title")}
					</h1>
					<div className="flex flex-col gap-2">
						{view.options.map((option) => (
							<button
								key={option.id}
								type="button"
								aria-pressed={selected === option.id}
								data-testid={`difficulty-${option.id}`}
								disabled={option.locked}
								onClick={() => setSelected(option.id)}
								className={`flex min-h-12 flex-col gap-1 border-2 bg-night-2 p-2 text-left font-body text-sm transition-colors duration-fast ${selected === option.id ? "border-ember text-ember-light" : "border-mist text-bone"} ${option.locked ? "opacity-60" : "enabled:hover:text-ember-light"}`}
							>
								<span className="font-display text-base">{option.name}</span>
								<span className="text-bone-dark">
									{option.locked ? option.requirement : option.summary}
								</span>
							</button>
						))}
					</div>
					<label className="mt-4 flex flex-col gap-1 font-body text-sm text-bone-dark">
						{t("difficulty.seed")}
						<input
							type="text"
							data-testid="difficulty-seed"
							value={seed}
							onChange={(event) => setSeed(event.target.value)}
							maxLength={32}
							autoComplete="off"
							spellCheck={false}
							placeholder={t("difficulty.seedPlaceholder")}
							className="min-h-12 border-2 border-mist bg-night-2 px-2 text-bone focus:border-ember"
						/>
					</label>
					<div className="mt-4 flex flex-wrap justify-between gap-3">
						<Button onClick={actions.cancel}>{t("difficulty.back")}</Button>
						<Button size="lg" onClick={() => actions.start(selected, seed)}>
							{t("difficulty.start")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
