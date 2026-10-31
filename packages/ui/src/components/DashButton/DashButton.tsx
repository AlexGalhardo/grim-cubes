import type { JSX, PointerEvent } from "react";

export interface DashView {
	charges: number;
	max: number;
	/** 0..1 progress of the charge being recharged; 1 when all are ready. */
	recharge: number;
}

export interface DashButtonProps {
	view: DashView;
	/** Held state, written straight to the input without going through React state (SDD 07 section 4). */
	onHold(down: boolean): void;
}

/** Touch dash button, bottom right (GDD 17.2). Hidden until the Ossuary unlocks the dash. */
export function DashButton({ view, onHold }: DashButtonProps): JSX.Element {
	const press = (e: PointerEvent<HTMLButtonElement>): void => {
		e.currentTarget.setPointerCapture?.(e.pointerId);
		onHold(true);
	};
	const release = (): void => onHold(false);
	const ready = view.charges > 0;
	return (
		<button
			type="button"
			aria-label="Dash"
			data-testid="dash-button"
			data-charges={view.charges}
			onPointerDown={press}
			onPointerUp={release}
			onPointerCancel={release}
			className={`pointer-events-auto absolute right-4 bottom-4 flex size-20 touch-none select-none items-center justify-center border-2 bg-night-2/80 font-display text-base ${ready ? "border-ember text-ember-light" : "border-mist text-bone-dark"}`}
		>
			<span aria-hidden="true">{view.max > 1 ? `${view.charges}/${view.max}` : "Dash"}</span>
			<span
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 h-1 origin-left bg-ember"
				style={{ transform: `scaleX(${view.recharge})` }}
			/>
		</button>
	);
}
