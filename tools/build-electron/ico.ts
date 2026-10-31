/**
 * Packs PNG images into a Windows `.ico` (the format allows PNG data inside an entry since Vista): a 6 byte header,
 * a 16 byte directory entry per image, then the images. No dependency; the sizes are read from the PNG headers.
 */
export function pngSize(png: Uint8Array): { width: number; height: number } {
	const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (png.length < 24 || signature.some((byte, i) => png[i] !== byte))
		throw new RangeError("not a PNG file");
	const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
	return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function buildIco(pngs: readonly Uint8Array[]): Uint8Array {
	if (pngs.length === 0) throw new RangeError("an icon needs at least one image");
	const sizes = pngs.map(pngSize);
	const header = 6 + 16 * pngs.length;
	const total = header + pngs.reduce((sum, png) => sum + png.length, 0);
	const out = new Uint8Array(total);
	const view = new DataView(out.buffer);
	view.setUint16(2, 1, true); // type: icon
	view.setUint16(4, pngs.length, true);
	let offset = header;
	pngs.forEach((png, i) => {
		const size = sizes[i];
		if (!size) return;
		const entry = 6 + 16 * i;
		// 0 means 256 in the width and height bytes.
		out[entry] = size.width >= 256 ? 0 : size.width;
		out[entry + 1] = size.height >= 256 ? 0 : size.height;
		view.setUint16(entry + 4, 1, true); // colour planes
		view.setUint16(entry + 6, 32, true); // bits per pixel
		view.setUint32(entry + 8, png.length, true);
		view.setUint32(entry + 12, offset, true);
		out.set(png, offset);
		offset += png.length;
	});
	return out;
}
