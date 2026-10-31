import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Tip } from "./Tip";

test("shows the translated tip as a status message", () => {
	render(<Tip id="move" />);
	expect(screen.getByRole("status").textContent).toBe("Mova-se com WASD ou arraste o joystick.");
	expect(screen.getByTestId("tip").getAttribute("data-tip")).toBe("move");
});
