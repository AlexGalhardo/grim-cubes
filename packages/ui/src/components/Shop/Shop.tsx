import { t } from "@gc/core";
import { type JSX, type ReactNode, useEffect, useState } from "react";
import { isDesktopWidth, useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import type { SynergyView } from "../Hud/hudTypes";
import { Icon, type IconRef } from "../Icon/Icon";
import { type StatLineView, StatList, type StatPreview } from "../StatList/StatList";
import { PLATE, TIER_BORDER, TIER_TEXT } from "../styles";

/** One tag of an item offer and what buying it does to that tag. */
export interface SlotTagView {
	id: string;
	name: string;
	/** Distinct owned items with the tag after the purchase. */
	after: number;
	/** Count of the next tier after the purchase; null when every tier is active. */
	nextAt: number | null;
	/** The purchase reaches a tier of this tag. */
	activates: boolean;
}

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
	/** Icon from the atlas: the item, or the weapon of a weapon or upgrade offer. */
	icon?: IconRef | undefined;
	/** Stat line id -> change of buying this offer, shown while the offer is hovered or focused. */
	preview?: Readonly<Record<string, StatPreview>> | undefined;
	/** Tags of an item offer (one or two). */
	tags?: readonly SlotTagView[] | undefined;
}

export interface ShopViewModel {
	slots: readonly ShopSlotView[];
	rerollPrice: number;
	gold: number;
	hero?: ShopHeroView | undefined;
	weapon?: ShopWeaponView | undefined;
	items?: readonly OwnedItemView[] | undefined;
	/** Tags the hero owns items of, with their progress. */
	synergies?: readonly SynergyView[] | undefined;
	/** One Merchant line under its name. */
	quote?: string | undefined;
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
	icon?: IconRef | undefined;
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

const ITEMS_PER_ROW = 8;
const kindLabel = (kind: ShopSlotView["kind"]): string =>
	kind === "weapon"
		? t("shop.kindWeapon")
		: kind === "upgrade"
			? t("shop.kindUpgrade")
			: t("shop.kindItem");

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

function TagChips({ tags, short }: { tags: readonly SlotTagView[]; short: boolean }): JSX.Element {
	return (
		<ul data-testid="shop-tags" className="mt-1 flex flex-wrap gap-1">
			{tags.map((tag) => (
				<li
					key={tag.id}
					data-activates={tag.activates}
					className={`border px-1 font-display ${short ? "text-[10px] leading-3" : "text-xs"} ${tag.activates ? "border-ember text-ember-light" : "border-iron-dark text-bone-dark"}`}
				>
					<span aria-hidden="true">
						{tag.name} {tag.after}
						{tag.nextAt === null ? "" : `/${tag.nextAt}`}
						{tag.activates ? " ▲" : ""}
					</span>
					<span className="sr-only">
						{t(tag.activates ? "shop.tagActivates" : "shop.tag", {
							name: tag.name,
							count: tag.after,
						})}
					</span>
				</li>
			))}
		</ul>
	);
}

function OfferRow({
	slot,
	index,
	short,
	actions,
}: {
	slot: ShopSlotView;
	index: number;
	short: boolean;
	actions: ShopActions;
}): JSX.Element {
	return (
		<div className="mt-auto flex items-center gap-2">
			<span
				className={`flex ${short ? "" : "min-w-14"} items-center gap-1 font-display ${short ? "text-sm" : "text-lg"} ${slot.affordable ? "text-currency" : "text-danger"}`}
			>
				<span aria-hidden="true">●</span>
				{slot.price}
			</span>
			<button
				type="button"
				data-testid={`shop-buy-${index}`}
				disabled={slot.sold}
				aria-label={slot.sold ? undefined : `${t("shop.buy")} ${slot.name} (${slot.price})`}
				onClick={() => actions.buy(index)}
				className={`h-9 min-w-0 flex-1 px-2 text-base desktop:h-11 desktop:text-lg ${slot.affordable ? EMBER_BUTTON : IRON_BUTTON}`}
			>
				{slot.sold ? t("shop.sold") : t("shop.buy")}
			</button>
			<button
				type="button"
				data-testid={`shop-lock-${index}`}
				disabled={slot.sold}
				aria-pressed={slot.locked}
				aria-label={slot.locked ? t("shop.unlock") : t("shop.lock")}
				onClick={() => actions.toggleLock(index)}
				className={`flex h-9 shrink-0 items-center gap-1 px-2 text-sm desktop:h-11 desktop:px-3 ${IRON_BUTTON} ${slot.locked ? "border-ember text-ember-light" : ""}`}
			>
				<span aria-hidden="true">{slot.locked ? "■" : "□"}</span>
				<span className={short ? "sr-only" : ""}>{t("shop.lock")}</span>
			</button>
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
	// The weapon's upgrade offer sits with the weapon; without a weapon panel it stays in the grid.
	const upgradeIndex = weapon ? view.slots.findIndex((slot) => slot.kind === "upgrade") : -1;
	const upgrade = upgradeIndex >= 0 ? view.slots[upgradeIndex] : undefined;
	// Owned items plus one empty row, like an inventory with room to grow; a short screen only completes the row.
	const itemRows = Math.max(1, Math.ceil(items.length / ITEMS_PER_ROW) + (short ? 0 : 1));
	const focusProps = (i: number) => ({
		onMouseEnter: () => setHovered(i),
		onMouseLeave: () => setHovered(null),
		onFocus: () => setHovered(i),
		onBlur: () => setHovered(null),
	});

	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="shop-title"
			className={`pointer-events-auto absolute inset-0 z-20 flex ${short ? "overflow-hidden" : "overflow-y-auto"} bg-night/85 ${short ? "p-1" : "p-2 mobile-l:p-4"}`}
		>
			<h1 id="shop-title" className="sr-only">
				{t("shop.title")}
			</h1>
			<div
				className={`m-auto grid w-full max-w-[1760px] ${short ? "h-full grid-cols-[46fr_54fr] gap-1" : "grid-cols-1 gap-2 mobile-l:grid-cols-[46fr_54fr] desktop:gap-4"}`}
			>
				{/* Left: the hero, the weapon in hand, the items owned and the full stats. */}
				<section className={`${PLATE} flex flex-col ${short ? "min-h-0 gap-1 p-1.5" : "gap-3 p-3"}`}>
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
								<Counter icon="☠">{t("shop.souls", { souls: hero.souls })}</Counter>
							</div>
						</div>
					) : null}
					{weapon ? (
						<div className={`${PLATE} flex flex-col gap-2 p-2`} data-testid="shop-weapon">
							<div className="flex items-center gap-3">
								<div
									aria-hidden="true"
									className={`flex shrink-0 items-center justify-center border-2 bg-night font-display text-ember-light ${TIER_BORDER[weapon.tier] ?? "border-iron-dark"} ${short ? "size-10 text-xl" : "size-16 text-3xl"}`}
								>
									{weapon.icon ? <Icon icon={weapon.icon} size={short ? 32 : 48} /> : "⚔"}
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
							{upgrade ? (
								<fieldset
									data-testid={`shop-slot-${upgradeIndex}`}
									aria-label={upgrade.name}
									{...focusProps(upgradeIndex)}
									className={`m-0 flex min-w-0 flex-col gap-1 border-iron-dark border-t-2 p-0 pt-2 ${upgrade.sold ? "opacity-40" : ""}`}
								>
									<div className="font-body text-bone-dark text-sm">
										{kindLabel("upgrade")}: {upgrade.lines.join(" · ")}
									</div>
									<OfferRow
										slot={upgrade}
										index={upgradeIndex}
										short={short}
										actions={actions}
									/>
								</fieldset>
							) : null}
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
								{Array.from({ length: itemRows * ITEMS_PER_ROW - items.length }, (_, i) => (
									<li
										key={`empty-${i}`}
										aria-hidden="true"
										className="aspect-square border-2 border-iron-dark bg-night/60"
									/>
								))}
							</ul>
						</div>
					) : null}
					{!short && view.synergies && view.synergies.length > 0 ? (
						<div className={`${PLATE} p-2`} data-testid="shop-synergies">
							<h2 className="mb-1 font-display text-base text-bone uppercase">
								{t("shop.synergies")}
							</h2>
							<ul className="flex flex-wrap gap-1">
								{view.synergies.map((s) => (
									<li
										key={s.id}
										data-reached={s.reached}
										className={`border-2 bg-night-2 px-1.5 font-display text-sm ${s.reached > 0 ? "border-ember text-ember-light" : "border-iron-dark text-bone-dark"}`}
									>
										{s.name} {s.count}
										{s.nextAt === null ? "" : `/${s.nextAt}`}
									</li>
								))}
							</ul>
						</div>
					) : null}
					<div
						data-testid="shop-side"
						className={`${PLATE} flex-1 ${short ? "min-h-0 overflow-y-auto p-1.5" : "p-3"}`}
					>
						<h2 className="mb-2 font-display text-base text-bone uppercase">{t("shop.stats")}</h2>
						<StatList stats={stats} preview={preview} />
					</div>
				</section>

