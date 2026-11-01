import { type JSX, useEffect, useRef } from "react";
import { Button } from "../Button/Button";

export interface LeaveConfirmProps {
	/** What is being asked ("Sair do Grim Cubes?"). */
	question: string;
	/** Label of the harmless answer, which takes the focus. */
	stayLabel: string;
	/** Label of the answer that leaves. */
	leaveLabel: string;
	onStay(): void;
	onLeave(): void;
	testId?: string;
}

/**
 * The question before leaving (the game, or back to the title menu). It replaces the content of its dialog rather
 * than opening another one, so the dialog's own focus trap and pad navigation keep working; the harmless answer has
 * the focus.
 */
export function LeaveConfirm({
	question,
	stayLabel,
	leaveLabel,
	onStay,
	onLeave,
	testId = "leave-confirm",
}: LeaveConfirmProps): JSX.Element {
	const stay = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		stay.current?.focus();
	}, []);
	return (
		<div data-testid={testId} role="alertdialog" aria-labelledby={`${testId}-question`}>
			<p id={`${testId}-question`} className="font-body text-base text-bone">
				{question}
			</p>
			<div className="mt-4 flex flex-wrap justify-between gap-3">
				<Button size="lg" buttonRef={stay} testId={`${testId}-stay`} onClick={onStay}>
					{stayLabel}
				</Button>
				<Button size="lg" testId={`${testId}-leave`} onClick={onLeave}>
					{leaveLabel}
				</Button>
			</div>
		</div>
	);
}
