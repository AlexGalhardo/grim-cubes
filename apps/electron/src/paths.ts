import { join, normalize, sep } from "node:path";

/** Maps an `app://game/<path>` pathname to a file under `root`; null when it would leave the folder. */
export function resolveAppPath(urlPath: string, root: string): string | null {
	let relative: string;
	try {
		relative = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
	} catch {
		// A malformed escape such as "%E0%A4%A" is not a file of ours.
		return null;
	}
	const file = normalize(join(root, relative));
	return file === root || file.startsWith(root + sep) ? file : null;
}
