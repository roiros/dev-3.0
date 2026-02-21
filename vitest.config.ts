import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	test: {
		root: "src/mainview",
		environment: "happy-dom",
		globals: true,
		setupFiles: ["./test-setup.ts"],
	},
});
