import { expect, test } from "vitest";
import { buildIco, pngSize } from "./ico";

/** A header-only PNG of the given size: enough for the packer, which never decodes pixels. */
function fakePng(width: number, height: number, extra = 3): Uint8Array {
	const png = new Uint8Array(24 + extra);
	png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const view = new DataView(png.buffer);
	view.setUint32(16, width);
	view.setUint32(20, height);
	return png;
}

test("the size comes from the PNG header and a non-PNG is refused", () => {
	expect(pngSize(fakePng(48, 32))).toEqual({ width: 48, height: 32 });
	expect(() => pngSize(new Uint8Array(40))).toThrow(RangeError);
});

test("an ico holds a directory entry per image, with sizes, lengths and offsets", () => {
	const images = [fakePng(16, 16, 1), fakePng(32, 32, 2), fakePng(256, 256, 4)];
	const ico = buildIco(images);
	const view = new DataView(ico.buffer);
	expect(view.getUint16(0, true)).toBe(0);
	expect(view.getUint16(2, true)).toBe(1);
	expect(view.getUint16(4, true)).toBe(3);
	const widths = [0, 1, 2].map((i) => ico[6 + 16 * i]);
	expect(widths).toEqual([16, 32, 0]);
	let offset = 6 + 16 * 3;
	for (const [i, png] of images.entries()) {
		const entry = 6 + 16 * i;
		expect(view.getUint32(entry + 8, true)).toBe(png.length);
		expect(view.getUint32(entry + 12, true)).toBe(offset);
		expect(Array.from(ico.slice(offset, offset + png.length))).toEqual(Array.from(png));
		offset += png.length;
	}
	expect(ico.length).toBe(offset);
});

test("an empty icon is refused", () => {
	expect(() => buildIco([])).toThrow(RangeError);
});
