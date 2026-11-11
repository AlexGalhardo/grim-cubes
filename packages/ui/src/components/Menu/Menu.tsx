import { t } from "@gc/core";
import { type JSX, useEffect, useRef, useState } from "react";
import { useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { LeaveConfirm } from "../LeaveConfirm/LeaveConfirm";

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
	/** "Desafio diário": today's seed and hero (GDD 20). */
	daily(): void;
	ossuary(): void;
	options(): void;
	/** Opens the Steam page; the button is absent when the build has no URL. */
	wishlist?: (() => void) | undefined;
	/** Closes the app. Only the desktop build offers it: the web page and the phone have nothing to quit to. */
	quit?: (() => void) | undefined;
}

export interface MenuProps {
	view: MenuViewModel;
	actions: MenuActions;
	/** Build release, shown in the menu (the HUD label hides behind dialogs). */
	version?: string | undefined;
	demo?: boolean | undefined;
}

/** Fixed so the embers do not flicker between renders: horizontal position (%), rise start (% from the bottom) and delay (s). */
const EMBERS: readonly { left: number; bottom: number; delay: number }[] = [
	{ left: 8, bottom: 4, delay: 0 },
	{ left: 17, bottom: 12, delay: 2.4 },
	{ left: 27, bottom: 2, delay: 4.1 },
	{ left: 36, bottom: 9, delay: 1.2 },
	{ left: 46, bottom: 3, delay: 5.3 },
	{ left: 55, bottom: 14, delay: 3.2 },
	{ left: 64, bottom: 5, delay: 0.7 },
	{ left: 73, bottom: 10, delay: 4.8 },
	{ left: 82, bottom: 1, delay: 2.0 },
	{ left: 91, bottom: 8, delay: 5.9 },
];

/** The title screen: shown once when the game opens, before the difficulty choice (GDD 17). */
export function Menu({ view, actions, version, demo }: MenuProps): JSX.Element {
	const first = useRef<HTMLButtonElement>(null);
	const [asking, setAsking] = useState(false);
	// On open, and again when the quit question is answered "stay".
	useEffect(() => {
		if (!asking) first.current?.focus();
	}, [asking]);
	const nav = useDialogNav<HTMLDivElement>({ onCancel: () => setAsking(false) });
	// Short landscape phones: buttons only, under the logo, so the art's title stays readable.
	const short = useShortScreen();
	// The main action (Continue, or New game without a save) is the large plate; the rest are "md". Short screens use "md" for all, with the buttons after the first in two columns so seven of them fit 360 px.
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
			<div
				aria-hidden="true"
				data-testid="menu-embers"
				className="pointer-events-none fixed inset-0 overflow-hidden"
			>
				{EMBERS.map((ember) => (
					<span
						key={ember.left}
						className="absolute bottom-0 block size-1 animate-ember bg-ember-light"
						style={{
							left: `${ember.left}%`,
							animationDelay: `${ember.delay}s`,
							bottom: `${ember.bottom}%`,
						}}
					/>
				))}
			</div>
			{/* The key art carries the logo at the top centre; the dark left side holds the buttons. */}
			<div
				aria-hidden="true"
				className="pointer-events-none fixed inset-0 bg-linear-to-r from-night/85 via-night/30 to-transparent"
			/>
			<div
				data-testid="menu-panel"
				className={`relative w-full ${short ? "mt-auto grid max-w-80 grid-cols-2 gap-1 pb-2 [&>:not(button)]:col-span-2 [&>button:first-of-type]:col-span-2" : "flex flex-col gap-3 my-auto max-w-60 mobile-l:ml-[3%] mobile-l:max-w-xs desktop-xl:max-w-sm"}`}
			>
				<h1 id="menu-title" className="sr-only">
					{t("menu.title")}
				</h1>
				{demo ? (
					<div
						data-testid="menu-demo"
						className="fixed top-2 right-2 border-2 border-ember bg-night/80 px-3 py-0.5 font-display text-base text-ember-light uppercase shadow-plate"
					>
						{t("demo.badge")}
					</div>
				) : null}
				{asking ? (
					<LeaveConfirm
						testId="menu-quit-confirm"
						question={t("menu.quitConfirm")}
						stayLabel={t("leave.stay")}
						leaveLabel={t("leave.quit")}
						onStay={() => setAsking(false)}
						onLeave={() => actions.quit?.()}
					/>
				) : null}
				{asking ? null : view.continue ? (
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
				{asking ? null : (
					<Button
						size={view.continue ? "md" : buttonSize}
						variant={view.continue ? "plate" : "primary"}
						testId="menu-play"
						{...(view.continue ? {} : { buttonRef: first })}
						onClick={actions.play}
					>
						{t("menu.play")}
					</Button>
				)}
				{asking ? null : (
					<Button size="md" testId="menu-daily" onClick={actions.daily}>
						{t("menu.daily")}
					</Button>
				)}
				{asking ? null : (
					<Button size="md" onClick={actions.ossuary}>
						{t("menu.ossuary")}
					</Button>
				)}
				{asking ? null : (
					<Button size="md" onClick={actions.options}>
						{t("menu.options")}
					</Button>
				)}
				{!asking && actions.wishlist ? (
					<Button size="md" testId="menu-wishlist" onClick={actions.wishlist}>
						{t("wishlist.steam")}
					</Button>
				) : null}
				{!asking && actions.quit ? (
					<Button size="md" testId="menu-quit" onClick={() => setAsking(true)}>
						{t("menu.quit")}
					</Button>
				) : null}
			</div>
			{view.records.length > 0 ? (
				<section
					data-testid="menu-records"
					aria-label={t("menu.records")}
					className={`border-2 border-iron-dark bg-night/80 shadow-plate ${short ? "fixed right-2 bottom-2 px-2 py-1" : "fixed right-4 bottom-4 px-4 py-2"}`}
				>
					<h2 className="font-display text-bone text-xs uppercase">{t("menu.records")}</h2>
					<ul className={`font-body text-bone ${short ? "text-xs" : "text-sm"}`}>
						{view.records.map((record) => (
							<li key={record.id} className="flex justify-between gap-4">
								<span className="text-bone-dark">{record.name}</span>
								<span data-testid={`menu-record-${record.id}`}>
									{record.round > 0
										? t("menu.recordRound", { round: record.round })
										: t("menu.noRecord")}
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}
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
