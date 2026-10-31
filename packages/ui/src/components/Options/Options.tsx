import {
	KEY_ACTIONS,
	type KeyAction,
	type KeyCheck,
	type KeyMap,
	PAD_ACTIONS,
	type PadAction,
	type PadCheck,
	type PadMap,
	type PadStyle,
	padButtonName,
	t,
} from "@gc/core";
import { type JSX, useEffect, useState } from "react";
import { keyLabel } from "../../keys";
import { useDialogNav } from "../../nav/useDialogNav";
import { Button } from "../Button/Button";
import { Panel } from "../Panel/Panel";

export type VolumeBus = "master" | "music" | "sfx";
const COLORBLIND = ["off", "protanopia", "deuteranopia", "tritanopia"] as const;
const UI_SCALES = [90, 100, 125, 150] as const;
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
	telemetry: boolean;
	/** Percent, -50 to 50. */
	brightness: number;
	/** Percent, 50 to 150. */
	contrast: number;
	colorblind: string;
	flashReduction: boolean;
	/** Percent: 90, 100, 125 or 150. */
	uiScale: number;
	/** true = full gore. */
	gore: boolean;
	keys: KeyMap;
	pad: PadMap;
	/** Label set of the connected controller. */
	padStyle?: PadStyle | undefined;
	subtitles: boolean;
	locale: string;
	locales: readonly { id: string; name: string }[];
}

export interface OptionsActions {
	setPreset(id: string): void;
	setVolume(bus: VolumeBus, percent: number): void;
	setScreenShake(on: boolean): void;
	setGameSpeed(speed: number): void;
	setTelemetry(on: boolean): void;
	setBrightness(percent: number): void;
	setContrast(percent: number): void;
	setColorblind(mode: string): void;
	setFlashReduction(on: boolean): void;
	setUiScale(percent: number): void;
	setGore(full: boolean): void;
	setSubtitles(on: boolean): void;
	/** Tries to bind `code` to `action`; the answer says why not (conflict, reserved, invalid). */
	setKey(action: KeyAction, code: string): KeyCheck;
	resetKeys(): void;
	/** Tries to bind a gamepad `button` to `action`. */
	setPadButton(action: PadAction, button: number): PadCheck;
	resetPad(): void;
	setLocale(id: string): void;
	close(): void;
}

export interface OptionsProps {
	view: OptionsViewModel;
	actions: OptionsActions;
	/** The pad read while a button is being captured; defaults to the first connected one (injected in tests). */
	getPad?: (() => { buttons: readonly { pressed: boolean }[] } | null | undefined) | undefined;
}

const SELECT = "min-h-12 border-2 border-mist bg-night-2 px-2 font-body text-sm text-bone focus:border-ember";

