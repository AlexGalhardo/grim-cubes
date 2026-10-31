import type { JSONDocument } from "@gltf-transform/core";

const MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function pad4(length: number): number {
	return (length + 3) & ~3;
}

/**
 * Packs a JSONDocument into a GLB without going through Document, so extensions the core io does not
 * know (KHR_materials_unlit) survive. Supports the single-buffer layout the pipeline requires.
 */
export function packGlb(doc: JSONDocument): Uint8Array {
	const json = structuredClone(doc.json);
	const buffer = json.buffers?.[0];
	const uri = buffer?.uri;
	const bin = uri ? doc.resources[uri] : undefined;
	if (buffer) delete buffer.uri;
	const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
	const jsonLength = pad4(jsonBytes.length);
	const binLength = bin ? pad4(bin.length) : 0;
	const total = 12 + 8 + jsonLength + (bin ? 8 + binLength : 0);
	const out = new Uint8Array(total);
	const view = new DataView(out.buffer);
	view.setUint32(0, MAGIC, true);
	view.setUint32(4, 2, true);
	view.setUint32(8, total, true);
	view.setUint32(12, jsonLength, true);
	view.setUint32(16, CHUNK_JSON, true);
	out.set(jsonBytes, 20);
	out.fill(0x20, 20 + jsonBytes.length, 20 + jsonLength);
	if (bin) {
		const offset = 20 + jsonLength;
		view.setUint32(offset, binLength, true);
		view.setUint32(offset + 4, CHUNK_BIN, true);
		out.set(bin, offset + 8);
	}
	return out;
}
