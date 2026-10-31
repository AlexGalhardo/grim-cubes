import { join, normalize, sep } from "node:path";

/** Maps an `app://game/<path>` pathname to a file under `root`; null when it would leave the folder. */
export function resolveAppPath(urlPath: string, root: string): string | null {
	const relative = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
	const file = normalize(join(root, relative));
	return file === root || file.startsWith(root + sep) ? file : null;
}
