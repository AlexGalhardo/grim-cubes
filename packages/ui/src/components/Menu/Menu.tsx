import { t } from "@gc/core";
import { type JSX, useEffect, useRef } from "react";
import { useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface MenuViewModel {
	/** Best round per difficulty, in the order they unlock. 0 means none yet. */
	records: readonly { id: string; name: string; round: number }[];
	/** Present when a slot was used before: "Continuar" opens it. `runRound` is the saved run's round, if any. */
	continue: { slotName: string; runRound: number | null } | null;
}

export interface MenuActions {
	/** Resumes the saved run of the last slot, or goes to the difficulty screen when it has none. */
	resume(): void;
	/** "Novo jogo": the slot choice. */
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
	const first = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		first.current?.focus();
	}, []);
	const nav = useDialogNav<HTMLDivElement>();
	// Short landscape phones: buttons only, under the logo, so the art's title stays readable.
	const short = useShortScreen();
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="menu-title"
			data-testid="menu"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night bg-[url(/menu/menu-1.webp)] bg-cover bg-top p-2 mobile-l:p-4"
		>
			{/* The key art carries the logo at the top centre; the dark left side holds the buttons. */}
			<div
				aria-hidden="true"
				className="pointer-events-none fixed inset-0 bg-linear-to-r from-night/85 via-night/30 to-transparent"
			/>
			<div
				data-testid="menu-panel"
				className={`relative w-full ${short ? "mt-auto max-w-52" : "my-auto max-w-60 mobile-l:ml-[3%] mobile-l:max-w-xs desktop-xl:max-w-sm"}`}
			>
				<Panel title={demo ? t("demo.badge") : short ? undefined : t("menu.panel")} riveted>
					<h1 id="menu-title" className="sr-only">
						{t("menu.title")}
					</h1>
					<div className="flex flex-col gap-2">
						{view.continue ? (
							<button
								ref={first}
								type="button"
								data-testid="menu-continue"
								onClick={actions.resume}
								className="flex min-h-12 flex-col items-center justify-center border-2 border-ember bg-iron px-4 font-display text-lg text-ember-light shadow-plate hover:text-bone focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2"
							>
								{t("menu.continue")}
								<span className="font-body text-xs text-bone-dark">
									{view.continue.runRound !== null
										? t("menu.continueRun", {
												slot: view.continue.slotName,
												round: view.continue.runRound,
											})
										: view.continue.slotName}
								</span>
							</button>
						) : null}
						<button
							ref={view.continue ? undefined : first}
							type="button"
							data-testid="menu-play"
							onClick={actions.play}
							className={`min-h-12 border-2 px-4 font-display text-lg shadow-plate hover:text-bone focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 ${view.continue ? "border-iron-dark bg-iron text-bone" : "border-ember bg-iron text-ember-light"}`}
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
					{short ? null : (
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
					)}
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
