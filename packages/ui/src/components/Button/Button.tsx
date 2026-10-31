import { type JSX, type ReactNode, type Ref, useEffect, useRef, useState } from "react";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonVariant = "plate" | "primary";

export interface ButtonProps {
	size?: ButtonSize;
	/** `primary` is the ember-rimmed main action (Play). */
	variant?: ButtonVariant;
	disabled?: boolean;
	onClick?: () => void;
	children?: ReactNode;
	testId?: string;
	/** Focus target (the menu focuses Play on open). */
	buttonRef?: Ref<HTMLButtonElement>;
}

const HEIGHT: Record<ButtonSize, string> = {
	sm: "h-8 text-sm",
	md: "h-10 text-base",
	lg: "min-h-12 text-lg btn-plate-lg",
};
/** How long a keyboard or gamepad confirm holds the plate down (ms), so the press reads without a pointer. */
const PRESS_MS = 90;

/**
 * The game's plate button (Art Bible 16): riveted iron with a solid base under it. The press dips the plate and the
 * base disappears; a click with no pointer (`detail` 0: Enter, Space, a gamepad confirm) holds that look for a
 * moment because `:active` never fires for them.
 */
export function Button({
	size = "md",
	variant = "plate",
	disabled = false,
	onClick,
	children,
	testId,
	buttonRef,
}: ButtonProps): JSX.Element {
	const [pressed, setPressed] = useState(false);
	const timer = useRef(0);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	return (
		<button
			ref={buttonRef}
			type="button"
			disabled={disabled}
			data-testid={testId}
			data-pressed={pressed}
			onClick={(event) => {
				if (event.detail === 0) {
					setPressed(true);
					window.clearTimeout(timer.current);
					timer.current = window.setTimeout(() => setPressed(false), PRESS_MS);
				}
				onClick?.();
			}}
			className={`btn-plate ${variant === "primary" ? "btn-plate-primary" : ""} ${HEIGHT[size]} px-4 font-display pointer-coarse:min-h-12 focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-4`}
		>
			{children}
		</button>
	);
}
