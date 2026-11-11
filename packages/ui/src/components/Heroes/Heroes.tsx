import { t } from "@gc/core";
import { type JSX, useState } from "react";
import { useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface HeroView {
	id: string;
	name: string;
	/** Theme token the shared portrait is recoloured with (`iron-light`); null keeps the portrait as is. */
	tint: string | null;
	weapon: string;
	passiveName: string;
	/** The passive's effect, one line per modifier. */
	passiveLines: readonly string[];
	locked: boolean;
	/** Why it is locked ("Chegue ao round 10"); empty when open. */
	requirement: string;
}

export interface HeroesViewModel {
	heroes: readonly HeroView[];
	/** Hero highlighted when the screen opens. */
	selected: string;
}

export interface HeroesActions {
	choose(heroId: string): void;
	cancel(): void;
}

export interface HeroesProps {
	view: HeroesViewModel;
	actions: HeroesActions;
}

/** Picks the hero of the next run, between the save slot and the difficulty (GDD 7, 21.1). */
export function Heroes({ view, actions }: HeroesProps): JSX.Element {
	const [selected, setSelected] = useState(view.selected);
	const nav = useDialogNav<HTMLDivElement>({ onCancel: actions.cancel });
	const short = useShortScreen();
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="heroes-title"
			data-testid="heroes"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-4xl">
				<Panel title={t("heroes.panel")} riveted>
					<h1 id="heroes-title" className="sr-only">
						{t("heroes.title")}
					</h1>
					<div className="grid grid-cols-3 gap-2 mobile-l:gap-3">
						{view.heroes.map((hero) => (
							<button
								key={hero.id}
								type="button"
								aria-pressed={selected === hero.id}
								data-testid={`hero-${hero.id}`}
								disabled={hero.locked}
								onClick={() => setSelected(hero.id)}
								className={`flex flex-col items-stretch gap-1 border-2 bg-night-2 p-2 text-left font-body text-xs transition-colors duration-fast desktop:gap-2 desktop:text-sm ${selected === hero.id ? "border-ember text-ember-light" : "border-mist text-bone"} ${hero.locked ? "opacity-70" : "enabled:hover:text-ember-light"}`}
							>
								<span
									aria-hidden="true"
									data-testid={`hero-portrait-${hero.id}`}
									className={`relative mx-auto block shrink-0 border-2 border-rust bg-night bg-[url(/portraits/hero.webp)] bg-cover ${short ? "size-12" : "size-16 mobile-l:size-24 desktop:size-32"}`}
								>
									{hero.tint ? (
										<span
											className="absolute inset-0 mix-blend-color"
											style={{ backgroundColor: `var(--color-${hero.tint})` }}
										/>
									) : null}
								</span>
								<span className="font-display text-sm leading-tight desktop:text-lg">
									{hero.name}
								</span>
								<span className="text-bone-dark">
									{t("heroes.weapon")}: <span className="text-bone">{hero.weapon}</span>
								</span>
								<span className="text-bone-dark">
									{t("heroes.passive")}:{" "}
									<span className="text-ember-light">{hero.passiveName}</span>
								</span>
								{hero.passiveLines.map((line) => (
									<span key={line} className="text-bone">
										{line}
									</span>
								))}
								{hero.locked ? (
									<span className="text-ember" data-testid={`hero-requirement-${hero.id}`}>
										{t("heroes.locked")}: {hero.requirement}
									</span>
								) : null}
							</button>
						))}
					</div>
					<div className="mt-3 flex flex-wrap justify-between gap-3">
						<Button onClick={actions.cancel}>{t("heroes.back")}</Button>
						<Button size="lg" testId="heroes-start" onClick={() => actions.choose(selected)}>
							{t("heroes.start")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