/** Video, audio, gameplay and language (A-01-01); the host saves every change as it happens. */
export function Options({ view, actions, getPad }: OptionsProps): JSX.Element {
	const [capturing, setCapturing] = useState<KeyAction | null>(null);
	const [problem, setProblem] = useState("");

	const [padCapturing, setPadCapturing] = useState<PadAction | null>(null);

	useEffect(() => {
		if (!padCapturing) return;
		const read = (): { buttons: readonly { pressed: boolean }[] } | null | undefined => {
			if (getPad) return getPad();
			const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
			for (const candidate of pads) if (candidate?.connected) return candidate;
			return null;
		};
		// Buttons already down when the capture starts (the A that clicked the row) do not count until released.
		const held = new Set<number>();
		read()?.buttons.forEach((b, i) => {
			if (b.pressed) held.add(i);
		});
		const onKey = (event: KeyboardEvent): void => {
			if (event.code !== "Escape") return;
			event.preventDefault();
			event.stopPropagation();
			setPadCapturing(null);
		};
		window.addEventListener("keydown", onKey, true);
		let frame = 0;
		const tick = (): void => {
			frame = requestAnimationFrame(tick);
			const pad = read();
			if (!pad) return;
			for (let i = 0; i < pad.buttons.length; i++) {
				const down = pad.buttons[i]?.pressed === true;
				if (!down) {
					held.delete(i);
				} else if (!held.has(i)) {
					const result = actions.setPadButton(padCapturing, i);
					if (result.ok) {
						setProblem("");
						setPadCapturing(null);
					} else if (result.reason === "conflict") {
						held.add(i);
						setProblem(t("options.keyConflict", { action: t(`options.pad.${result.with}`) }));
					} else {
						held.add(i);
						setProblem(
							t(result.reason === "reserved" ? "options.keyReserved" : "options.keyInvalid"),
						);
					}
					return;
				}
			}
		};
		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("keydown", onKey, true);
		};
	}, [padCapturing, actions, getPad]);

	useEffect(() => {
		if (!capturing) return;
		// Capture phase: the next key press is the new binding, and Esc cancels instead of closing the screen.
		const onKey = (event: KeyboardEvent): void => {
			event.preventDefault();
			event.stopPropagation();
			if (event.code === "Escape" && capturing !== "pause") {
				setCapturing(null);
				return;
			}
			const result = actions.setKey(capturing, event.code);
			if (result.ok) {
				setProblem("");
				setCapturing(null);
			} else if (result.reason === "conflict") {
				setProblem(t("options.keyConflict", { action: t(`options.key.${result.with}`) }));
			} else {
				setProblem(t(result.reason === "reserved" ? "options.keyReserved" : "options.keyInvalid"));
			}
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [capturing, actions]);

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
						<label className="flex min-h-12 items-center gap-2">
							<input
								type="checkbox"
								data-testid="options-telemetry"
								checked={view.telemetry}
								onChange={(event) => actions.setTelemetry(event.target.checked)}
							/>
							{t("options.telemetry")}
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
					<fieldset className="mt-3 flex flex-col gap-2 font-body text-sm text-bone-dark">
						<legend className="font-display text-base text-bone">{t("options.access")}</legend>
						<label className="flex min-h-12 items-center gap-3">
							<span className="w-28">{t("options.brightness")}</span>
							<input
								type="range"
								min={-50}
								max={50}
								step={5}
								data-testid="options-brightness"
								value={view.brightness}
								onChange={(event) => actions.setBrightness(Number(event.target.value))}
								className="flex-1"
							/>
							<span className="w-12 text-right">{view.brightness}%</span>
						</label>
						<label className="flex min-h-12 items-center gap-3">
							<span className="w-28">{t("options.contrast")}</span>
							<input
								type="range"
								min={50}
								max={150}
								step={5}
								data-testid="options-contrast"
								value={view.contrast}
								onChange={(event) => actions.setContrast(Number(event.target.value))}
								className="flex-1"
							/>
							<span className="w-12 text-right">{view.contrast}%</span>
						</label>
						<label className="flex flex-col gap-1">
							{t("options.colorblind")}
							<select
								data-testid="options-colorblind"
								value={view.colorblind}
								onChange={(event) => actions.setColorblind(event.target.value)}
								className={SELECT}
							>
								{COLORBLIND.map((mode) => (
									<option key={mode} value={mode}>
										{t(`options.colorblind.${mode}`)}
									</option>
								))}
							</select>
						</label>
						<label className="flex min-h-12 items-center gap-2">
							<input
								type="checkbox"
								data-testid="options-flash"
								checked={view.flashReduction}
								onChange={(event) => actions.setFlashReduction(event.target.checked)}
							/>
							{t("options.flash")}
						</label>
						<label className="flex flex-col gap-1">
							{t("options.uiScale")}
							<select
								data-testid="options-uiscale"
								value={view.uiScale}
								onChange={(event) => actions.setUiScale(Number(event.target.value))}
								className={SELECT}
							>
								{UI_SCALES.map((scale) => (
									<option key={scale} value={scale}>
										{scale}%
									</option>
								))}
							</select>
						</label>
						<label className="flex min-h-12 items-center gap-2">
							<input
								type="checkbox"
								data-testid="options-gore"
								checked={view.gore}
								onChange={(event) => actions.setGore(event.target.checked)}
							/>
							{t("options.gore")}
						</label>
						<label className="flex min-h-12 items-center gap-2">
							<input
								type="checkbox"
								data-testid="options-subtitles"
								checked={view.subtitles}
								onChange={(event) => actions.setSubtitles(event.target.checked)}
							/>
							{t("options.subtitles")}
						</label>
					</fieldset>
					<fieldset className="mt-3 flex flex-col gap-2 font-body text-sm text-bone-dark">
						<legend className="font-display text-base text-bone">{t("options.controls")}</legend>
						{KEY_ACTIONS.map((action) => (
							<div key={action} className="flex min-h-12 items-center gap-3">
								<span className="flex-1">{t(`options.key.${action}`)}</span>
								<button
									type="button"
									data-testid={`options-key-${action}`}
									aria-label={`${t(`options.key.${action}`)}: ${capturing === action ? t("options.keyPress") : keyLabel(view.keys[action])}`}
									onClick={() => {
										setProblem("");
										setPadCapturing(null);
										setCapturing(action);
									}}
									className="min-h-12 min-w-28 border-2 border-iron-dark bg-night-2 px-3 font-display text-base text-bone hover:border-ember hover:text-ember-light"
								>
									{capturing === action
										? t("options.keyPress")
										: keyLabel(view.keys[action])}
								</button>
							</div>
						))}
						{PAD_ACTIONS.map((action) => (
							<div key={action} className="flex min-h-12 items-center gap-3">
								<span className="flex-1">{t(`options.pad.${action}`)}</span>
								<button
									type="button"
									data-testid={`options-pad-${action}`}
									aria-label={`${t(`options.pad.${action}`)}: ${padCapturing === action ? t("options.padPress") : padButtonName(view.pad[action], view.padStyle)}`}
									onClick={() => {
										setProblem("");
										setCapturing(null);
										setPadCapturing(action);
									}}
									className="min-h-12 min-w-28 border-2 border-iron-dark bg-night-2 px-3 font-display text-base text-bone hover:border-ember hover:text-ember-light"
								>
									{padCapturing === action
										? t("options.padPress")
										: padButtonName(view.pad[action], view.padStyle)}
								</button>
							</div>
						))}
						<p role="status" data-testid="options-key-problem" className="min-h-5 text-danger">
							{problem}
						</p>
						<div>
							<Button
								onClick={() => {
									actions.resetKeys();
									actions.resetPad();
								}}
							>
								{t("options.keysReset")}
							</Button>
						</div>
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
