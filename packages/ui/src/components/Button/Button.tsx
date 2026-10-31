import type { JSX, ReactNode } from "react";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
	size?: ButtonSize;
	disabled?: boolean;
	onClick?: () => void;
	children?: ReactNode;
}

const HEIGHT: Record<ButtonSize, string> = { sm: "h-8", md: "h-10", lg: "h-12" };

export function Button({ size = "md", disabled = false, onClick, children }: ButtonProps): JSX.Element {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={`${HEIGHT[size]} border-2 border-iron-dark bg-iron px-4 font-display text-base text-bone shadow-plate duration-fast hover:border-ember hover:text-ember-light focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 active:translate-x-px active:translate-y-px disabled:text-mist disabled:opacity-50 disabled:hover:border-iron-dark`}
		>
			{children}
		</button>
	);
}
