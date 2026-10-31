import { t } from "@gc/core";
import { type JSX, useEffect, useRef } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Icon, type IconRef } from "../Icon/Icon";
import { Panel } from "../Panel/Panel";

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
}

export interface ShopViewModel {
	slots: readonly ShopSlotView[];
	rerollPrice: number;
	gold: number;
}

export interface StatLineView {
	label: string;
	value: string;
}

export interface ShopActions {
	buy(index: number): void;
	toggleLock(index: number): void;
	reroll(): void;
	next(): void;
}

/** Animated Merchant portrait: the app draws the rig into the canvas between `start` and `stop`. */
export type PortraitFactory = (canvas: HTMLCanvasElement) => { start(): void; stop(): void };

export interface ShopProps {
	view: ShopViewModel;
	stats: readonly StatLineView[];
	actions: ShopActions;
	portrait?: PortraitFactory | undefined;
}

const PORTRAIT_PX = 160;
/** Same threshold as the `desktop` breakpoint of theme.css, where the portrait is shown; below it the pass is skipped. */
const DESKTOP_QUERY = "(min-width: 1024px)";
const isDesktopWidth = (): boolean =>
	typeof window.matchMedia !== "function" || window.matchMedia(DESKTOP_QUERY).matches;

const TIER_BORDER: Readonly<Record<number, string>> = {
	1: "border-rarity-1",
	2: "border-rarity-2",
	3: "border-rarity-3",
	4: "border-rarity-4",
};
const kindLabel = (kind: ShopSlotView["kind"]): string =>
	kind === "weapon" ? t("shop.kindWeapon") : kind === "upgrade" ? t("shop.kindUpgrade") : "";

/** Between-rounds shop (GDD 17): 4 offers, lock, reroll, hero stats, next round. Keys 1-4 buy, R rerolls, Enter continues. */
export function Shop({ view, stats, actions, portrait }: ShopProps): JSX.Element {
	const portraitCanvas = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const canvas = portraitCanvas.current;
		if (!portrait || !canvas || !isDesktopWidth()) return;
		const running = portrait(canvas);
		running.start();
		return () => running.stop();
	}, [portrait]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent): void => {
			const index = Number(e.key) - 1;
			if (Number.isInteger(index) && index >= 0 && index < view.slots.length) actions.buy(index);
			else if (e.key === "r" || e.key === "R") actions.reroll();
			else if (e.key === "Enter") actions.next();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [view.slots.length, actions]);

	const nav = useDialogNav<HTMLDivElement>();
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="shop-title"
			className="pointer-events-auto absolute inset-0 z-20 flex overflow-y-auto bg-night/80 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-5xl">
				<Panel title={t("shop.panel")} riveted>
					<h1 id="shop-title" className="sr-only">
						{t("shop.title")}
					</h1>
					<div className="mb-3 text-currency" data-testid="shop-gold">
						{t("shop.gold", { gold: view.gold })}
					</div>
					<div className="flex flex-col gap-3 desktop:flex-row">
						<div className="grid flex-1 grid-cols-2 gap-2 mobile-l:gap-3 desktop:grid-cols-4">
							{view.slots.map((slot, i) => (
								<div
									key={`${slot.kind}-${slot.id}-${i}`}
									data-testid={`shop-slot-${i}`}
									className={`flex flex-col gap-2 border-2 bg-night-2 p-3 ${TIER_BORDER[slot.tier] ?? "border-iron-dark"} ${slot.sold ? "opacity-40" : ""}`}
								>
									<span className="font-display text-xs text-bone-dark">
										{i + 1} {kindLabel(slot.kind)}
									</span>
									<span className="flex items-center gap-2 font-display text-base">
										{slot.icon ? <Icon icon={slot.icon} /> : null}
										{slot.name}
									</span>
									<ul className="flex-1 font-body text-sm text-bone-dark">
										{slot.lines.map((line) => (
											<li key={line}>{line}</li>
										))}
									</ul>
									<div className="flex items-center justify-between gap-2">
										<button
											type="button"
											data-testid={`shop-buy-${i}`}
											disabled={slot.sold}
											onClick={() => actions.buy(i)}
											className={`h-10 flex-1 border-2 border-iron-dark bg-iron px-2 font-display text-base shadow-plate transition-colors duration-fast hover:border-ember focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 disabled:opacity-50 pointer-coarse:min-h-12 ${slot.affordable ? "text-currency" : "text-danger"}`}
										>
											{slot.sold ? t("shop.sold") : slot.price}
										</button>
										<button
											type="button"
											data-testid={`shop-lock-${i}`}
											disabled={slot.sold}
											aria-pressed={slot.locked}
											aria-label={slot.locked ? t("shop.unlock") : t("shop.lock")}
											onClick={() => actions.toggleLock(i)}
											className={`h-10 w-10 border-2 font-display text-base transition-colors duration-fast pointer-coarse:min-h-12 pointer-coarse:min-w-12 ${slot.locked ? "border-ember text-ember-light" : "border-iron-dark text-bone-dark"}`}
										>
											{slot.locked ? "■" : "□"}
										</button>
									</div>
								</div>
							))}
						</div>
						<div className="hidden w-full flex-col gap-3 mobile-l:flex desktop:w-56">
							{portrait ? (
								<div
									aria-hidden="true"
									className="pointer-events-none mx-auto hidden size-32 shrink-0 border-2 border-iron-dark bg-night desktop:block"
								>
									<canvas
										ref={portraitCanvas}
										width={PORTRAIT_PX}
										height={PORTRAIT_PX}
										data-testid="shop-portrait"
										className="size-full"
									/>
								</div>
							) : null}
							<dl
								className="grid w-full grid-cols-2 gap-x-3 gap-y-1 font-body text-sm"
								aria-label={t("shop.stats")}
							>
								{stats.map((line) => (
									<div key={line.label} className="contents">
										<dt className="text-bone-dark">{line.label}</dt>
										<dd className="text-right">{line.value}</dd>
									</div>
								))}
							</dl>
						</div>
					</div>
					<div className="mt-4 flex flex-wrap justify-end gap-3">
						<Button onClick={actions.reroll} disabled={view.gold < view.rerollPrice}>
							{t("shop.reroll", { price: view.rerollPrice })}
						</Button>
						<Button size="lg" onClick={actions.next}>
							{t("shop.next")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
