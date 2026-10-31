import { createKeyMap, createPadMap, type KeyCheck, type PadCheck } from "@gc/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Options, type OptionsActions, type OptionsViewModel } from "./Options";

afterEach(cleanup);

const view: OptionsViewModel = {
	preset: "auto",
	presets: [
		{ id: "high", name: "Alto" },
		{ id: "low", name: "Baixo" },
	],
	volume: { master: 100, music: 70, sfx: 100 },
	screenShake: true,
	gameSpeed: 1,
	telemetry: false,
	brightness: 0,
	contrast: 100,
	colorblind: "off",
	flashReduction: false,
	uiScale: 100,
	gore: true,
	keys: createKeyMap(),
	pad: createPadMap(),
	locale: "pt-BR",
	locales: [
		{ id: "pt-BR", name: "Português" },
		{ id: "en", name: "English" },
	],
};

const actions = (): OptionsActions => ({
	setPreset: vi.fn(),
	setVolume: vi.fn(),
	setScreenShake: vi.fn(),
	setGameSpeed: vi.fn(),
	setTelemetry: vi.fn(),
	setBrightness: vi.fn(),
	setContrast: vi.fn(),
	setColorblind: vi.fn(),
	setFlashReduction: vi.fn(),
	setUiScale: vi.fn(),
	setGore: vi.fn(),
	setKey: vi.fn(() => ({ ok: true }) as KeyCheck),
	resetKeys: vi.fn(),
	setPadButton: vi.fn(() => ({ ok: true }) as PadCheck),
	resetPad: vi.fn(),
	setLocale: vi.fn(),
	close: vi.fn(),
});

test("each control reports its change", () => {
	const a = actions();
	render(<Options view={view} actions={a} />);
	fireEvent.change(screen.getByTestId("options-preset"), { target: { value: "low" } });
	expect(a.setPreset).toHaveBeenCalledWith("low");
	fireEvent.change(screen.getByTestId("options-volume-music"), { target: { value: "30" } });
	expect(a.setVolume).toHaveBeenCalledWith("music", 30);
	fireEvent.click(screen.getByTestId("options-shake"));
	expect(a.setScreenShake).toHaveBeenCalledWith(false);
	fireEvent.click(screen.getByTestId("options-telemetry"));
	expect(a.setTelemetry).toHaveBeenCalledWith(true);
	fireEvent.change(screen.getByTestId("options-speed"), { target: { value: "3" } });
	expect(a.setGameSpeed).toHaveBeenCalledWith(3);
	fireEvent.change(screen.getByTestId("options-locale"), { target: { value: "en" } });
	expect(a.setLocale).toHaveBeenCalledWith("en");
});

