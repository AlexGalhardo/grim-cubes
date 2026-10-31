import { t } from "@gc/core";
import { type JSX, useEffect, useRef } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface MenuViewModel {
	/** Best round per difficulty, in the order they unlock. 0 means none yet. */
	records: readonly { id: string; name: string; round: number }[];
}

export interface MenuActions {
	play(): void;
	ossuary(): void;
	options(): void;
}

export interface MenuProps {
	view: MenuViewModel;
	actions: MenuActions;
	/** Build release, shown in the menu (the HUD label hides behind dialogs). */
	version?: string | undefined;
	demo?: boolean | undefined;
}

/** The title screen: shown once when the game opens, before the difficulty choice (GDD 17). */
export function Menu({ view, actions, version, demo }: MenuProps): JSX.Element {
	const play = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		play.current?.focus();
	}, []);
	const nav = useDialogNav<HTMLDivElement>();
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="menu-title"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-xl">
				<Panel title={demo ? t("demo.badge") : t("menu.panel")} riveted>
					<h1 id="menu-title" className="text-center font-display text-3xl text-ember-light">
						{t("menu.title")}
					</h1>
					<div className="mt-4 flex flex-col gap-2">
						<button
							ref={play}
							type="button"
							data-testid="menu-play"
							onClick={actions.play}
							className="min-h-12 border-2 border-ember bg-iron px-4 font-display text-lg text-ember-light shadow-plate hover:text-bone focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2"
						>
							{t("menu.play")}
						</button>
						<Button size="lg" onClick={actions.ossuary}>
							{t("menu.ossuary")}
						</Button>
						<Button size="lg" onClick={actions.options}>
							{t("menu.options")}
						</Button>
					</div>
					<div className="mt-4 font-body text-sm text-bone-dark" data-testid="menu-records">
						<div className="font-display text-base text-bone">{t("menu.records")}</div>
						<ul className="mt-1">
							{view.records.map((record) => (
								<li key={record.id} className="flex justify-between">
									<span>{record.name}</span>
									<span>
										{record.round > 0
											? t("menu.recordRound", { round: record.round })
											: t("menu.noRecord")}
									</span>
								</li>
							))}
						</ul>
					</div>
					{version ? (
						<div className="mt-3 text-right text-xs opacity-70" data-testid="menu-version">
							v{version}
						</div>
					) : null}
				</Panel>
			</div>
		</div>
	);
}
