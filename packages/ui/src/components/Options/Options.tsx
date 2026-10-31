import { t } from "@gc/core";
import type { JSX } from "react";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export type VolumeBus = "master" | "music" | "sfx";
const BUSES: readonly VolumeBus[] = ["master", "music", "sfx"];

export interface OptionsViewModel {
	/** "auto" or a preset id. */
	preset: string;
	presets: readonly { id: string; name: string }[];
	/** Whole percents, 0 to 100. */
	volume: Readonly<Record<VolumeBus, number>>;
	screenShake: boolean;
	/** 1, 2 or 3. */
	gameSpeed: number;
	locale: string;
	locales: readonly { id: string; name: string }[];
}

export interface OptionsActions {
	setPreset(id: string): void;
	setVolume(bus: VolumeBus, percent: number): void;
	setScreenShake(on: boolean): void;
	setGameSpeed(speed: number): void;
	setLocale(id: string): void;
	close(): void;
}

export interface OptionsProps {
	view: OptionsViewModel;
	actions: OptionsActions;
}

const SELECT = "min-h-12 border-2 border-mist bg-night-2 px-2 font-body text-sm text-bone focus:border-ember";

/** Video, audio, gameplay and language (A-01-01); the host saves every change as it happens. */
export function Options({ view, actions }: OptionsProps): JSX.Element {
	const nav = useDialogNav<HTMLDivElement>({ onCancel: actions.close });
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="options-title"
			className="pointer-events-auto absolute inset-0 z-40 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className="m-auto w-full max-w-xl">
				<Panel title={t("options.panel")} riveted>
					<h1 id="options-title" className="sr-only">
						{t("options.title")}
					</h1>
					<fieldset className="flex flex-col gap-2 font-body text-sm text-bone-dark">
						<legend className="font-display text-base text-bone">{t("options.video")}</legend>
						<label className="flex flex-col gap-1">
							{t("options.preset")}
							<select
								data-testid="options-preset"
								value={view.preset}
								onChange={(event) => actions.setPreset(event.target.value)}
								className={SELECT}
							>
								<option value="auto">{t("options.auto")}</option>
								{view.presets.map((preset) => (
									<option key={preset.id} value={preset.id}>
										{preset.name}
									</option>
								))}
							</select>
						</label>
					</fieldset>
					<fieldset className="mt-3 flex flex-col gap-2 font-body text-sm text-bone-dark">
						<legend className="font-display text-base text-bone">{t("options.audio")}</legend>
						{BUSES.map((bus) => (
							<label key={bus} className="flex min-h-12 items-center gap-3">
								<span className="w-28">{t(`options.volume.${bus}`)}</span>
								<input
									type="range"
									min={0}
									max={100}
									step={5}
									data-testid={`options-volume-${bus}`}
									value={view.volume[bus]}
									onChange={(event) => actions.setVolume(bus, Number(event.target.value))}
									className="flex-1"
								/>
								<span className="w-10 text-right">{view.volume[bus]}%</span>
							</label>
						))}
					</fieldset>
					<fieldset className="mt-3 flex flex-col gap-2 font-body text-sm text-bone-dark">
						<legend className="font-display text-base text-bone">{t("options.gameplay")}</legend>
						<label className="flex min-h-12 items-center gap-2">
							<input
								type="checkbox"
								data-testid="options-shake"
								checked={view.screenShake}
								onChange={(event) => actions.setScreenShake(event.target.checked)}
							/>
							{t("options.shake")}
						</label>
						<label className="flex flex-col gap-1">
							{t("options.speed")}
							<select
								data-testid="options-speed"
								value={view.gameSpeed}
								onChange={(event) => actions.setGameSpeed(Number(event.target.value))}
								className={SELECT}
							>
								{[1, 2, 3].map((speed) => (
									<option key={speed} value={speed}>
										{speed}x
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1">
							{t("options.language")}
							<select
								data-testid="options-locale"
								value={view.locale}
								onChange={(event) => actions.setLocale(event.target.value)}
								className={SELECT}
							>
								{view.locales.map((locale) => (
									<option key={locale.id} value={locale.id}>
										{locale.name}
									</option>
								))}
							</select>
						</label>
					</fieldset>
					<div className="mt-4 flex justify-end">
						<Button size="lg" onClick={actions.close}>
							{t("options.close")}
						</Button>
					</div>
				</Panel>
			</div>
		</div>
	);
}