test("the dialog shows the current values and closes", () => {
	const a = actions();
	render(<Options view={view} actions={a} />);
	expect((screen.getByTestId("options-preset") as HTMLSelectElement).value).toBe("auto");
	expect((screen.getByTestId("options-volume-master") as HTMLInputElement).value).toBe("100");
	expect(screen.getByRole("dialog")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
	expect(a.close).toHaveBeenCalledTimes(1);
});

test("the accessibility section reports brightness, contrast, colour-blind mode, flashes, scale and gore", () => {
	const a = actions();
	render(<Options view={view} actions={a} />);
	fireEvent.change(screen.getByTestId("options-brightness"), { target: { value: "-20" } });
	expect(a.setBrightness).toHaveBeenCalledWith(-20);
	fireEvent.change(screen.getByTestId("options-contrast"), { target: { value: "130" } });
	expect(a.setContrast).toHaveBeenCalledWith(130);
	fireEvent.change(screen.getByTestId("options-colorblind"), { target: { value: "deuteranopia" } });
	expect(a.setColorblind).toHaveBeenCalledWith("deuteranopia");
	fireEvent.click(screen.getByTestId("options-flash"));
	expect(a.setFlashReduction).toHaveBeenCalledWith(true);
	fireEvent.change(screen.getByTestId("options-uiscale"), { target: { value: "125" } });
	expect(a.setUiScale).toHaveBeenCalledWith(125);
	fireEvent.click(screen.getByTestId("options-gore"));
	expect(a.setGore).toHaveBeenCalledWith(false);
	expect((screen.getByTestId("options-colorblind") as HTMLSelectElement).value).toBe("off");
	expect(
		Array.from((screen.getByTestId("options-uiscale") as HTMLSelectElement).options).map((o) => o.value),
	).toEqual(["90", "100", "125", "150"]);
});

test("the controls list the keys, a pressed key is sent to setKey and a conflict is explained", () => {
	const a = actions();
	render(<Options view={view} actions={a} />);
	expect(screen.getByTestId("options-key-up").textContent).toBe("W");
	expect(screen.getByTestId("options-key-dash").textContent).toBe("Space");
	fireEvent.click(screen.getByTestId("options-key-dash"));
	expect(screen.getByTestId("options-key-dash").textContent).toBe("Pressione uma tecla...");
	fireEvent.keyDown(window, { code: "KeyE" });
	expect(a.setKey).toHaveBeenCalledWith("dash", "KeyE");
	expect(screen.getByTestId("options-key-dash").textContent).toBe("Space");

	vi.mocked(a.setKey).mockReturnValueOnce({ ok: false, reason: "conflict", with: "up" });
	fireEvent.click(screen.getByTestId("options-key-reroll"));
	fireEvent.keyDown(window, { code: "KeyW" });
	expect(screen.getByTestId("options-key-problem").textContent).toBe(
		"Essa tecla já é usada por Mover para cima",
	);
	expect(screen.getByTestId("options-key-reroll").textContent).toBe("Pressione uma tecla...");

	vi.mocked(a.setKey).mockReturnValueOnce({ ok: false, reason: "reserved" });
	fireEvent.keyDown(window, { code: "Enter" });
	expect(screen.getByTestId("options-key-problem").textContent).toBe("Essa tecla é reservada");

	fireEvent.keyDown(window, { code: "Escape" });
	expect(screen.getByTestId("options-key-reroll").textContent).toBe("R");
	fireEvent.click(screen.getByRole("button", { name: "Restaurar teclas padrão" }));
	expect(a.resetKeys).toHaveBeenCalledTimes(1);
});

test("Esc while capturing cancels the capture and does not close the screen", () => {
	const a = actions();
	render(<Options view={view} actions={a} />);
	fireEvent.click(screen.getByTestId("options-key-speed"));
	fireEvent.keyDown(window, { code: "Escape" });
	expect(a.close).not.toHaveBeenCalled();
	expect(a.setKey).not.toHaveBeenCalled();
});

function padWith(pressed: number[]) {
	return { buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i) })) };
}

test("the pad rows show the buttons and capture the next one pressed, ignoring what was already held", () => {
	const frames: FrameRequestCallback[] = [];
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal("cancelAnimationFrame", () => undefined);
	const a = actions();
	let state = padWith([0]);
	render(<Options view={view} actions={a} getPad={() => state} />);
	expect(screen.getByTestId("options-pad-dash").textContent).toBe("A");
	expect(screen.getByTestId("options-pad-pause").textContent).toBe("Start");
	fireEvent.click(screen.getByTestId("options-pad-dash"));
	expect(screen.getByTestId("options-pad-dash").textContent).toBe("Pressione um botão...");
	const tick = (): void => {
		act(() => {
			for (const cb of frames.splice(0)) cb(0);
		});
	};
	// A was down when the capture began: it is not the new binding.
	tick();
	expect(a.setPadButton).not.toHaveBeenCalled();
	state = padWith([]);
	tick();
	state = padWith([2]);
	tick();
	expect(a.setPadButton).toHaveBeenCalledWith("dash", 2);
	expect(screen.getByTestId("options-pad-dash").textContent).toBe("A");
	vi.unstubAllGlobals();
});

test("a refused pad button is explained and the capture goes on", () => {
	const frames: FrameRequestCallback[] = [];
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal("cancelAnimationFrame", () => undefined);
	const a = actions();
	vi.mocked(a.setPadButton).mockReturnValueOnce({ ok: false, reason: "conflict", with: "pause" });
	let state = padWith([]);
	render(<Options view={view} actions={a} getPad={() => state} />);
	fireEvent.click(screen.getByTestId("options-pad-dash"));
	state = padWith([9]);
	act(() => {
		for (const cb of frames.splice(0)) cb(0);
	});
	expect(screen.getByTestId("options-key-problem").textContent).toBe(
		"Essa tecla já é usada por Pausa (botão do controle)",
	);
	expect(screen.getByTestId("options-pad-dash").textContent).toBe("Pressione um botão...");
	fireEvent.keyDown(window, { code: "Escape" });
	expect(screen.getByTestId("options-pad-dash").textContent).toBe("A");
	vi.unstubAllGlobals();
});
