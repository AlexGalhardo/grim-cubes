import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { Notice, noticeText } from "./Notice";

afterEach(cleanup);

test("each save notice has its own readable message", () => {
	const texts = (["newer", "recovered", "corrupt", "unavailable"] as const).map(noticeText);
	expect(new Set(texts).size).toBe(4);
	render(<Notice notice="newer" />);
	expect(screen.getByRole("alert").textContent).toContain("versão mais nova");
});
