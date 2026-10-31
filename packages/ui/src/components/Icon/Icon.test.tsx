import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { Icon } from "./Icon";

afterEach(cleanup);

test("cuts the icon rectangle out of the atlas at the requested size", () => {
	render(
		<Icon
			icon={{
				url: "/assets/atlas_vfx_ui.png",
				x: 32,
				y: 64,
				w: 16,
				h: 16,
				atlasWidth: 256,
				atlasHeight: 256,
			}}
			size={32}
		/>,
	);
	const node = screen.getByTestId("icon");
	expect(node.style.width).toBe("32px");
	expect(node.style.height).toBe("32px");
	expect(node.style.backgroundSize).toBe("512px 512px");
	expect(node.style.backgroundPosition).toBe("-64px -128px");
	expect(node.style.backgroundImage).toContain("atlas_vfx_ui.png");
	expect(node.getAttribute("aria-hidden")).toBe("true");
});
