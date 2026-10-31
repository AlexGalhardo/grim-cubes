import { t } from "@gc/core";
import { type JSX, type ReactNode, useEffect, useState } from "react";
import { useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Icon, type IconRef } from "../Icon/Icon";

export interface ShopSlotView {
	kind: "item" | "weapon" | "upgrade";
	id: string;
	name: string;
	lines: readonly string[];
	price: number;
	tier: number;
	locked: boolean;
	sold: boolean;
	affordable: boolean;
	/** Item icon from the atlas; weapons and upgrades keep the text label. */
	icon?: IconRef | undefined;
	/** Stat line id -> value after buying this offer, shown as `now → after` while the offer is hovered or focused. */
	preview?: Readonly<Record<string, string>> | undefined;
}

export interface ShopViewModel {
	slots: readonly ShopSlotView[];
	rerollPrice: number;
	gold: number;
	hero?: ShopHeroView | undefined;
	weapon?: ShopWeaponView | undefined;
	items?: readonly OwnedItemView[] | undefined;
	/** One Merchant line under its name. */
	quote?: string | undefined;
}

export interface StatLineView {
	label: string;
	value: string;
	/** Matches the keys of `ShopSlotView.preview`. */
	id?: string | undefined;
}

/** The hero header of the shop: level, XP, HP and the run counters. */
export interface ShopHeroView {
	level: number;
	xp: number;
	xpNeeded: number;
	hp: number;
	maxHp: number;
	round: number;
	/** The next boss round, shown as `round / boss`. */
	bossRound: number;
	souls: number;
}

export interface ShopWeaponView {
	name: string;
	/** 1-5, the rarity colour of the weapon tier. */
	tier: number;
	lines: readonly string[];
}

export interface OwnedItemView {
	id: string;
	name: string;
	tier: number;
	count: number;
	icon?: IconRef | undefined;
}

export interface ShopActions {
	buy(index: number): void;
	toggleLock(index: number): void;
	reroll(): void;
	next(): void;
}

export interface ShopProps {
	view: ShopViewModel;
	stats: readonly StatLineView[];
	actions: ShopActions;
	/** `KeyboardEvent.code` of the reroll key (Options remap); defaults to R. */
	rerollKey?: string | undefined;
	/** The key or button to show on the reroll button ("R", or "X" when the last input was the pad). */
	rerollHint?: string | undefined;
	/** Gamepad button of the reroll (standard mapping index). */
	rerollButton?: number | undefined;
}

/** The items grid shows two rows of 8 even when the hero owns fewer, like an inventory. */
const EMPTY_ITEM_SLOTS = 16;
/** Same threshold as the `desktop` breakpoint of theme.css, where the offer icons grow. */
const DESKTOP_QUERY = "(min-width: 1024px)";
const isDesktopWidth = (): boolean =>
	typeof window.matchMedia !== "function" || window.matchMedia(DESKTOP_QUERY).matches;

const TIER_BORDER: Readonly<Record<number, string>> = {
	1: "border-rarity-1",
	2: "border-rarity-2",
	3: "border-rarity-3",
	4: "border-rarity-4",
	5: "border-rarity-5",
};
const TIER_TEXT: Readonly<Record<number, string>> = {
	1: "text-rarity-1",
	2: "text-rarity-2",
	3: "text-rarity-3",
	4: "text-rarity-4",
	5: "text-rarity-5",
};
const kindLabel = (kind: ShopSlotView["kind"]): string =>
	kind === "weapon"
		? t("shop.kindWeapon")
		: kind === "upgrade"
			? t("shop.kindUpgrade")
			: t("shop.kindItem");

/** A riveted iron plate, the frame of every block of the shop. */
const PLATE =
	"panel-riveted border-2 border-iron-dark bg-linear-to-b from-iron-black to-night-2 shadow-[inset_0_1px_0_var(--color-iron),0_4px_10px_var(--color-night)]";
/** A raised button: lighter top edge, a dark base under it that disappears while pressed. */
const RAISED =
	"border-2 font-display transition-[translate,box-shadow,color] duration-fast active:translate-y-1 active:shadow-none focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 disabled:opacity-50 disabled:active:translate-y-0 pointer-coarse:min-h-12";
const EMBER_BUTTON = `${RAISED} border-ember-light bg-linear-to-b from-ember to-rust text-night shadow-[0_4px_0_var(--color-mud)] hover:from-ember-light`;
const IRON_BUTTON = `${RAISED} border-iron bg-linear-to-b from-iron to-iron-dark text-bone shadow-[0_4px_0_var(--color-night)] hover:border-iron-light`;

