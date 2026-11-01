import type { CapacitorConfig } from "@capacitor/cli";

// Local assets only. `webDir` is the Vite output at the repo root (`dist/`).
const config: CapacitorConfig = {
	appId: "com.alexgalhardo.grimcubes",
	appName: "Grim Cubes",
	webDir: "../../dist",
	android: {
		allowMixedContent: false,
		backgroundColor: "#14121C",
	},
};

export default config;
