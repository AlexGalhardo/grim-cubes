import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
