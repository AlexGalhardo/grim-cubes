import { t } from "@gc/core";
import { type JSX, useEffect } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Icon, type IconRef } from "../Icon/Icon";

export interface CardView {
	id: string;
	name: string;
	double: boolean;
	icon?: IconRef | undefined;
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
}

/** Level-up overlay (Art Bible 16.5 `LevelUpCard`): pick 1 of up to 3 cards with a click, a tap or keys 1-3. */
export function LevelUp({
	cards,
	onChoose,
	title = t("levelUp.title"),
	rerollsLeft = 0,
	onReroll,
	rerollKey = "KeyR",
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

	const nav = useDialogNav<HTMLDivElement>();
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="levelup-title"
			className="pointer-events-auto absolute inset-0 z-20 flex overflow-y-auto bg-night/70 p-4 low:p-2"
		>
			<div className="m-auto flex w-full max-w-4xl flex-col items-center gap-6 low:gap-2">
				<h1 id="levelup-title" className="font-display text-2xl text-ember-light low:text-lg">
					{title}
				</h1>
				<div className="flex w-full flex-col gap-3 mobile-l:flex-row low:flex-row low:gap-2">
					{cards.map((card, i) => (
						<button
							key={card.id}
							type="button"
							data-testid={`levelup-card-${i}`}
							onClick={() => onChoose(i)}
							className="relative flex min-h-16 flex-1 items-center justify-center border-2 border-iron-dark bg-night-2 p-4 text-center font-display text-base text-bone shadow-plate transition-colors duration-fast hover:border-ember hover:text-ember-light focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 active:translate-x-px active:translate-y-px mobile-l:min-h-40 low:min-h-24 low:p-2 low:text-sm"
						>
							<span className="absolute top-1 left-2 border-2 border-iron-dark px-1 text-xs text-bone-dark">
								{i + 1}
							</span>
							<span className="flex flex-col items-center gap-2">
								{card.icon ? (
									<>
										<span className="low:hidden">
											<Icon icon={card.icon} size={64} />
										</span>
										<span className="hidden low:block">
											<Icon icon={card.icon} size={40} />
										</span>
									</>
								) : null}
								{card.name}
							</span>
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
						{t("levelUp.reroll", { left: rerollsLeft })}
					</button>
				) : null}
			</div>
		</div>
	);
}
