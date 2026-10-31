import type { VirtualStick } from "@gc/core";
import { type JSX, type PointerEvent, useRef } from "react";

const BASE = 96;
const KNOB = 40;

/**
 * Floating joystick for touch screens (Art Bible 16.5). It writes straight into the stick and moves its
 * two elements imperatively, so a drag never goes through React state (SDD 07 section 4).
 */
export function VirtualJoystick({ stick }: { stick: VirtualStick }): JSX.Element {
	const region = useRef<HTMLDivElement>(null);
	const base = useRef<HTMLDivElement>(null);
	const knob = useRef<HTMLDivElement>(null);

	const draw = (): void => {
		const area = region.current?.getBoundingClientRect();
		if (!area || !base.current || !knob.current) return;
		const cx = stick.originX - area.left;
		const cy = stick.originY - area.top;
		base.current.style.transform = `translate(${cx - BASE / 2}px, ${cy - BASE / 2}px)`;
		knob.current.style.transform = `translate(${cx + stick.knobX - KNOB / 2}px, ${cy + stick.knobY - KNOB / 2}px)`;
		const shown = stick.active ? "block" : "none";
		base.current.style.display = shown;
		knob.current.style.display = shown;
	};

	const onDown = (e: PointerEvent<HTMLDivElement>): void => {
		e.currentTarget.setPointerCapture?.(e.pointerId);
		stick.down(e.pointerId, e.clientX, e.clientY);
		draw();
	};
	const onMove = (e: PointerEvent<HTMLDivElement>): void => {
		stick.move(e.pointerId, e.clientX, e.clientY);
		draw();
	};
	const onUp = (e: PointerEvent<HTMLDivElement>): void => {
		stick.up(e.pointerId);
		draw();
	};

	return (
		<div
			ref={region}
			data-testid="joystick-region"
			className="pointer-events-auto absolute bottom-0 left-0 h-2/3 w-1/2 touch-none"
			onPointerDown={onDown}
			onPointerMove={onMove}
			onPointerUp={onUp}
			onPointerCancel={onUp}
		>
			<div ref={base} className="absolute hidden size-24 border-2 border-iron-dark bg-iron/50" />
			<div ref={knob} className="absolute hidden size-10 bg-bone" />
		</div>
	);
}
