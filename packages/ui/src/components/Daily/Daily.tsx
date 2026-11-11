import { t } from "@gc/core";
import type { JSX } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface DailyRowView {
	/** UTC date, `2026-11-11`. */
	date: string;
	round: number;
	/** Combat time already formatted (`12:34`). */
	time: string;
	kills: number;
}

export interface DailyViewModel {
	/** Today's challenge day (UTC). */
	date: string;
	heroName: string;
	weapon: string;
	/** Today's scored attempt, or null while the day's one attempt is still free. */
	today: DailyRowView | null;
	/** The latest days, newest first. */
	rows: readonly DailyRowView[];
}

export interface DailyActions {
	start(): void;
	cancel(): void;
}

export interface DailyProps {
	view: DailyViewModel;
	actions: DailyActions;
}

/** The daily challenge: today's seed and hero, the one scored attempt and the local table of the last days (GDD 20). */
export function Daily({ view, actions }: DailyProps): JSX.Element {
	const nav = useDialogNav<HTMLDivElement>({ onCancel: actions.cancel });
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="daily-title"
			data-testid="daily"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-xl">
				<Panel title={t("daily.panel")} riveted>
					<h1 id="daily-title" className="sr-only">
						{t("daily.title", { date: view.date })}
					</h1>
					<div className="flex flex-col gap-1 font-body text-sm text-bone-dark">
						<span data-testid="daily-date">{t("daily.date", { date: view.date })}</span>
						<span>
							{t("daily.hero")}: <span className="text-bone">{view.heroName}</span> ·{" "}
							{t("daily.weapon")}: <span className="text-bone">{view.weapon}</span>
						</span>
						<span data-testid="daily-status" className="text-ember-light">
							{view.today
								? t("daily.scored", { round: view.today.round, time: view.today.time })
								: t("daily.open")}
						</span>
						<span>{t("daily.rule")}</span>
					</div>
					<div className="mt-3 max-h-40 overflow-y-auto desktop:max-h-64">
						{view.rows.length === 0 ? (
							<p className="font-body text-sm text-bone-dark">{t("daily.empty")}</p>
						) : (
							<table
								className="w-full font-body text-xs text-bone desktop:text-sm"
								data-testid="daily-table"
							>
								<caption className="sr-only">{t("daily.history")}</caption>
								<thead className="text-bone-dark">
									<tr>
										<th scope="col" className="text-left font-normal">
											{t("daily.col.date")}
										</th>
										<th scope="col" className="text-right font-normal">
											{t("daily.col.round")}
										</th>
										<th scope="col" className="text-right font-normal">
											{t("daily.col.time")}
										</th>
										<th scope="col" className="text-right font-normal">
											{t("daily.col.kills")}
										</th>
									</tr>
								</thead>
								<tbody>
									{view.rows.map((row) => (
										<tr key={row.date}>
											<td>{row.date}</td>
											<td className="text-right">{row.round}</td>
											<td className="text-right">{row.time}</td>
											<td className="text-right">{row.kills}</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
					<div className="mt-4 flex flex-wrap justify-between gap-3">
						<Button onClick={actions.cancel}>{t("daily.back")}</Button>
						<Button size="lg" testId="daily-start" onClick={actions.start}>
							{t("daily.start")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
