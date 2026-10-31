import type { CSSProperties, JSX } from "react";

/** One icon of the `atlas_vfx_ui` atlas: the atlas image and the pixel rectangle of the icon inside it. */
export interface IconRef {
	url: string;
	x: number;
	y: number;
	w: number;
	h: number;
	atlasWidth: number;
	atlasHeight: number;
}

export interface IconProps {
	icon: IconRef;
	/** CSS pixels of the square the icon is drawn in; a whole multiple of the icon size keeps the pixels crisp. */
	size?: number;
}

/** A pixel-art icon cut out of the atlas with CSS only (no extra requests, no canvas). Decorative: the label sits beside it. */
export function Icon({ icon, size = 32 }: IconProps): JSX.Element {
	const scale = size / icon.w;
	const style: CSSProperties = {
		width: size,
		height: (icon.h * size) / icon.w,
		backgroundImage: `url(${icon.url})`,
		backgroundSize: `${icon.atlasWidth * scale}px ${icon.atlasHeight * scale}px`,
		backgroundPosition: `-${icon.x * scale}px -${icon.y * scale}px`,
		backgroundRepeat: "no-repeat",
		imageRendering: "pixelated",
	};
	return <span aria-hidden="true" data-testid="icon" className="inline-block shrink-0" style={style} />;
}