function Bar({
	value,
	max,
	className,
	label,
}: {
	value: number;
	max: number;
	className: string;
	label: string;
}) {
	const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
	return (
		<div className="relative h-5 border-2 border-iron-dark bg-night" role="img" aria-label={label}>
			<div className={`h-full ${className}`} style={{ width: `${pct}%` }} />
			<span className="absolute inset-0 flex items-center px-1.5 font-body text-xs text-bone">
				{label}
			</span>
		</div>
	);
}

function Counter({ icon, children, testId }: { icon: string; children: ReactNode; testId?: string }) {
	return (
		<div
			className="flex items-center gap-2 border-2 border-iron-dark bg-night-2 px-2 py-1 font-body text-sm text-bone"
			data-testid={testId}
		>
			<span aria-hidden="true" className="text-ember-light">
				{icon}
			</span>
			{children}
		</div>
	);
}

/** Between-rounds shop (GDD 17): hero, weapon, items and stats on the left; the Merchant and 4 offers on the right. Keys 1-4 buy, R rerolls, Enter continues. */
export function Shop({
	view,
	stats,
	actions,
	rerollKey = "KeyR",
	rerollHint = "R",
	rerollButton,
}: ShopProps): JSX.Element {
	useEffect(() => {
		const onKey = (e: KeyboardEvent): void => {
			const index = Number(e.key) - 1;
			if (Number.isInteger(index) && index >= 0 && index < view.slots.length) actions.buy(index);
			else if (e.code === rerollKey) actions.reroll();
			else if (e.key === "Enter") actions.next();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [view.slots.length, actions, rerollKey]);

	const { hero, weapon, items = [], quote } = view;
	const nav = useDialogNav<HTMLDivElement>({ onReroll: actions.reroll, rerollButton });
	const short = useShortScreen();
	const desktopWide = isDesktopWidth();
	const [hovered, setHovered] = useState<number | null>(null);
	const preview = hovered === null ? undefined : view.slots[hovered]?.preview;
	const half = Math.ceil(stats.length / 2);
	const columns = [stats.slice(0, half), stats.slice(half)];

	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="shop-title"
			className={`pointer-events-auto absolute inset-0 z-20 flex overflow-y-auto bg-night/85 ${short ? "p-1" : "p-2 mobile-l:p-4"}`}
		>
			<h1 id="shop-title" className="sr-only">
				{t("shop.title")}
			</h1>
			<div
				className={`m-auto grid w-full max-w-[1760px] grid-cols-1 mobile-l:grid-cols-[46fr_54fr] ${short ? "gap-1" : "gap-2 desktop:gap-4"}`}
			>
				{/* Left: the hero, the weapon in hand, the items owned and the full stats. */}
				<section className={`${PLATE} flex flex-col ${short ? "gap-1 p-1.5" : "gap-3 p-3"}`}>
					{hero ? (
						<div className="flex gap-3" data-testid="shop-hero">
							<div
								aria-hidden="true"
								className={`hidden shrink-0 border-2 border-rust bg-night bg-[url(/portraits/hero.webp)] bg-cover mobile-l:block ${short ? "size-14" : "size-24 desktop:size-28"}`}
							/>
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<div
									className={`font-display text-bone uppercase ${short ? "text-base" : "text-2xl"}`}
								>
									{t("shop.hero")}
								</div>
								<div className="font-body text-sm text-bone-dark">
									{t("shop.level", { level: hero.level })}
								</div>
								<Bar
									value={hero.xp}
									max={hero.xpNeeded}
									className="bg-linear-to-b from-ember-light to-ember"
									label={t("shop.xp", { xp: hero.xp, needed: hero.xpNeeded })}
								/>
								<Bar
									value={hero.hp}
									max={hero.maxHp}
									className="bg-linear-to-b from-blood-light to-blood"
									label={`${hero.hp} / ${hero.maxHp}`}
								/>
							</div>
							<div className="flex shrink-0 flex-col gap-1">
								<Counter icon="⚑">
									{t("shop.round", { round: hero.round, boss: hero.bossRound })}
								</Counter>
								<Counter icon="●">{t("shop.goldLabel", { gold: view.gold })}</Counter>
								<Counter icon="☠">{t("shop.souls", { souls: hero.souls })}</Counter>
							</div>
						</div>
					) : null}
					{weapon ? (
						<div className={`${PLATE} flex items-center gap-3 p-2`} data-testid="shop-weapon">
							<div
								aria-hidden="true"
								className={`flex shrink-0 items-center justify-center border-2 bg-night font-display text-ember-light ${TIER_BORDER[weapon.tier] ?? "border-iron-dark"} ${short ? "size-10 text-xl" : "size-16 text-3xl"}`}
							>
								⚔
							</div>
							<div className="min-w-0">
								<div
									className={`font-display text-bone uppercase ${short ? "text-sm" : "text-lg"}`}
								>
									{weapon.name}
								</div>
								<div
									className={`font-display text-xs uppercase ${TIER_TEXT[weapon.tier] ?? "text-bone-dark"}`}
								>
									{t(`rarity.${weapon.tier}`)} · {t("shop.kindWeapon")}
								</div>
								<ul className="font-body text-sm text-heal">
									{weapon.lines.map((line) => (
										<li key={line}>{line}</li>
									))}
								</ul>
							</div>
						</div>
					) : null}
					{hero ? (
						<div data-testid="shop-items">
							<h2 className="mb-1 font-display text-base text-bone uppercase">
								{t("shop.items")}
							</h2>
							<ul className="grid grid-cols-8 gap-1.5">
								{items.map((item) => (
									<li
										key={item.id}
										title={item.name}
										className={`relative flex aspect-square items-center justify-center border-2 bg-night-2 ${TIER_BORDER[item.tier] ?? "border-iron-dark"}`}
									>
										{item.icon ? (
											<Icon icon={item.icon} />
										) : (
											<span className="sr-only">{item.name}</span>
										)}
										<span className="sr-only">{item.name}</span>
										{item.count > 1 ? (
											<span className="absolute right-0.5 bottom-0 font-display text-xs text-bone [text-shadow:1px_1px_0_var(--color-night)]">
												{item.count}
											</span>
										) : null}
									</li>
								))}
								{Array.from(
									{ length: Math.max(0, EMPTY_ITEM_SLOTS - items.length) },
									(_, i) => (
										<li
											key={`empty-${i}`}
											aria-hidden="true"
											className="aspect-square border-2 border-iron-dark bg-night/60"
										/>
									),
								)}
							</ul>
						</div>
					) : null}
					<div data-testid="shop-side" className={`${PLATE} flex-1 ${short ? "p-1.5" : "p-3"}`}>
						<h2 className="mb-2 font-display text-base text-bone uppercase">{t("shop.stats")}</h2>
						<div className="grid grid-cols-1 gap-x-4 mobile-l:grid-cols-2">
							{columns.map((column, c) => (
								<dl
									key={c === 0 ? "left" : "right"}
									className={`font-body text-sm desktop:text-base ${c === 1 ? "mobile-l:border-iron-dark mobile-l:border-l-2 mobile-l:pl-4" : ""}`}
								>
									{column.map((line) => {
										const after = line.id ? preview?.[line.id] : undefined;
										return (
											<div
												key={line.label}
												data-testid={after ? "stat-preview" : undefined}
												className={`flex justify-between gap-2 border-iron-dark border-b py-0.5 desktop:py-1 ${after ? "-mx-1 border-2 border-ember bg-iron-black px-1" : ""}`}
											>
												<dt className="text-bone">{line.label}</dt>
												<dd
													className={
														line.value.startsWith("-") ||
														line.value.startsWith("−")
															? "text-danger"
															: "text-heal"
													}
												>
													{after ? `${line.value} → ${after}` : line.value}
												</dd>
											</div>
										);
									})}
								</dl>
							))}
						</div>
					</div>
				</section>

				{/* Right: the Merchant, its four offers in two columns, then reroll, gold and next round. */}
				<section
					className={`${PLATE} order-first flex flex-col mobile-l:order-none ${short ? "gap-1 p-1.5" : "gap-3 p-3"}`}
				>
					<div className="flex gap-3">
						<div
							aria-hidden="true"
							data-testid="shop-portrait"
							className={`hidden shrink-0 border-2 border-rust bg-night bg-[url(/portraits/merchant.webp)] bg-cover mobile-l:block ${short ? "size-14" : "size-24 desktop:size-28"}`}
						/>
						<div className="min-w-0">
							<h2
								className={`font-display text-bone uppercase ${short ? "text-base" : "text-2xl"}`}
							>
								{t("shop.panel")}
							</h2>
							{quote && !short ? (
								<p className="mt-1 border-iron-dark border-t-2 pt-1 font-body text-base text-bone italic">
									“{quote}”
								</p>
							) : null}
						</div>
					</div>
					<div
						data-testid="shop-grid"
						className={`grid ${short ? "grid-cols-2 gap-1" : "grid-cols-1 gap-2 mobile-l:grid-cols-2 desktop:gap-3"}`}
					>
						{view.slots.map((slot, i) => (
							<fieldset
								key={`${slot.kind}-${slot.id}-${i}`}
								data-testid={`shop-slot-${i}`}
								aria-label={slot.name}
								onMouseEnter={() => setHovered(i)}
								onMouseLeave={() => setHovered(null)}
								onFocus={() => setHovered(i)}
								onBlur={() => setHovered(null)}
								className={`panel-riveted m-0 flex min-w-0 flex-col border-2 bg-linear-to-b from-iron-black to-night-2 ${short ? "gap-1 p-1.5" : "gap-2 p-3 desktop:gap-4 desktop:p-4 desktop:min-h-56"} ${TIER_BORDER[slot.tier] ?? "border-iron-dark"} ${slot.sold ? "opacity-40" : ""}`}
							>
								<div className="flex gap-3">
									<div
										className={`flex shrink-0 items-center justify-center border-2 bg-night ${TIER_BORDER[slot.tier] ?? "border-iron-dark"} ${short ? "size-10" : "size-16 desktop:size-20"}`}
									>
										{slot.icon ? (
											<Icon
												icon={slot.icon}
												size={short ? 32 : desktopWide ? 64 : 48}
											/>
										) : (
											<span
												aria-hidden="true"
												className="font-display text-2xl text-ember-light"
											>
												⚔
											</span>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div
											className={`font-display text-bone ${short ? "text-sm" : "text-lg desktop:text-xl"}`}
										>
											{slot.name}
										</div>
										<div
											className={`font-display text-xs uppercase ${TIER_TEXT[slot.tier] ?? "text-bone-dark"}`}
										>
											<span
												className="rarity-mark"
												data-tier={slot.tier}
												data-testid={`rarity-mark-${i}`}
												aria-hidden="true"
											/>
											{t(`rarity.${slot.tier}`)} · {kindLabel(slot.kind)}
										</div>
										<ul
											className={`mt-1 font-body text-bone-dark ${short ? "hidden" : "text-sm desktop:text-base"}`}
										>
											{slot.lines.map((line) => (
												<li key={line}>{line}</li>
											))}
										</ul>
									</div>
								</div>
								<div className="mt-auto flex items-center gap-2">
									<span
										className={`flex min-w-14 items-center gap-1 font-display ${short ? "text-sm" : "text-lg"} ${slot.affordable ? "text-currency" : "text-danger"}`}
									>
										<span aria-hidden="true">●</span>
										{slot.price}
									</span>
									<button
										type="button"
										data-testid={`shop-buy-${i}`}
										disabled={slot.sold}
										aria-label={
											slot.sold
												? undefined
												: `${t("shop.buy")} ${slot.name} (${slot.price})`
										}
										onClick={() => actions.buy(i)}
										className={`h-9 flex-1 px-2 text-base desktop:h-11 desktop:text-lg ${slot.affordable ? EMBER_BUTTON : IRON_BUTTON}`}
									>
										{slot.sold ? t("shop.sold") : t("shop.buy")}
									</button>
									<button
										type="button"
										data-testid={`shop-lock-${i}`}
										disabled={slot.sold}
										aria-pressed={slot.locked}
										aria-label={slot.locked ? t("shop.unlock") : t("shop.lock")}
										onClick={() => actions.toggleLock(i)}
										className={`flex h-9 items-center gap-1 px-2 text-sm desktop:h-11 desktop:px-3 ${IRON_BUTTON} ${slot.locked ? "border-ember text-ember-light" : ""}`}
									>
										<span aria-hidden="true">{slot.locked ? "■" : "□"}</span>
										<span className={short ? "sr-only" : ""}>{t("shop.lock")}</span>
									</button>
								</div>
							</fieldset>
						))}
					</div>
					<div
						className={`${PLATE} mt-auto flex flex-wrap items-center gap-2 ${short ? "p-1" : "p-2 desktop:gap-4"}`}
					>
						<button
							type="button"
							onClick={actions.reroll}
							disabled={view.gold < view.rerollPrice}
							className={`h-11 px-3 text-base ${IRON_BUTTON}`}
						>
							<span aria-hidden="true">⟳ </span>
							{t("shop.reroll", { price: view.rerollPrice, key: rerollHint })}
						</button>
						<div
							className="flex items-center gap-1 border-iron-dark px-2 font-display text-base text-currency mobile-l:border-x-2"
							data-testid="shop-gold"
						>
							<span aria-hidden="true">●</span>
							{t("shop.goldLabel", { gold: view.gold })}
						</div>
						<button
							type="button"
							onClick={actions.next}
							className={`ml-auto h-11 px-4 uppercase ${short ? "text-base" : "text-lg"} ${EMBER_BUTTON}`}
						>
							<span aria-hidden="true">» </span>
							{t("shop.next")}
						</button>
					</div>
				</section>
			</div>
		</div>
	);
}
