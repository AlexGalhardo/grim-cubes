import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PauseMenu } from "./PauseMenu";

afterEach(cleanup);

const actions = () => ({ resume: vi.fn(), options: vi.fn(), quit: vi.fn() });

test("Continuar and Opções call their actions and Continuar has the focus", () => {
	const a = actions();
	render(<PauseMenu view={{ round: 4 }} actions={a} />);
	expect(document.activeElement).toBe(screen.getByTestId("pause-resume"));
	fireEvent.click(screen.getByRole("button", { name: "Opções" }));
	fireEvent.click(screen.getByTestId("pause-resume"));
	expect(a.options).toHaveBeenCalledTimes(1);
	expect(a.resume).toHaveBeenCalledTimes(1);
});

test("leaving asks first, names the saved round, defaults to staying, and Esc backs out of the question", () => {
	const a = actions();
	render(<PauseMenu view={{ round: 4 }} actions={a} />);
	fireEvent.click(screen.getByRole("button", { name: "Sair para o menu" }));
	expect(screen.getByTestId("pause-confirm").textContent).toContain("round 4");
	expect(document.activeElement).toBe(screen.getByTestId("pause-stay"));
	expect(a.quit).not.toHaveBeenCalled();
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(screen.queryByTestId("pause-confirm")).toBeNull();
	expect(a.resume).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Sair para o menu" }));
	fireEvent.click(screen.getByRole("button", { name: "Sair" }));
	expect(a.quit).toHaveBeenCalledTimes(1);
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(a.resume).toHaveBeenCalledTimes(1);
});
