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
import { type JSX, type ReactNode, useEffect, useState } from "react";
import { keyLabel } from "../../keys";
import { useDialogNav } from "../../nav/useDialogNav";
import { LeaveConfirm } from "../LeaveConfirm/LeaveConfirm";

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
	/** Health bars over the hero and over the enemies (render). */
	hpBars?: { hero: boolean; enemies: boolean } | undefined;
	/** Set while a run is in progress: the button back to the title menu shows, and `round` is where the run resumes. */
	leave?: { round: number } | undefined;
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
	setHpBars?: ((part: "hero" | "enemies", on: boolean) => void) | undefined;
	/** Back to the title menu (the run stays saved at the start of its round). */
	toMenu?: (() => void) | undefined;
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

const SELECT =
	"min-h-10 w-full max-w-80 border-2 border-iron bg-linear-to-b from-iron-dark to-iron-black px-2 font-display text-sm text-ember-light focus:border-ember";
/** A riveted iron plate, the frame of every section (same look as the shop). */
const PLATE =
	"panel-riveted border-2 border-iron-dark bg-linear-to-b from-iron-black to-night-2 shadow-[inset_0_1px_0_var(--color-iron),0_4px_10px_var(--color-night)]";
const PRESS =
	"transition-[translate,box-shadow] duration-fast active:translate-y-1 active:shadow-none focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2";
const KEY_CAP = `min-h-9 min-w-14 border-2 border-iron bg-linear-to-b from-iron to-iron-dark px-2 font-display text-sm text-ember-light shadow-[0_3px_0_var(--color-night)] hover:border-ember ${PRESS}`;
const EMBER_BUTTON = `border-2 border-ember-light bg-linear-to-b from-ember to-rust font-display text-night shadow-[0_4px_0_var(--color-mud)] hover:from-ember-light ${PRESS}`;
const IRON_BUTTON = `border-2 border-iron bg-linear-to-b from-iron to-iron-dark font-display text-bone shadow-[0_4px_0_var(--color-night)] hover:border-iron-light ${PRESS}`;

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
	return (
		<section aria-label={title} className={`${PLATE} flex min-w-0 flex-col gap-1.5 p-3 desktop:p-4`}>
			<h2 className="mb-1 border-iron-dark border-b-2 pb-1 font-display text-lg text-bone uppercase desktop:text-xl">
				{title}
			</h2>
			{children}
		</section>
	);
}

/** One row: the label on the left, the control on the right. */
function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
	return (
		<div className="flex min-h-10 items-center justify-between gap-3 font-body text-sm text-bone desktop:text-base">
			<span className="shrink-0">{label}</span>
			<div className="flex min-w-0 flex-1 justify-end">{children}</div>
		</div>
	);
}

interface SegmentedProps<T extends string | number> {
	options: readonly T[];
	value: T;
	label: string;
	format: (option: T) => string;
	onChange: (option: T) => void;
	testId: string;
}

/** Radio-like buttons drawn as a row of iron keys; the chosen one glows ember. */
function Segmented<T extends string | number>({
	options,
	value,
	label,
	format,
	onChange,
	testId,
}: SegmentedProps<T>): JSX.Element {
	return (
		<fieldset
			aria-label={label}
			className="m-0 flex w-full max-w-80 flex-wrap border-0 p-0"
			data-testid={testId}
		>
			{options.map((option) => (
				<button
					key={String(option)}
					type="button"
					aria-pressed={option === value}
					data-testid={`${testId}-${option}`}
					onClick={() => onChange(option)}
					className={`min-h-9 flex-1 border-2 px-1.5 font-display text-sm focus-visible:outline-2 focus-visible:outline-ember ${option === value ? "border-ember-light bg-linear-to-b from-ember to-rust text-night" : "border-iron-dark bg-linear-to-b from-iron-dark to-iron-black text-bone hover:border-iron"}`}
				>
					{format(option)}
				</button>
			))}
		</fieldset>
	);
}

/** A checkbox drawn as an iron switch with an ember knob. */
function Toggle({
	checked,
	onChange,
	label,
	testId,
}: {
	checked: boolean;
	onChange: (on: boolean) => void;
	label: string;
	testId: string;
}): JSX.Element {
	return (
		<label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 font-body text-sm text-bone desktop:text-base">
			<span>{label}</span>
			<input
				type="checkbox"
				role="switch"
				aria-checked={checked}
				data-testid={testId}
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="peer sr-only"
			/>
			<span
				aria-hidden="true"
				className="relative h-6 w-12 shrink-0 rounded-full border-2 border-iron-dark bg-night after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-iron after:transition-[left] after:duration-fast peer-checked:bg-iron-dark peer-checked:after:left-6 peer-checked:after:bg-ember peer-focus-visible:outline-2 peer-focus-visible:outline-ember"
			/>
		</label>
	);
}

