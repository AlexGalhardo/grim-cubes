import { t } from "@gc/core";
import type { JSX, ReactNode } from "react";
import type { HudState } from "../../App";
import { Bar } from "../Bar/Bar";
import { BossBar } from "../BossBar/BossBar";
import { Icon } from "../Icon/Icon";
import type { HudItem, HudWeapon, SynergyView } from "./hudTypes";

/** Items drawn in the strip before the "+N" chip. */
export const MAX_VISIBLE_ITEMS = 10;
export const WEAPON_PIPS = 4;
/** The timer turns blood-light and pulses for the last seconds of a round. */
export const URGENT_SECONDS = 5;

export type HudView = Pick<
	HudState,
	| "hp"
	| "maxHp"
	| "round"
	| "level"
	| "xp"
	| "xpNeeded"
	| "gold"
	| "secondsLeft"
	| "souls"
	| "kills"
	| "weapon"
	| "items"
	| "boss"
	| "speed"
> & { synergies?: readonly SynergyView[] | undefined };

export interface HudProps {
	hud: HudView;
	/** A touch device: compact clusters, the weapon sits beside the vitals and the item strip is left out. */
	touch?: boolean | undefined;
	/** The corner buttons are hidden while a dialog is open. */
	showButtons?: boolean | undefined;
	onPause?: (() => void) | undefined;
	onCycleSpeed?: (() => void) | undefined;
	onOpenOptions?: (() => void) | undefined;
}

const PLATE = "border-2 border-iron-dark bg-night/65";
const BUTTON =
	"pointer-events-auto flex size-12 items-center justify-center border-2 bg-night-2 font-display text-lg focus-visible:outline-2 focus-visible:outline-ember hover:border-ember hover:text-ember-light desktop:size-10 pointer-coarse:size-12";
const TIER_BORDER: Readonly<Record<number, string>> = {
	1: "border-rarity-1",
	2: "border-rarity-2",
	3: "border-rarity-3",
	4: "border-rarity-4",
	5: "border-rarity-5",
};

