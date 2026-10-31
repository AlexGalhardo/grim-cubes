/**
 * In a left-handed scene the glTF loader parents every model under a `__root__` that mirrors X. A thin-instance
 * matrix is multiplied by the base mesh's world matrix, so an instance placed at world x would appear at -x.
 * Conjugating by that mirror (F * M * F, F = diag(-1, 1, 1)) negates x and the yaw, and leaves z untouched.
 * Use these for every thin instance whose base mesh came from the glTF loader (horde, `.glb` props).
 */
export function toLoaderLocalX(x: number): number {
	return -x;
}

export function toLoaderLocalYaw(yaw: number): number {
	return -yaw;
}
