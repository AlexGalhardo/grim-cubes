import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "../../package.json" with { type: "json" };

const targets = { "web-demo": "web", electron: "electron", android: "android" } as const;

export default defineConfig(({ mode }) => ({
	root: import.meta.dirname,
	plugins: [react(), tailwindcss()],
	assetsInclude: ["**/*.glb", "**/*.ktx2"],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__BUILD_TARGET__: JSON.stringify(targets[mode as keyof typeof targets] ?? "web"),
		__IS_DEMO__: JSON.stringify(mode === "web-demo"),
		// Cheats and probes never ship: the debug API exists only in builds made with GC_DEBUG_API=1 (SDD 11 section 2).
		__DEBUG_API__: JSON.stringify(process.env.GC_DEBUG_API === "1"),
	},
	server: { port: 5173, strictPort: true },
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
		rolldownOptions: {
			output: {
				manualChunks(id: string): string | undefined {
					if (id.includes("node_modules/@babylonjs")) return "babylon";
					if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
					return undefined;
				},
			},
		},
	},
}));
