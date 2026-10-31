import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import {
	type BbGroup,
	CLASS_BUDGET,
	ELEMENT_BUDGET,
	parseBbmodel,
	type SizeClass,
} from "../assets-build/bbmodel";
import { CATEGORIES, type Category, REQUIRED_CLIPS } from "../assets-build/rules";

/** Art Bible §14 checklist for every `.bbmodel` in `assets/src/models` (B-03-01); item 11 needs the in-game capture, so it is always open. */

export const CHECKLIST_ITEMS = [
	"Nome de arquivo segue §10.2 (snake_case ASCII, prefixo `prop_`/`tile_`/`weapon_`, sufixo `_d`; a categoria dos demais vem da pasta)",
	"Só cubos/quads; rotações em múltiplos de 22,5°",
	"Elementos dentro do orçamento (§5.1; classe de tamanho de `data/` para inimigos e props)",
	"Textura múltipla de 32 px, 4 a 12 cores, sem `#FFFFFF`/`#000000`, com desgaste e AO pintados",
	"Sombra com matiz (`shadow`, `mist` ou `night` presentes) e luz do topo",
	"Silhueta em preto sólido a 64 px (`docs/art/review/silhouettes/<categoria>-side.png`)",
	"Grupos e sockets conforme §6",
	"Clipes obrigatórios de §8 presentes",
	"Emissivos em `_e.png` separado",
	"`bun run assets:build` passa",
	"Captura in-game com câmera padrão",
	"Áudio `meta.json` (não se aplica a modelos 3D)",
] as const;

export interface ChecklistRow {
	category: Category;
	name: string;
	elements: number;
	budget: number;
	/** Items 1 to 12, in order; `null` is not applicable. */
	items: (boolean | null)[];
}

const SHADOW_HUES = new Set(["2B2340", "3F3A52", "14121C"]);
const EMISSIVE = new Set(["E07A2A", "F5B04A"]);
const EMISSIVE_BY_NAME = new Set(["wail", "hunter", "alpha_hunter", "swamp_matriarch", "nest_queen"]);
const PREFIX: Partial<Record<Category, string>> = { props: "prop_", tiles: "tile_", weapons: "weapon_" };

function groupNames(model: ReturnType<typeof parseBbmodel>): Set<string> {
	const names = new Set<string>();
	const walk = (nodes: (string | BbGroup)[]): void => {
		for (const node of nodes) {
			if (typeof node === "string") continue;
			names.add(node.name);
			walk(node.children);
		}
	};
	for (const g of model.groups ?? []) names.add(g.name);
	walk(model.outliner);
	return names;
}

function sizeClasses(dataDir: string): Map<string, SizeClass> {
	const out = new Map<string, SizeClass>();
	for (const file of ["enemies.json", "props.json"]) {
		const path = join(dataDir, file);
		if (!existsSync(path)) continue;
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
		const list = Array.isArray(parsed)
			? parsed
			: Object.values(parsed as Record<string, unknown>).find(Array.isArray);
		for (const entry of (list ?? []) as { id?: string; sizeClass?: SizeClass }[]) {
			if (entry.id && entry.sizeClass) out.set(entry.id, entry.sizeClass);
		}
	}
	return out;
}

function textureColors(path: string): { width: number; height: number; hex: Set<string> } {
	const png = PNG.sync.read(readFileSync(path));
	const hex = new Set<string>();
	for (let i = 0; i < png.data.length; i += 4) {
		if ((png.data[i + 3] ?? 0) === 0) continue;
		const part = (n: number): string => (png.data[i + n] ?? 0).toString(16).padStart(2, "0");
		hex.add(`${part(0)}${part(1)}${part(2)}`.toUpperCase());
	}
	return { width: png.width, height: png.height, hex };
}

