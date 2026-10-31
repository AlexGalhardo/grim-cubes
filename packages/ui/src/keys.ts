/** `KeyW` -> "W", `Digit5` -> "5"; other codes (Space, Tab, ArrowUp) read as they are. */
export function keyLabel(code: string): string {
	return code.replace(/^Key|^Digit/, "");
}
