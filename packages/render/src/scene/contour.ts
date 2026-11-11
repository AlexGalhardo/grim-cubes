import type { Material } from "@babylonjs/core/Materials/material";
import type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { RenderData } from "@gc/game";
import { paletteHex } from "./palette";

export type ContourConfig = RenderData["contour"];
export type ContourRole = "hero" | "enemy" | "boss";

/** Role codes the horde renderer writes in the alpha of the instance colour; a rig material has no instance colour. */
export const CONTOUR_ENEMY = 1;
export const CONTOUR_ELITE = 2;
export const CONTOUR_BOSS = 3;

const PLUGIN_NAME = "Contour";

/**
 * Per-role contour light (S-01-02): a Fresnel term added to the lit colour of the atlas material, so it costs no mesh,
 * draw call or pass. The role colour is a uniform on the hero and boss materials; on the shared enemy material the
 * horde renderer picks enemy, elite or boss per instance through the alpha of the instance colour.
 */
class ContourPlugin extends MaterialPluginBase {
	private on = true;
	private readonly colors: { base: Color3; elite: Color3; boss: Color3 };

	constructor(
		material: Material,
		private readonly config: ContourConfig,
		role: ContourRole,
	) {
		super(material, PLUGIN_NAME, 200, { CONTOUR: false }, true, true);
		const color = (token: string): Color3 => Color3.FromHexString(paletteHex(token));
		this.colors = {
			base: color(config[role]),
			elite: color(config.elite),
			boss: color(config.boss),
		};
	}

	override getClassName(): string {
		return "ContourPlugin";
	}

	get enabled(): boolean {
		return this.on;
	}

	set enabled(value: boolean) {
		if (this.on === value) return;
		this.on = value;
		this.markAllDefinesAsDirty();
	}

	override prepareDefines(defines: MaterialDefines): void {
		defines.CONTOUR = this.on;
	}

	override getUniforms(): { ubo: { name: string; size: number; type: string }[]; fragment: string } {
		return {
			ubo: [
				{ name: "contourBase", size: 3, type: "vec3" },
				{ name: "contourElite", size: 3, type: "vec3" },
				{ name: "contourBoss", size: 3, type: "vec3" },
				{ name: "contourParams", size: 2, type: "vec2" },
			],
			fragment: `#ifdef CONTOUR
uniform vec3 contourBase;
uniform vec3 contourElite;
uniform vec3 contourBoss;
uniform vec2 contourParams;
#endif`,
		};
	}

	override bindForSubMesh(uniformBuffer: UniformBuffer, _scene: Scene): void {
		if (!this.on) return;
		uniformBuffer.updateColor3("contourBase", this.colors.base);
		uniformBuffer.updateColor3("contourElite", this.colors.elite);
		uniformBuffer.updateColor3("contourBoss", this.colors.boss);
		uniformBuffer.updateFloat2("contourParams", this.config.strength, this.config.power);
	}

	override getCustomCode(shaderType: string): { [point: string]: string } | null {
		if (shaderType !== "fragment") return null;
		return {
			CUSTOM_FRAGMENT_BEFORE_FOG: `#ifdef CONTOUR
vec3 contourTint = contourBase;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
contourTint = vColor.a > 2.5 ? contourBoss : (vColor.a > 1.5 ? contourElite : contourBase);
#endif
color.rgb += contourTint * pow(1.0 - clamp(dot(normalW, viewDirectionW), 0.0, 1.0), contourParams.y) * contourParams.x;
#endif`,
		};
	}
}

/** Adds the contour to a material; the colour of `role` is its base, elites and bosses override it per instance. */
export function addContour(material: Material, config: ContourConfig, role: ContourRole): void {
	new ContourPlugin(material, config, role);
}

/** Switches the contour on or off on every material of the scene that has it (the "Minimo" preset drops it). */
export function setContour(scene: Scene, on: boolean): void {
	for (const material of scene.materials) {
		const plugin = material.pluginManager?.getPlugin<ContourPlugin>(PLUGIN_NAME);
		if (plugin) plugin.enabled = on;
	}
}
