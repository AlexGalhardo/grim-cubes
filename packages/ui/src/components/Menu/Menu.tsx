import { t } from "@gc/core";
import { type JSX, useEffect, useRef } from "react";
import { useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";

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
	// Room for four buttons (Continue and New game join Play, Ossuary and Options) on a 360 px screen.
	const buttonSize = short ? "md" : "lg";
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
				className={`relative flex w-full flex-col ${short ? "mt-auto max-w-52 gap-2 pb-5" : "gap-3 my-auto max-w-60 mobile-l:ml-[3%] mobile-l:max-w-xs desktop-xl:max-w-sm"}`}
			>
				<h1 id="menu-title" className="sr-only">
					{t("menu.title")}
				</h1>
				{demo ? (
					<div className="text-center font-display text-sm text-ember-light">{t("demo.badge")}</div>
				) : null}
				{view.continue ? (
					<Button
						size={buttonSize}
						variant="primary"
						testId="menu-continue"
						buttonRef={first}
						onClick={actions.resume}
					>
						<span className="flex flex-col items-center leading-tight">
							{t("menu.continue")}
							<span className="font-body text-xs opacity-80">
								{view.continue.runRound !== null
									? t("menu.continueRun", {
											slot: view.continue.slotName,
											round: view.continue.runRound,
										})
									: view.continue.slotName}
							</span>
						</span>
					</Button>
				) : null}
				<Button
					size={buttonSize}
					variant={view.continue ? "plate" : "primary"}
					testId="menu-play"
					{...(view.continue ? {} : { buttonRef: first })}
					onClick={actions.play}
				>
					{t("menu.play")}
				</Button>
				<Button size={buttonSize} onClick={actions.ossuary}>
					{t("menu.ossuary")}
				</Button>
				<Button size={buttonSize} onClick={actions.options}>
					{t("menu.options")}
				</Button>
			</div>
			{version ? (
				<div
					className="pointer-events-none fixed bottom-1 left-2 text-xs opacity-70"
					data-testid="menu-version"
				>
					v{version}
				</div>
			) : null}
		</div>
	);
}
