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
