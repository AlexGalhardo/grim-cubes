import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Bar } from "./Bar/Bar";
import { Button } from "./Button/Button";
import { Panel } from "./Panel/Panel";

afterEach(cleanup);

test("Panel renders its title and children", () => {
	render(
		<Panel title="Shop" riveted>
			<p>Bone dust</p>
		</Panel>,
	);
	expect(screen.getByRole("heading", { name: "Shop" })).toBeTruthy();
	expect(screen.getByText("Bone dust")).toBeTruthy();
});

test("Button calls onClick unless disabled", () => {
	const onClick = vi.fn();
	const { rerender } = render(<Button onClick={onClick}>Buy</Button>);
	fireEvent.click(screen.getByRole("button", { name: "Buy" }));
	expect(onClick).toHaveBeenCalledTimes(1);
	rerender(
		<Button onClick={onClick} disabled>
			Buy
		</Button>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Buy" }));
	expect(onClick).toHaveBeenCalledTimes(1);
});

test("Bar clamps its value, exposes progressbar semantics and pulses when HP is low", () => {
	const { rerender } = render(<Bar value={150} max={100} label="HP" />);
	const bar = screen.getByRole("progressbar", { name: "HP" });
	expect(bar.getAttribute("aria-valuenow")).toBe("100");
	expect(bar.querySelector('[data-low="true"]')).toBeNull();
	rerender(<Bar value={10} max={100} label="HP" />);
	expect(screen.getByRole("progressbar").querySelector('[data-low="true"]')).not.toBeNull();
	rerender(<Bar value={10} max={100} variant="xp" label="XP" />);
	expect(screen.getByRole("progressbar").querySelector('[data-low="true"]')).toBeNull();
});
