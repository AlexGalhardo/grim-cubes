import type { JSX } from "react";

export type BarVariant = "hp" | "xp" | "boss";

export interface BarProps {
	value: number;
	max: number;
	variant?: BarVariant;
	label?: string;
}

const FILL: Record<BarVariant, string> = {
	hp: "bg-blood-light",
	xp: "bg-currency",
	boss: "bg-blood-light",
};
const LOW_FRACTION = 0.25;

export function Bar({ value, max, variant = "hp", label }: BarProps): JSX.Element {
	const clamped = Math.min(Math.max(value, 0), max);
	const fraction = max > 0 ? clamped / max : 0;
	const low = variant === "hp" && fraction < LOW_FRACTION;
	return (
		<div
			role="progressbar"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={clamped}
			className={`relative w-full overflow-hidden border-2 border-iron-dark bg-night ${variant === "boss" ? "h-7" : "h-5"}`}
		>
			<div
				data-low={low}
				className={`h-full border-ember-light/40 border-t-2 ${FILL[variant]} ${low ? "animate-low" : ""}`}
				style={{ width: `${fraction * 100}%` }}
			/>
			<span className="absolute inset-0 flex items-center justify-center font-display text-base text-bone [text-shadow:1px_1px_0_var(--color-night)]">
				{Math.ceil(clamped)}/{max}
			</span>
		</div>
	);
}
