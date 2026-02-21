import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init } from "ghostty-web";
import "./index.css";
import "./rpc";
import App from "./App";

// Apply saved theme before React mounts
const savedTheme = localStorage.getItem("dev3-theme") || "dark";
document.documentElement.dataset.theme = savedTheme;

async function bootstrap() {
	await init();
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}

bootstrap();