function Slider({
	value,
	min,
	max,
	step,
	onChange,
	testId,
	label,
	suffix = "",
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
	testId: string;
	suffix?: string;
}): JSX.Element {
	return (
		<span className="flex w-full max-w-80 items-center gap-3">
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				aria-label={label}
				data-testid={testId}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
				className="flex-1 accent-ember"
			/>
			<span className="w-12 text-right font-display text-ember-light">
				{value}
				{suffix}
			</span>
		</span>
	);
}

/** Video, audio, gameplay and language (A-01-01); the host saves every change as it happens. */
export function Options({ view, actions, getPad }: OptionsProps): JSX.Element {
	const [capturing, setCapturing] = useState<KeyAction | null>(null);
	const [problem, setProblem] = useState("");

	const [padCapturing, setPadCapturing] = useState<PadAction | null>(null);
	const [leaving, setLeaving] = useState(false);

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

	const nav = useDialogNav<HTMLDivElement>({ onCancel: leaving ? () => setLeaving(false) : actions.close });
	const presetIds = ["auto", ...view.presets.map((preset) => preset.id)];
	const presetName = (id: string): string =>
		id === "auto" ? t("options.auto") : (view.presets.find((preset) => preset.id === id)?.name ?? id);
	const keyRow = (action: KeyAction): JSX.Element => (
		<div
			key={action}
			className="flex min-h-9 items-center justify-between gap-2 border-iron-dark border-b font-body text-sm text-bone"
		>
			<span>{t(`options.key.${action}`)}</span>
			<button
				type="button"
				data-testid={`options-key-${action}`}
				aria-label={`${t(`options.key.${action}`)}: ${capturing === action ? t("options.keyPress") : keyLabel(view.keys[action])}`}
				onClick={() => {
					setProblem("");
					setPadCapturing(null);
					setCapturing(action);
				}}
				className={KEY_CAP}
			>
				{capturing === action ? t("options.keyPress") : keyLabel(view.keys[action])}
			</button>
		</div>
	);
	const padRow = (action: PadAction): JSX.Element => (
		<div
			key={action}
			className="flex min-h-9 items-center justify-between gap-2 border-iron-dark border-b font-body text-sm text-bone"
		>
			<span>{t(`options.pad.${action}`)}</span>
			<button
				type="button"
				data-testid={`options-pad-${action}`}
				aria-label={`${t(`options.pad.${action}`)}: ${padCapturing === action ? t("options.padPress") : padButtonName(view.pad[action], view.padStyle)}`}
				onClick={() => {
					setProblem("");
					setCapturing(null);
					setPadCapturing(action);
				}}
				className={KEY_CAP}
			>
				{padCapturing === action
					? t("options.padPress")
					: padButtonName(view.pad[action], view.padStyle)}
			</button>
		</div>
	);
	if (leaving && view.leave && actions.toMenu) {
		return (
			<div
				ref={nav}
				role="dialog"
				aria-modal="true"
				aria-label={t("options.title")}
				className="pointer-events-auto absolute inset-0 z-40 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
			>
				<div className={`${PLATE} m-auto w-full max-w-md p-4`}>
					<LeaveConfirm
						question={t("leave.toMenuSaved", { round: view.leave.round })}
						stayLabel={t("leave.stay")}
						leaveLabel={t("leave.toMenu")}
						onStay={() => setLeaving(false)}
						onLeave={actions.toMenu}
					/>
				</div>
			</div>
		);
	}
	return (
		<div
			ref={nav}
			role="dialog"
			aria-modal="true"
			aria-labelledby="options-title"
			className="pointer-events-auto absolute inset-0 z-40 flex overflow-y-auto bg-night/90 p-2 mobile-l:p-4"
		>
			<div className={`${PLATE} m-auto flex w-full max-w-[1600px] flex-col gap-3 p-3 desktop:p-4`}>
				<div className="flex items-center gap-4">
					<h1
						id="options-title"
						className="font-display text-3xl text-bone uppercase desktop:text-4xl"
					>
						{t("options.title")}
					</h1>
					<div aria-hidden="true" className="h-0.5 flex-1 bg-rust" />
					<button
						type="button"
						aria-label={t("options.close")}
						onClick={actions.close}
						className={`size-10 text-xl ${IRON_BUTTON}`}
					>
						✕
					</button>
				</div>
				<div className="grid grid-cols-1 gap-3 mobile-l:grid-cols-3">
					<div className="flex flex-col gap-3">
						<Section title={t("options.video")}>
							<span className="font-body text-sm text-bone desktop:text-base">
								{t("options.preset")}
							</span>
							<Segmented
								options={presetIds}
								value={view.preset}
								label={t("options.preset")}
								format={presetName}
								onChange={actions.setPreset}
								testId="options-preset"
							/>
						</Section>
						<Section title={t("options.audio")}>
							{BUSES.map((bus) => (
								<Row key={bus} label={t(`options.volume.${bus}`)}>
									<Slider
										value={view.volume[bus]}
										min={0}
										max={100}
										step={5}
										onChange={(value) => actions.setVolume(bus, value)}
										testId={`options-volume-${bus}`}
										label={t(`options.volume.${bus}`)}
									/>
								</Row>
							))}
						</Section>
					</div>
					<div className="flex flex-col gap-3">
						<Section title={t("options.gameplay")}>
							<Row label={t("options.speed")}>
								<Segmented
									options={[1, 2, 3]}
									value={view.gameSpeed}
									label={t("options.speed")}
									format={(speed) => `${speed}x`}
									onChange={actions.setGameSpeed}
									testId="options-speed"
								/>
							</Row>
							<Row label={t("options.language")}>
								<select
									aria-label={t("options.language")}
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
							</Row>
							<Toggle
								checked={view.subtitles}
								onChange={actions.setSubtitles}
								label={t("options.subtitles")}
								testId="options-subtitles"
							/>
							{view.hpBars && actions.setHpBars ? (
								<>
									<Toggle
										checked={view.hpBars.hero}
										onChange={(on) => actions.setHpBars?.("hero", on)}
										label={t("options.hpBarHero")}
										testId="options-hpbar-hero"
									/>
									<Toggle
										checked={view.hpBars.enemies}
										onChange={(on) => actions.setHpBars?.("enemies", on)}
										label={t("options.hpBarEnemies")}
										testId="options-hpbar-enemies"
									/>
								</>
							) : null}
							<Toggle
								checked={view.telemetry}
								onChange={actions.setTelemetry}
								label={t("options.telemetry")}
								testId="options-telemetry"
							/>
						</Section>
						<Section title={t("options.access")}>
							<Row label={t("options.brightness")}>
								<Slider
									value={view.brightness}
									min={-50}
									max={50}
									step={5}
									onChange={actions.setBrightness}
									testId="options-brightness"
									label={t("options.brightness")}
									suffix="%"
								/>
							</Row>
							<Row label={t("options.contrast")}>
								<Slider
									value={view.contrast}
									min={50}
									max={150}
									step={5}
									onChange={actions.setContrast}
									testId="options-contrast"
									label={t("options.contrast")}
									suffix="%"
								/>
							</Row>
							<Row label={t("options.colorblind")}>
								<select
									aria-label={t("options.colorblind")}
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
							</Row>
							<Toggle
								checked={view.flashReduction}
								onChange={actions.setFlashReduction}
								label={t("options.flash")}
								testId="options-flash"
							/>
							<Toggle
								checked={view.screenShake}
								onChange={actions.setScreenShake}
								label={t("options.shake")}
								testId="options-shake"
							/>
							<Row label={t("options.uiScale")}>
								<Segmented
									options={UI_SCALES}
									value={view.uiScale as (typeof UI_SCALES)[number]}
									label={t("options.uiScale")}
									format={(scale) => `${scale}%`}
									onChange={actions.setUiScale}
									testId="options-uiscale"
								/>
							</Row>
							<Toggle
								checked={view.gore}
								onChange={actions.setGore}
								label={t("options.gore")}
								testId="options-gore"
							/>
						</Section>
					</div>
					<Section title={t("options.controls")}>
						<div className="flex flex-col">{KEY_ACTIONS.map(keyRow)}</div>
						<div className="mt-2 flex flex-col">{PAD_ACTIONS.map(padRow)}</div>
						<p
							role="status"
							data-testid="options-key-problem"
							className="min-h-5 font-body text-sm text-danger"
						>
							{problem ? <span aria-hidden="true">⚠ </span> : null}
							{problem}
						</p>
						<button
							type="button"
							onClick={() => {
								actions.resetKeys();
								actions.resetPad();
							}}
							className={`min-h-11 px-4 text-base ${IRON_BUTTON}`}
						>
							{t("options.keysReset")}
						</button>
					</Section>
				</div>
				<div className="flex items-center justify-between gap-3">
					{view.leave && actions.toMenu ? (
						<button
							type="button"
							data-testid="options-to-menu"
							onClick={() => setLeaving(true)}
							className={`min-h-12 px-6 text-lg ${IRON_BUTTON}`}
						>
							{t("menu.toMenu")}
						</button>
					) : (
						<span />
					)}
					<button
						type="button"
						onClick={actions.close}
						className={`min-h-12 min-w-44 px-6 text-xl ${EMBER_BUTTON}`}
					>
						{t("options.close")}
					</button>
				</div>
			</div>
		</div>
	);
}