				{/* Right: the Merchant, its four offers in two columns, then reroll, gold and next round. */}
				<section
					className={`${PLATE} order-first flex flex-col mobile-l:order-none ${short ? "min-h-0 gap-1 p-1.5" : "gap-3 p-3"}`}
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
						className={`grid ${short ? "min-h-0 flex-1 grid-cols-2 content-start gap-1 overflow-y-auto" : "grid-cols-1 gap-2 mobile-l:grid-cols-2 desktop:gap-3"}`}
					>
						{view.slots.map((slot, i) =>
							i === upgradeIndex ? null : (
								<fieldset
									key={`${slot.kind}-${slot.id}-${i}`}
									data-testid={`shop-slot-${i}`}
									aria-label={slot.name}
									{...focusProps(i)}
									className={`panel-riveted m-0 flex min-w-0 flex-col border-2 bg-linear-to-b from-iron-black to-night-2 ${short ? "gap-0.5 p-1" : "gap-2 p-3 desktop:gap-4 desktop:p-4 desktop:min-h-56"} ${TIER_BORDER[slot.tier] ?? "border-iron-dark"} ${slot.sold ? "opacity-40" : ""}`}
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
												className={`font-display text-bone ${short ? "text-xs leading-tight" : "text-lg desktop:text-xl"}`}
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
												className={`mt-1 font-body text-bone-dark ${short ? "text-[11px] leading-tight" : "text-sm desktop:text-base"}`}
											>
												{slot.lines.map((line) => (
													<li key={line}>{line}</li>
												))}
											</ul>
											{slot.tags && slot.tags.length > 0 ? (
												<TagChips tags={slot.tags} short={short} />
											) : null}
										</div>
									</div>
									<OfferRow slot={slot} index={i} short={short} actions={actions} />
								</fieldset>
							),
						)}
					</div>
					<div
						className={`${PLATE} mt-auto flex shrink-0 items-center ${short ? "gap-1 p-1" : "flex-wrap gap-2 p-2 desktop:gap-4"}`}
					>
						<button
							type="button"
							onClick={actions.reroll}
							disabled={view.gold < view.rerollPrice}
							className={`h-11 ${short ? "whitespace-nowrap px-1.5 text-xs" : "px-3 text-base"} ${IRON_BUTTON}`}
						>
							<span aria-hidden="true">⟳ </span>
							{t("shop.reroll", { price: view.rerollPrice, key: rerollHint })}
						</button>
						<div
							className={`flex items-center gap-1 border-iron-dark font-display text-currency mobile-l:border-x-2 ${short ? "whitespace-nowrap px-1 text-xs" : "px-2 text-base"}`}
							data-testid="shop-gold"
						>
							<span aria-hidden="true">●</span>
							{t("shop.goldLabel", { gold: view.gold })}
						</div>
						<button
							type="button"
							onClick={actions.next}
							className={`ml-auto h-11 uppercase ${short ? "whitespace-nowrap px-2 text-xs" : "px-4 text-lg"} ${EMBER_BUTTON}`}
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
