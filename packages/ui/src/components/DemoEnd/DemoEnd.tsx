import { t } from "@gc/core";
import type { JSX } from "react";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export interface DemoEndProps {
	onRestart: () => void;
	onOssuary?: (() => void) | undefined;
}

/** End of the web demo: the Gravedigger is down and round 11 never starts (P-07-01). */
export function DemoEnd({ onRestart, onOssuary }: DemoEndProps): JSX.Element {
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="demo-end-title"
			className="pointer-events-auto absolute inset-0 z-30 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-xl">
				<Panel title={t("demoEnd.panel")} riveted>
					<h1 id="demo-end-title" className="font-display text-xl text-ember-light">
						{t("demoEnd.title")}
					</h1>
					<p className="mt-2 font-body text-sm text-bone-dark">{t("demoEnd.body")}</p>
					<div className="mt-4 flex flex-wrap gap-3">
						{/* Disabled until the store pages and the full-game URL exist. */}
						<Button disabled>{t("demoEnd.steam")}</Button>
						<Button disabled>{t("demoEnd.play")}</Button>
					</div>
					<div className="mt-4 flex flex-wrap justify-between gap-3">
						{onOssuary ? <Button onClick={onOssuary}>{t("results.ossuary")}</Button> : <span />}
						<Button size="lg" onClick={onRestart}>
							{t("demoEnd.again")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
