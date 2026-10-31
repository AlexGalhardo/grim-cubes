import { t } from "@gc/core";
import { type JSX, useEffect, useRef, useState } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface PauseViewModel {
	/** Round the saved run resumes at if the player leaves now. */
	round: number;
}

export interface PauseActions {
	resume(): void;
	options(): void;
	/** Leaves for the title menu; the run stays saved at the start of its round. */
	quit(): void;
}

export interface PauseMenuProps {
	view: PauseViewModel;
	actions: PauseActions;
}

/** The pause menu (Esc, Start or the pause button): Continuar, Opções and Sair para o menu with a confirmation. */
export function PauseMenu({ view, actions }: PauseMenuProps): JSX.Element {
	const [confirming, setConfirming] = useState(false);
	const nav = useDialogNav<HTMLDivElement>({
		onCancel: () => (confirming ? setConfirming(false) : actions.resume()),
	});
	const keep = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (confirming) keep.current?.focus();
	}, [confirming]);
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="pause-title"
			data-testid="pause-menu"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-xs">
				<Panel title={t("pause.panel")} riveted>
					<h1 id="pause-title" className="sr-only">
						{t("pause.title")}
					</h1>
					{confirming ? (
						<div data-testid="pause-confirm">
							<p className="font-body text-base text-bone">
								{t("pause.confirmQuit", { round: view.round })}
							</p>
							<div className="mt-4 flex flex-wrap justify-between gap-3">
								<button
									ref={keep}
									type="button"
									data-testid="pause-stay"
									onClick={() => setConfirming(false)}
									className="h-12 border-2 border-iron-dark bg-iron px-4 font-display text-base text-bone shadow-plate hover:border-ember hover:text-ember-light"
								>
									{t("pause.stay")}
								</button>
								<Button size="lg" onClick={actions.quit}>
									{t("pause.confirmYes")}
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<button
								type="button"
								data-autofocus
								data-testid="pause-resume"
								onClick={actions.resume}
								className="min-h-12 border-2 border-ember bg-iron px-4 font-display text-lg text-ember-light shadow-plate hover:text-bone"
							>
								{t("pause.resume")}
							</button>
							<Button size="lg" onClick={actions.options}>
								{t("pause.options")}
							</Button>
							<Button size="lg" onClick={() => setConfirming(true)}>
								{t("pause.quit")}
							</Button>
						</div>
					)}
				</Panel>
			</div>
		</div>
	);
}