/** `m:ss`, the way the round timer reads. */
export function formatClock(seconds: number): string {
	const whole = Math.max(0, Math.floor(seconds));
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function Stat({
	testId,
	glyph,
	label,
	value,
	className,
}: {
	testId: string;
	glyph: string;
	label: string;
	value: number;
	className: string;
}): JSX.Element {
	return (
		<span data-testid={testId} className={`flex items-center gap-1 ${className}`}>
			<span aria-hidden="true">{glyph}</span>
			<span className="sr-only">{label}</span>
			{value}
		</span>
	);
}

function Vitals({ hud }: { hud: HudView }): JSX.Element {
	return (
		<div data-testid="hud-vitals" className={`${PLATE} flex items-start gap-2 p-1`}>
			<div className="relative shrink-0">
				<div
					aria-hidden="true"
					data-testid="hud-portrait"
					className="size-10 border-2 border-rust bg-night bg-[url(/portraits/hero.webp)] bg-cover desktop:size-16"
				/>
				<span
					data-testid="hud-level"
					title={t("hud.level", { level: hud.level })}
					className="absolute -right-1 -bottom-1 min-w-5 border-2 border-iron-dark bg-night px-1 text-center font-display text-xs leading-4 text-ember-light"
				>
					<span className="sr-only">{t("hud.level", { level: hud.level })}</span>
					<span aria-hidden="true">{hud.level}</span>
				</span>
			</div>
			<div className="flex w-40 flex-col gap-1 desktop:w-70">
				<div data-testid="hud-hp">
					<Bar
						value={hud.hp}
						max={hud.maxHp}
						label={t("hud.hp")}
						heightClass="h-4 desktop:h-[22px]"
					/>
				</div>
				<div data-testid="hud-xp">
					<Bar
						value={hud.xp}
						max={hud.xpNeeded}
						variant="xp"
						label={t("hud.xp")}
						thin
						heightClass="h-1.5 desktop:h-2.5"
					/>
				</div>
			</div>
		</div>
	);
}

/** The round plate and the timer only exist during a timed round: between rounds a lone "ROUND n" over an empty timer row says nothing. */
function Clock({ hud }: { hud: HudView }): JSX.Element | null {
	if (hud.secondsLeft <= 0) return null;
	const urgent = hud.secondsLeft <= URGENT_SECONDS;
	return (
		<div className={`${PLATE} flex flex-col items-center px-3 py-1`}>
			<div
				data-testid="hud-round"
				className="font-display text-xs text-bone-dark uppercase desktop:text-sm"
			>
				{t("hud.round", { round: hud.round })}
			</div>
			<div
				data-testid="hud-timer"
				role="timer"
				aria-label={t("hud.timer")}
				data-urgent={urgent}
				className={`font-display text-2xl leading-none desktop:text-[40px] ${urgent ? "animate-low text-blood-light" : ""}`}
			>
				{formatClock(hud.secondsLeft)}
			</div>
		</div>
	);
}

function Wallet({ hud }: { hud: HudView }): JSX.Element {
	return (
		<div data-testid="hud-wallet" className={`${PLATE} flex items-center gap-3 px-2 py-1`}>
			<Stat
				testId="hud-gold"
				glyph="●"
				label={t("hud.gold")}
				value={hud.gold}
				className="text-xl text-currency desktop:text-2xl"
			/>
			<Stat
				testId="hud-souls"
				glyph="☠"
				label={t("hud.souls")}
				value={hud.souls}
				className="text-xl text-bone desktop:text-2xl"
			/>
			<Stat
				testId="hud-kills"
				glyph="✕"
				label={t("hud.kills")}
				value={hud.kills}
				className="hidden text-sm text-bone-dark desktop:flex"
			/>
		</div>
	);
}

function Buttons({
	hud,
	onPause,
	onCycleSpeed,
	onOpenOptions,
}: Pick<HudProps, "onPause" | "onCycleSpeed" | "onOpenOptions"> & { hud: HudView }): JSX.Element {
	return (
		<div className="flex gap-1" data-testid="hud-corner">
			{onPause ? (
				<button
					type="button"
					data-testid="pause-open"
					aria-label={t("pause.open")}
					onClick={onPause}
					className={`${BUTTON} border-iron-dark text-bone`}
				>
					‖
				</button>
			) : null}
			{onCycleSpeed ? (
				<button
					type="button"
					data-testid="speed-toggle"
					aria-label={t("hud.speed", { speed: hud.speed })}
					onClick={onCycleSpeed}
					className={`${BUTTON} text-sm ${hud.speed === 1 ? "border-iron-dark text-bone-dark opacity-70" : "border-ember text-ember-light"}`}
				>
					{hud.speed}x
				</button>
			) : null}
			{onOpenOptions ? (
				<button
					type="button"
					data-testid="options-open"
					aria-label={t("options.open")}
					title={t("options.open")}
					onClick={onOpenOptions}
					className={`${BUTTON} border-iron-dark text-bone`}
				>
					⚙
				</button>
			) : null}
		</div>
	);
}

function WeaponSlot({ weapon, touch }: { weapon: HudWeapon; touch: boolean }): JSX.Element {
	return (
		<div
			data-testid="hud-weapon"
			role="img"
			aria-label={t("hud.weapon", { name: weapon.name, tier: weapon.tier })}
			className={`${PLATE} flex shrink-0 flex-col items-center gap-1 p-1`}
		>
			<div
				aria-hidden="true"
				className={`flex items-center justify-center border-2 bg-night font-display text-ember-light ${TIER_BORDER[weapon.tier] ?? "border-iron-dark"} ${touch ? "size-10 text-xl" : "size-14 text-3xl"}`}
			>
				{weapon.icon ? <Icon icon={weapon.icon} size={touch ? 32 : 48} /> : "⚔"}
			</div>
			<div aria-hidden="true" className="flex gap-1">
				{Array.from({ length: WEAPON_PIPS }, (_, i) => (
					<span
						key={i}
						data-lit={i < weapon.tier}
						className={`size-1.5 ${i < weapon.tier ? "bg-ember-light" : "bg-iron-dark"}`}
					/>
				))}
			</div>
		</div>
	);
}

function ItemStrip({ items }: { items: readonly HudItem[] }): JSX.Element | null {
	if (items.length === 0) return null;
	const shown = items.slice(0, MAX_VISIBLE_ITEMS);
	const more = items.length - shown.length;
	return (
		<ul
			data-testid="hud-items"
			aria-label={t("hud.items")}
			className={`${PLATE} flex items-center gap-1 p-1`}
		>
			{shown.map((item) => (
				<li
					key={item.id}
					title={item.name}
					className={`relative flex size-9 items-center justify-center border-2 bg-night-2 ${TIER_BORDER[item.tier] ?? "border-iron-dark"}`}
				>
					{item.icon ? <Icon icon={item.icon} size={32} /> : null}
					<span className="sr-only">
						{item.count > 1
							? t("hud.itemCount", { name: item.name, count: item.count })
							: item.name}
					</span>
					{item.count > 1 ? (
						<span
							aria-hidden="true"
							data-testid="hud-item-count"
							className="absolute right-0 bottom-0 bg-night/80 px-0.5 font-display text-xs leading-3 text-bone"
						>
							{item.count}
						</span>
					) : null}
				</li>
			))}
			{more > 0 ? (
				<li
					data-testid="hud-items-more"
					className="flex h-9 min-w-9 items-center justify-center border-2 border-iron-dark bg-night-2 px-1 font-display text-sm text-bone-dark"
				>
					<span aria-hidden="true">+{more}</span>
					<span className="sr-only">{t("hud.itemsMore", { count: more })}</span>
				</li>
			) : null}
		</ul>
	);
}

/** The tags the hero has items of, as `Ferro 2/4`; lit once a tier is active. Only on screens with room (not touch). */
function SynergyStrip({ synergies }: { synergies: readonly SynergyView[] }): JSX.Element | null {
	if (synergies.length === 0) return null;
	return (
		<ul
			data-testid="hud-synergies"
			aria-label={t("hud.synergies")}
			className={`${PLATE} flex flex-wrap items-center gap-1 p-1`}
		>
			{synergies.map((s) => (
				<li
					key={s.id}
					data-reached={s.reached}
					className={`border-2 bg-night-2 px-1 font-display text-xs leading-4 ${s.reached > 0 ? "border-ember text-ember-light" : "border-iron-dark text-bone-dark"}`}
				>
					<span className="sr-only">
						{t("hud.synergy", { name: s.name, count: s.count, tiers: s.reached })}
					</span>
					<span aria-hidden="true">
						{s.name} {s.count}
						{s.nextAt === null ? "" : `/${s.nextAt}`}
					</span>
				</li>
			))}
		</ul>
	);
}

/**
 * The in-run HUD in four corners (GDD 21.2, Art Bible 16): vitals top-left, round and timer top-centre (the boss bar
 * takes that place in a boss fight), wallet and buttons top-right, weapon and items bottom-left. On touch the weapon
 * moves beside the vitals and the strip is dropped: the joystick owns the bottom-left. The grid keeps every cluster
 * out of the middle of the screen, where the hero and the ring around it are.
 */
export function Hud({
	hud,
	touch = false,
	showButtons = true,
	onPause,
	onCycleSpeed,
	onOpenOptions,
}: HudProps): JSX.Element {
	const buttons: ReactNode =
		showButtons && (onPause || onCycleSpeed || onOpenOptions) ? (
			<Buttons hud={hud} onPause={onPause} onCycleSpeed={onCycleSpeed} onOpenOptions={onOpenOptions} />
		) : null;
	return (
		<div
			className={`pointer-events-none absolute inset-0 grid ${touch && hud.boss ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[1fr_auto_1fr]"} grid-rows-[auto_1fr_auto] gap-x-2 pt-[max(12px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))] desktop:p-6`}
		>
			<div className="col-start-1 row-start-1 flex items-start gap-2 justify-self-start">
				<Vitals hud={hud} />
				{touch ? (
					<div data-testid="hud-loadout">
						<WeaponSlot weapon={hud.weapon} touch />
					</div>
				) : null}
			</div>
			<div className="col-start-2 row-start-1 justify-self-center">
				{hud.boss ? <BossBar boss={hud.boss} /> : <Clock hud={hud} />}
			</div>
			<div className="col-start-3 row-start-1 flex flex-col items-end gap-1 justify-self-end">
				<Wallet hud={hud} />
				{buttons}
			</div>
			{touch ? null : (
				<div
					data-testid="hud-loadout"
					className="col-start-1 row-start-3 flex items-end gap-2 justify-self-start"
				>
					<WeaponSlot weapon={hud.weapon} touch={false} />
					<div className="flex min-w-0 flex-col items-start gap-1">
						<SynergyStrip synergies={hud.synergies ?? []} />
						<ItemStrip items={hud.items} />
					</div>
				</div>
			)}
		</div>
	);
}