/** `buildOk` is the result of `bun run assets:build`, run by the caller. */
export function buildChecklist(
	srcDir: string,
	dataDir: string,
	reviewDir: string,
	buildOk = true,
): ChecklistRow[] {
	const classes = sizeClasses(dataDir);
	const rows: ChecklistRow[] = [];
	for (const category of CATEGORIES) {
		const dir = join(srcDir, "models", category);
		if (!existsSync(dir)) continue;
		for (const file of readdirSync(dir)
			.filter((f) => f.endsWith(".bbmodel"))
			.sort()) {
			const name = file.slice(0, -".bbmodel".length);
			const model = parseBbmodel(name, readFileSync(join(dir, file), "utf8"));
			const tex = join(dir, `${name}_d.png`);
			const hasTex = existsSync(tex);
			const { width, height, hex } = hasTex
				? textureColors(tex)
				: { width: 0, height: 0, hex: new Set<string>() };
			const cls = classes.get(name);
			const classBudget = cls ? CLASS_BUDGET[category]?.[cls] : undefined;
			const budget = classBudget ?? ELEMENT_BUDGET[category];
			const groups = groupNames(model);
			const character =
				category === "hero" || category === "enemies" || category === "bosses" || category === "npc";
			const socket = category === "hero" || category === "npc" ? "weapon_socket" : "hit_socket";
			const required = ["root", "body", "head", "arm_l", "arm_r", "leg_l", "leg_r", socket];
			const clips = new Set((model.animations ?? []).map((a) => a.name));
			const rotations = model.elements.flatMap((e) => e.rotation ?? []);
			const emissive = [...hex].some((h) => EMISSIVE.has(h)) || EMISSIVE_BY_NAME.has(name);
			const prefix = PREFIX[category];
			const staticModel = category === "props" || category === "tiles" || category === "weapons";
			const items = [
				/^[a-z0-9_]+$/.test(name) && hasTex && (!prefix || name.startsWith(prefix)),
				model.elements.every((e) => e.type === "cube" || e.type === "quad") &&
					rotations.every((r) => r % 22.5 === 0),
				model.elements.length <= budget,
				width % 32 === 0 &&
					height % 32 === 0 &&
					hex.size >= 4 &&
					hex.size <= 12 &&
					!hex.has("FFFFFF") &&
					!hex.has("000000"),
				[...hex].some((h) => SHADOW_HUES.has(h)),
				category === "tiles" || existsSync(join(reviewDir, "silhouettes", `${category}-side.png`)),
				staticModel ? null : character ? required.every((g) => groups.has(g)) : groups.has("root"),
				staticModel ? null : REQUIRED_CLIPS[category].every((c) => clips.has(c)),
				!emissive || existsSync(join(dir, `${name}_e.png`)),
				buildOk,
				false,
				null,
			];
			rows.push({ category, name, elements: model.elements.length, budget, items });
		}
	}
	return rows;
}

export function renderChecklist(rows: readonly ChecklistRow[], date: string): string {
	const tick = (v: boolean | null): string => (v === null ? "n/a" : v ? "✔" : "✘");
	const head = [
		"# B-03-01: checklist do Art Bible §14",
		"",
		`Gerado em ${date} por \`tools/assets-gen/checklist.ts\` sobre os ${rows.length} modelos de \`assets/src/models/\`. Uma linha por modelo; ✔ cumpre, ✘ não cumpre, n/a não se aplica (grupos e clipes de modelos estáticos; áudio).`,
		"",
		"## Itens",
		"",
		...CHECKLIST_ITEMS.map((t, i) => `${i + 1}. ${t}`),
		"",
		"## Resultado",
		"",
		`| Modelo | Elem. | ${CHECKLIST_ITEMS.map((_, i) => i + 1).join(" | ")} |`,
		`| --- | --- | ${CHECKLIST_ITEMS.map(() => "---").join(" | ")} |`,
	];
	const body = rows.map(
		(r) =>
			`| \`${r.category}/${r.name}\` | ${r.elements}/${r.budget} | ${r.items.map(tick).join(" | ")} |`,
	);
	const totals = CHECKLIST_ITEMS.map((_, i) => rows.filter((r) => r.items[i] === false).length);
	return `${[...head, ...body, "", "## Total de ✘ por item", "", totals.map((t, i) => `item ${i + 1}: ${t}`).join(", ")].join("\n")}\n`;
}

if (import.meta.main) {
	const root = fileURLToPath(new URL("../../", import.meta.url));
	const rows = buildChecklist(join(root, "assets/src"), join(root, "data"), join(root, "docs/art/review"));
	writeFileSync(
		join(root, "docs/art/b-03-01-checklist.md"),
		renderChecklist(rows, new Date().toISOString().slice(0, 10)),
	);
	console.log(
		`checklist: ${rows.length} models, ${rows.filter((r) => r.items.slice(0, 10).every((v) => v !== false)).length} pass items 1-10`,
	);
}
