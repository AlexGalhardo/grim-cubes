import { t } from "@gc/core";
import { type JSX, useEffect, useRef, useState } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface SlotView {
	slot: number;
	/** "Slot 1" */
	name: string;
	/** `empty`: free to use; `used`: has progress; `unreadable`: the files are damaged (kept untouched until erased). */
	state: "empty" | "used" | "unreadable";
	/** Last time the slot was written, already formatted for the locale; empty when never. */
	lastPlayed: string;
	bestRound: number;
	souls: number;
	/** Round the saved run resumes at, or null when there is none. */
	runRound: number | null;
}

export interface SlotsViewModel {
	slots: readonly SlotView[];
}

export interface SlotsActions {
	/** The player picked `slot` for a new game; `erase` is true when it held something and the player confirmed. */
	choose(slot: number, erase: boolean): void;
	/** The player confirmed erasing `slot`. */
	erase(slot: number): void;
	cancel(): void;
}

export interface SlotsProps {
	view: SlotsViewModel;
	actions: SlotsActions;
}

type Pending = { kind: "overwrite" | "erase"; slot: SlotView };

/** Picks one of the three save slots for a new game, or erases one (GDD 21.4). */
export function Slots({ view, actions }: SlotsProps): JSX.Element {
	const [pending, setPending] = useState<Pending | null>(null);
	const nav = useDialogNav<HTMLDivElement>({
		onCancel: () => (pending ? setPending(null) : actions.cancel()),
	});
	const safe = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		// A question about erasing starts on the harmless answer.
		if (pending) safe.current?.focus();
	}, [pending]);
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="slots-title"
			data-testid="slots"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-xl">
				<Panel title={t("slots.panel")} riveted>
					<h1 id="slots-title" className="sr-only">
						{t("slots.title")}
					</h1>
					{pending ? (
						<div data-testid="slots-confirm" role="alertdialog" aria-labelledby="slots-question">
							<p id="slots-question" className="font-body text-base text-bone">
								{t(
									pending.kind === "overwrite"
										? "slots.confirmOverwrite"
										: "slots.confirmErase",
									{
										name: pending.slot.name,
									},
								)}
							</p>
							<div className="mt-4 flex flex-wrap justify-between gap-3">
								<button
									ref={safe}
									type="button"
									data-testid="slots-keep"
									onClick={() => setPending(null)}
									className="h-12 border-2 border-iron-dark bg-iron px-4 font-display text-base text-bone shadow-plate hover:border-ember hover:text-ember-light"
								>
									{t("slots.keep")}
								</button>
								<Button
									size="lg"
									onClick={() => {
										const { kind, slot } = pending;
										setPending(null);
										if (kind === "overwrite") actions.choose(slot.slot, true);
										else actions.erase(slot.slot);
									}}
								>
									{t(
										pending.kind === "overwrite"
											? "slots.confirmOverwriteYes"
											: "slots.confirmEraseYes",
									)}
								</Button>
							</div>
						</div>
					) : (
						<>
							<ul className="flex flex-col gap-2">
								{view.slots.map((slot) => (
									<li key={slot.slot} className="flex flex-wrap items-stretch gap-2">
										<button
											type="button"
											data-testid={`slot-${slot.slot}`}
											onClick={() =>
												slot.state === "empty"
													? actions.choose(slot.slot, false)
													: setPending({ kind: "overwrite", slot })
											}
											className="flex min-h-12 min-w-0 flex-1 flex-col gap-1 border-2 border-mist bg-night-2 p-2 text-left font-body text-sm text-bone transition-colors duration-fast hover:border-ember hover:text-ember-light"
										>
											<span className="font-display text-base">
												{slot.name}
												{slot.state === "empty" ? ` · ${t("slots.empty")}` : null}
											</span>
											{slot.state === "unreadable" ? (
												<span className="text-bone-dark">
													{t("slots.unreadable")}
												</span>
											) : slot.state === "used" ? (
												<>
													<span className="text-bone-dark">
														{slot.lastPlayed
															? t("slots.lastPlayed", { when: slot.lastPlayed })
															: t("slots.never")}
													</span>
													<span className="text-bone-dark">
														{t("slots.progress", {
															round: slot.bestRound,
															souls: slot.souls,
														})}
													</span>
													{slot.runRound !== null ? (
														<span className="text-ember-light">
															{t("slots.runInProgress", {
																round: slot.runRound,
															})}
														</span>
													) : null}
												</>
											) : null}
										</button>
										{slot.state === "empty" ? null : (
											<Button
												size="lg"
												onClick={() => setPending({ kind: "erase", slot })}
											>
												{t("slots.erase")}{" "}
												<span className="sr-only">{slot.name}</span>
											</Button>
										)}
									</li>
								))}
							</ul>
							<div className="mt-4 flex justify-start">
								<Button onClick={actions.cancel}>{t("slots.back")}</Button>
							</div>
						</>
					)}
				</Panel>
			</div>
		</div>
	);
}
