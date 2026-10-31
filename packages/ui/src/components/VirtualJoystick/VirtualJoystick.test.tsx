import { createVirtualStick } from "@gc/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { VirtualJoystick } from "./VirtualJoystick";

afterEach(cleanup);

test("dragging the region moves the stick and releasing zeroes it", () => {
	const stick = createVirtualStick(48);
	render(<VirtualJoystick stick={stick} />);
	const region = screen.getByTestId("joystick-region");

	fireEvent.pointerDown(region, { pointerId: 1, clientX: 100, clientY: 200 });
	expect(stick.active).toBe(true);
	fireEvent.pointerMove(region, { pointerId: 1, clientX: 148, clientY: 200 });
	expect(stick.x).toBeCloseTo(1);
	fireEvent.pointerMove(region, { pointerId: 1, clientX: 100, clientY: 152 });
	expect(stick.z).toBeCloseTo(1);
	fireEvent.pointerUp(region, { pointerId: 1 });
	expect([stick.x, stick.z, stick.active]).toEqual([0, 0, false]);
});
