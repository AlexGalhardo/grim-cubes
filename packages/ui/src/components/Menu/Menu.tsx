import { t } from "@gc/core";
import { type JSX, useEffect, useRef } from "react";
import { useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";

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
export function Menu({ actions, version, demo }: MenuProps): JSX.Element {
	const play = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		play.current?.focus();
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
				<Button
					size={buttonSize}
					variant="primary"
					testId="menu-play"
					buttonRef={play}
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
