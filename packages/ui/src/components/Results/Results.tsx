import { t } from "@gc/core";
import { type JSX, useEffect, useState } from "react";
import { useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import type { HudItem, HudWeapon } from "../Hud/hudTypes";
import { Icon } from "../Icon/Icon";
import { LeaveConfirm } from "../LeaveConfirm/LeaveConfirm";
import { Panel } from "../Panel/Panel";
import { TIER_BORDER } from "../styles";

export type CauseKind = "enemy" | "elite" | "boss" | "shot" | "self" | "none";

export interface ResultsViewModel {
	round: number;
	kills: number;
	damage: number;
	/** Human readable cause of death. */
	cause: string;
	causeKind: CauseKind;
	weapon: HudWeapon;
	/** The items of the run with their counters. */
	items: readonly HudItem[];
	/** Seconds spent fighting (rounds and boss fights). */
	seconds: number;
	/** Damage dealt per source; a source that dealt none is left out. */
	sources: readonly { id: string; label: string; damage: number }[];
	/** Souls earned this run. */
	souls: number;
	/** Souls in the account after this run. */
	totalSouls: number;
	record: number;
	newRecord: boolean;
	seed: number;
	/** The cheapest Ossuary node still open, or null when none is. */
	nextUnlock: { name: string; cost: number } | null;
}

export interface ResultsProps {
	view: ResultsViewModel;
	onRestart: () => void;
	/** Opens the Ossuary so the souls just earned can be spent before the next run. */
	onOssuary?: (() => void) | undefined;
	/** Back to the title menu; asks first. */
	onMenu?: (() => void) | undefined;
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

/** Stand-in for a killer portrait: the enemies have no icon in the atlas yet. */
const CAUSE_GLYPH: Readonly<Record<CauseKind, string>> = {
	enemy: "☠",
	elite: "☠",
	boss: "♛",
	shot: "➤",
	self: "✹",
	none: "?",
};
const CAUSE_TIER: Readonly<Record<CauseKind, number>> = {
	enemy: 1,
	elite: 3,
	boss: 5,
	shot: 1,
	self: 1,
	none: 1,
};

const clock = (seconds: number): string =>
	`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function Stat({
	label,
	testId,
	short,
	children,
}: {
	label: string;
	testId: string;
	short: boolean;
	children: string | number;
}): JSX.Element {
	return (
		<div
			className={`flex border-2 border-iron-dark bg-night-2 px-2 py-0.5 ${short ? "items-baseline gap-1" : "flex-col"}`}
		>
			<dt className="font-body text-bone-dark text-xs">{label}</dt>
			<dd className="font-display text-bone text-lg" data-testid={testId}>
				{children}
			</dd>
		</div>
	);
}

export function Results({ view, onRestart, onOssuary, onMenu }: ResultsProps): JSX.Element {
	const souls = useCountUp(view.souls);
	const short = useShortScreen();
	const [leaving, setLeaving] = useState(false);
	useEffect(() => {
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === "Enter" && !leaving) onRestart();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onRestart, leaving]);

	const nav = useDialogNav<HTMLDivElement>({ onCancel: leaving ? () => setLeaving(false) : undefined });
	const top = Math.max(1, ...view.sources.map((source) => source.damage));
	const unlock = view.nextUnlock;
	const unlockPct = unlock ? Math.min(100, (view.totalSouls / Math.max(1, unlock.cost)) * 100) : 0;
	const unlockLabel = unlock
		? t("results.unlockProgress", { souls: view.totalSouls, cost: unlock.cost })
		: "";
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="results-title"
			className="pointer-events-auto absolute inset-0 z-20 flex overflow-y-auto bg-night/85 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-4xl">
				<Panel title={t("results.panel")} riveted>
					<h1 id="results-title" className="sr-only">
						{t("results.title")}
					</h1>
					{leaving && onMenu ? (
						<LeaveConfirm
							question={t("leave.toMenuOver")}
							stayLabel={t("leave.stay")}
							leaveLabel={t("leave.toMenu")}
							onStay={() => setLeaving(false)}
							onLeave={onMenu}
						/>
					) : (
						<div className={`flex flex-col ${short ? "gap-2" : "gap-4"}`}>
							<dl
								className={`grid gap-2 ${short ? "grid-cols-5" : "grid-cols-3 mobile-l:grid-cols-5"}`}
							>
								<Stat short={short} label={t("results.round")} testId="results-round">
									{view.round}
								</Stat>
								<Stat short={short} label={t("results.time")} testId="results-time">
									{clock(view.seconds)}
								</Stat>
								<Stat short={short} label={t("results.kills")} testId="results-kills">
									{view.kills}
								</Stat>
								<Stat short={short} label={t("results.record")} testId="results-record">
									{`${view.record}${view.newRecord ? t("results.newRecord") : ""}`}
								</Stat>
								<Stat short={short} label={t("results.seed")} testId="results-seed">
									{view.seed}
								</Stat>
							</dl>
							<div
								className={`grid gap-3 ${short ? "grid-cols-2 gap-2" : "grid-cols-1 mobile-l:grid-cols-2"}`}
							>
								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-3 border-2 border-iron-dark bg-night-2 p-2">
										<div
											aria-hidden="true"
											data-testid="results-cause-icon"
											className={`flex size-12 shrink-0 items-center justify-center border-2 bg-night font-display text-2xl text-blood-light ${TIER_BORDER[CAUSE_TIER[view.causeKind]] ?? "border-iron-dark"}`}
										>
											{CAUSE_GLYPH[view.causeKind]}
										</div>
										<div className="min-w-0">
											<div className="font-body text-bone-dark text-xs">
												{t("results.killedBy")}
											</div>
											<div
												className="truncate font-display text-bone text-lg"
												data-testid="results-cause"
											>
												{view.cause}
											</div>
										</div>
									</div>
									<div
										data-testid="results-build"
										className="border-2 border-iron-dark bg-night-2 p-2"
									>
										<div className="flex items-center gap-2" data-testid="results-weapon">
											<div
												className={`flex size-10 shrink-0 items-center justify-center border-2 bg-night ${TIER_BORDER[view.weapon.tier] ?? "border-iron-dark"}`}
											>
												{view.weapon.icon ? (
													<Icon icon={view.weapon.icon} size={32} />
												) : null}
											</div>
											<span className="font-display text-bone text-sm">
												{t("results.weaponTier", {
													name: view.weapon.name,
													tier: view.weapon.tier,
												})}
											</span>
										</div>
										<ul
											aria-label={t("results.build")}
											className="mt-2 flex flex-wrap gap-1.5"
										>
											{view.items.map((item) => (
												<li
													key={item.id}
													title={item.name}
													className={`relative flex size-9 items-center justify-center border-2 bg-night ${TIER_BORDER[item.tier] ?? "border-iron-dark"}`}
												>
													{item.icon ? <Icon icon={item.icon} size={28} /> : null}
													<span className="sr-only">{item.name}</span>
													{item.count > 1 ? (
														<span className="absolute right-0.5 bottom-0 font-display text-bone text-xs [text-shadow:1px_1px_0_var(--color-night)]">
															{item.count}
														</span>
													) : null}
												</li>
											))}
										</ul>
									</div>
								</div>
								<div className="flex flex-col gap-2">
									<div
										data-testid="results-sources"
										className="border-2 border-iron-dark bg-night-2 p-2"
									>
										<h2 className="mb-1 font-display text-bone text-sm uppercase">
											{t("results.sources")}
										</h2>
										<ul className="flex flex-col gap-1">
											{view.sources.map((source) => (
												<li
													key={source.id}
													data-testid={`results-source-${source.id}`}
													className="grid grid-cols-[5rem_1fr_4rem] items-center gap-2 font-body text-xs"
												>
													<span className="text-bone-dark">{source.label}</span>
													<span className="h-3 border border-iron-dark bg-night">
														<span
															className="block h-full bg-ember"
															style={{
																width: `${(source.damage / top) * 100}%`,
															}}
														/>
													</span>
													<span className="text-right text-bone">
														{source.damage}
													</span>
												</li>
											))}
										</ul>
										<div className="mt-1 flex justify-between border-iron-dark border-t-2 pt-1 font-body text-xs">
											<span className="text-bone-dark">{t("results.damage")}</span>
											<span data-testid="results-damage" className="text-bone">
												{view.damage}
											</span>
										</div>
									</div>
									<div
										className="border-2 border-ember bg-night-2 p-2"
										data-testid="results-souls-block"
									>
										<p className="font-display text-3xl text-ember-light">
											<span className="text-base">{t("results.souls")} </span>
											<span data-testid="results-souls">{souls}</span>
											<span className="ml-2 font-body text-bone-dark text-sm">
												{t("results.totalSouls", { total: view.totalSouls })}
											</span>
										</p>
										{unlock ? (
											<div
												data-testid="results-unlock"
												className="mt-1 font-body text-xs"
											>
												<div className="text-bone">
													{view.totalSouls >= unlock.cost
														? t("results.unlockReady", { name: unlock.name })
														: t("results.nextUnlock", { name: unlock.name })}
												</div>
												<div
													role="img"
													aria-label={unlockLabel}
													className="relative mt-1 h-4 border-2 border-iron-dark bg-night"
												>
													<div
														className="h-full bg-ember/60"
														style={{ width: `${unlockPct}%` }}
													/>
													<span className="absolute inset-0 flex items-center px-1 text-bone">
														{unlockLabel}
													</span>
												</div>
											</div>
										) : null}
									</div>
								</div>
							</div>
							<div className="grid auto-cols-fr grid-flow-col items-end gap-3 [&>button]:w-full">
								{onOssuary ? (
									<Button size="lg" onClick={onOssuary}>
										{t("results.ossuary")}
									</Button>
								) : null}
								<Button size="lg" variant="primary" onClick={onRestart}>
									{t("results.restart")}
								</Button>
								{onMenu ? (
									<Button size="lg" testId="results-menu" onClick={() => setLeaving(true)}>
										{t("menu.toMenu")}
									</Button>
								) : null}
							</div>
						</div>
					)}
				</Panel>
			</div>
		</div>
	);
}
