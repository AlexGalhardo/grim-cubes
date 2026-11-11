import { t } from "@gc/core";
import { type JSX, useEffect } from "react";
import { isDesktopWidth, useShortScreen } from "../../hooks/useViewport";
import { useDialogNav } from "../../nav/useDialogNav";
import { Icon, type IconRef } from "../Icon/Icon";
import { TIER_BORDER, TIER_TEXT } from "../styles";

/** One stat a card changes: its value now and after picking the card, already formatted. */
export interface CardChange {
	/** Matches `StatLineView.id`. */
	id: string;
	stat: string;
	current: string;
	next: string;
}

export interface CardView {
	id: string;
	/** The card's own name (display font). */
	name: string;
	double: boolean;
	icon?: IconRef | undefined;
	/** 1-5, the rarity colour of the frame (a double card is Epic, an elite chest item keeps its tier). */
	rarity: number;
	/** The effect lines, e.g. "+4% dano". */
	lines: readonly string[];
	/** The stats the card changes, shown as `stat current → next`; empty when it changes none. */
	changes: readonly CardChange[];
}

export interface LevelUpProps {
	cards: readonly CardView[];
	onChoose: (index: number) => void;
	/** Heading; defaults to the level-up title. The elite chest reuses this screen. */
	title?: string;
	/** Ossuary card rerolls left; the button is hidden when 0 or when there is no handler. */
	rerollsLeft?: number;
	onReroll?: (() => void) | undefined;
	/** `KeyboardEvent.code` of the reroll key (Options remap); defaults to R. */
	rerollKey?: string | undefined;
	/** The key or button to show on the reroll button ("R", or "X" when the last input was the pad). */
	rerollHint?: string | undefined;
	/** Gamepad button of the reroll (standard mapping index). */
	rerollButton?: number | undefined;
}

/** Level-up overlay (Art Bible 16.5 `LevelUpCard`): pick 1 of up to 3 cards with a click, a tap or keys 1-3. */
export function LevelUp({
	cards,
	onChoose,
	title = t("levelUp.title"),
	rerollsLeft = 0,
	onReroll,
	rerollKey = "KeyR",
	rerollHint = "R",
	rerollButton,
}: LevelUpProps): JSX.Element {
	useEffect(() => {
		const onKey = (e: KeyboardEvent): void => {
			const index = Number(e.key) - 1;
			if (Number.isInteger(index) && index >= 0 && index < cards.length) onChoose(index);
			else if (e.code === rerollKey) onReroll?.();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [cards, onChoose, onReroll, rerollKey]);

	const nav = useDialogNav<HTMLDivElement>({
		onReroll: rerollsLeft > 0 ? onReroll : undefined,
		rerollButton,
	});
	const short = useShortScreen();
	const desktopWide = isDesktopWidth();
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="levelup-title"
			className={`pointer-events-auto absolute inset-0 z-20 flex overflow-y-auto bg-night/80 ${short ? "p-2" : "p-4"}`}
		>
			<div className={`m-auto flex flex-col items-center ${short ? "gap-2" : "gap-6"}`}>
				<h1
					id="levelup-title"
					className={`font-display text-ember-light ${short ? "text-lg" : "text-2xl"}`}
				>
					{title}
				</h1>
				<div
					data-testid="levelup-cards"
					className={`flex w-full flex-wrap justify-center ${short ? "gap-2" : "gap-4"}`}
				>
					{cards.map((card, i) => (
						<button
							key={card.id}
							type="button"
							data-testid={`levelup-card-${i}`}
							onClick={() => onChoose(i)}
							style={{ animationDelay: `${i * 60}ms` }}
							className={`group panel-riveted flex h-55 w-40 animate-card-in flex-col items-center overflow-hidden border-2 bg-linear-to-b from-iron-black to-night-2 p-2 text-center font-display text-bone shadow-plate transition-[translate,border-color] duration-fast hover:-translate-y-1 hover:border-ember focus-visible:-translate-y-1 focus-visible:border-ember focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 active:translate-y-0 mobile-l:h-60 mobile-l:w-45 desktop:h-75 desktop:w-55 desktop:p-3 ${TIER_BORDER[card.rarity] ?? "border-iron-dark"}`}
						>
							<span className="flex w-full items-center justify-between text-xs">
								<span className="border-2 border-iron-dark bg-night px-1.5 text-bone-dark">
									{i + 1}
								</span>
								<span className={`uppercase ${TIER_TEXT[card.rarity] ?? "text-bone-dark"}`}>
									<span
										className="rarity-mark"
										data-tier={card.rarity}
										data-testid={`levelup-rarity-mark-${i}`}
										aria-hidden="true"
									/>
									{t(`rarity.${card.rarity}`)}
								</span>
							</span>
							<span
								className={`my-1 flex shrink-0 items-center justify-center border-2 bg-night desktop:my-3 ${short ? "size-14" : "size-14 desktop:size-24"} ${TIER_BORDER[card.rarity] ?? "border-iron-dark"}`}
							>
								{card.icon ? (
									<Icon icon={card.icon} size={short ? 48 : desktopWide ? 64 : 48} />
								) : null}
							</span>
							<span className="text-base leading-tight text-bone group-hover:text-ember-light group-focus-visible:text-ember-light desktop:text-2xl">
								{card.name}
							</span>
							<span className="mt-1 flex flex-col font-body text-heal text-xs desktop:text-base">
								{card.lines.map((line) => (
									<span key={line}>{line}</span>
								))}
							</span>
							{card.changes.length > 0 ? (
								<span className="mt-auto flex w-full flex-col gap-0.5 border-iron-dark border-t-2 pt-1 font-body text-xs desktop:text-base">
									{card.changes.map((change) => (
										<span
											key={change.id}
											data-testid={`levelup-change-${i}-${change.id}`}
											className="flex flex-wrap justify-between gap-x-2"
										>
											<span className="text-bone-dark">{change.stat}</span>
											<span className="ml-auto whitespace-nowrap text-bone">
												{change.current} →{" "}
												<span className="text-heal">{change.next}</span>
											</span>
										</span>
									))}
								</span>
							) : null}
						</button>
					))}
				</div>
				{onReroll && rerollsLeft > 0 ? (
					<button
						type="button"
						data-testid="levelup-reroll"
						onClick={onReroll}
						className="min-h-12 border-2 border-iron-dark bg-night-2 px-4 font-display text-base text-bone hover:border-ember hover:text-ember-light focus-visible:outline-2 focus-visible:outline-ember"
					>
						{t("levelUp.reroll", { left: rerollsLeft, key: rerollHint })}
					</button>
				) : null}
			</div>
		</div>
	);
}
