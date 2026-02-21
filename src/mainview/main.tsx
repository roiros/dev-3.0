import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init } from "ghostty-web";
import "./index.css";
import "./rpc";
import App from "./App";
import { I18nProvider } from "./i18n";

// Apply saved theme before React mounts
const savedTheme = localStorage.getItem("dev3-theme") || "dark";
document.documentElement.dataset.theme = savedTheme;

// Apply saved locale before React mounts
const savedLocale = localStorage.getItem("dev3-locale") || "en";
document.documentElement.lang = savedLocale;

async function bootstrap() {
	await init();
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<I18nProvider>
				<App />
			</I18nProvider>
		</StrictMode>,
	);
}

bootstrap();
