import { t } from "@gc/core";
import type { JSX, PointerEvent } from "react";

/** The heal and the super the player casts (S-20-02); `null` in the HUD state outside a fight. */
export interface SpellsView {
	healName: string;
	superName: string;
	/** 0..1 progress of the heal cooldown; 1 when it is ready. */
	healFill: number;
	healReady: boolean;
	/** 0..1 progress of the super charge; 1 when it is ready or running. */
	superFill: number;
	superReady: boolean;
	/** The super is running its 5 seconds. */
	superActive: boolean;
	/** Kills counted towards the next super, and the kills it needs (100, then 5 more per cast in the round). */
	superKills: number;
	superNeeded: number;
	/** `KeyboardEvent.code` and gamepad button (standard mapping index) of each spell (Options remap). */
	healKey: string;
	superKey: string;
	padHeal: number;
	padSuper: number;
}

export type SpellKind = "heal" | "super";

export interface SpellBarProps {
	view: SpellsView;
	/** What each button shows as its hint: the key or the gamepad button. */
	healHint: string;
	superHint: string;
	/** Touch screens: the bar sits left of the dash button instead of at the bottom centre. */
	touch: boolean;
	/** Held state, written straight to the input without going through React state, like the dash button. */
	onHold(kind: SpellKind, down: boolean): void;
}

interface SpellButtonProps {
	kind: SpellKind;
	name: string;
	hint: string;
	glyph: string;
	fill: number;
	ready: boolean;
	active?: boolean;
	size: string;
	onHold(kind: SpellKind, down: boolean): void;
}

function SpellButton({
	kind,
	name,
	hint,
	glyph,
	fill,
	ready,
	active,
	size,
	onHold,
}: SpellButtonProps): JSX.Element {
	const press = (e: PointerEvent<HTMLButtonElement>): void => {
		e.currentTarget.setPointerCapture?.(e.pointerId);
		onHold(kind, true);
	};
	const release = (): void => onHold(kind, false);
	return (
		<button
			type="button"
			data-testid={`spell-${kind}`}
			data-ready={ready}
			aria-label={t("spells.button", { name, hint })}
			onPointerDown={press}
			onPointerUp={release}
			onPointerCancel={release}
			className={`pointer-events-auto relative flex touch-none select-none items-center justify-center overflow-hidden border-2 bg-night-2/80 font-display text-xl ${size} ${active ? "border-bone text-bone" : ready ? "border-ember text-ember-light" : "border-mist text-bone-dark"}`}
		>
			<span aria-hidden="true">{glyph}</span>
			<span aria-hidden="true" className="absolute right-0.5 bottom-0 text-xs text-bone-dark">
				{hint}
			</span>
			{!ready && !active ? (
				<span
					aria-hidden="true"
					className="absolute inset-0 origin-bottom bg-night/60"
					style={{ transform: `scaleY(${1 - fill})` }}
				/>
			) : null}
		</button>
	);
}

/** The two spell buttons and the super charge bar: bottom centre on desktop, beside the dash button on touch. */
export function SpellBar({ view, healHint, superHint, touch, onHold }: SpellBarProps): JSX.Element {
	const size = touch ? "size-12" : "size-14";
	return (
		<div
			data-testid="spell-bar"
			className={`pointer-events-none absolute bottom-3 flex items-start gap-2 ${touch ? "right-28" : "left-1/2 -translate-x-1/2"}`}
		>
			<SpellButton
				kind="heal"
				name={view.healName}
				hint={healHint}
				glyph="✚"
				fill={view.healFill}
				ready={view.healReady}
				size={size}
				onHold={onHold}
			/>
			<div className="flex flex-col items-center gap-1">
				<SpellButton
					kind="super"
					name={view.superName}
					hint={superHint}
					glyph="✦"
					fill={view.superFill}
					ready={view.superReady}
					active={view.superActive}
					size={size}
					onHold={onHold}
				/>
				<div
					role="progressbar"
					data-testid="super-charge"
					aria-label={t("spells.charge")}
					aria-valuemin={0}
					aria-valuemax={view.superNeeded}
					aria-valuenow={view.superKills}
					className="relative h-2.5 w-24 border border-mist bg-night"
				>
					<div
						className={`h-full origin-left ${view.superReady || view.superActive ? "bg-ember-light" : "bg-ember"}`}
						style={{ transform: `scaleX(${view.superFill})` }}
					/>
				</div>
				<span aria-hidden="true" className="text-xs text-bone-dark">
					{view.superActive
						? t("spells.active")
						: t("spells.progress", { kills: view.superKills, needed: view.superNeeded })}
				</span>
			</div>
		</div>
	);
}
