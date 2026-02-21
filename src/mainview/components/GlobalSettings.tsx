import { useState } from "react";

type Theme = "dark" | "light";

function GlobalSettings() {
	const [theme, setTheme] = useState<Theme>(
		() => (localStorage.getItem("dev3-theme") as Theme) || "dark",
	);

	function applyTheme(t: Theme) {
		setTheme(t);
		document.documentElement.dataset.theme = t;
		localStorage.setItem("dev3-theme", t);
	}

	return (
		<div className="h-full w-full flex flex-col bg-base">
			<div className="flex-1 overflow-y-auto p-7">
				<div className="max-w-xl">
					{/* Theme */}
					<div>
						<label className="block text-fg text-sm font-semibold mb-3">
							Theme
						</label>
						<div className="flex gap-3">
							<ThemeCard
								name="Dark"
								description="Midnight indigo"
								active={theme === "dark"}
								onClick={() => applyTheme("dark")}
								preview={{
									bg: "#171924",
									raised: "#1e2133",
									text: "#eceef8",
									accent: "#5e9eff",
								}}
							/>
							<ThemeCard
								name="Light"
								description="Clean & bright"
								active={theme === "light"}
								onClick={() => applyTheme("light")}
								preview={{
									bg: "#f5f6fa",
									raised: "#ffffff",
									text: "#1a1d2e",
									accent: "#5e9eff",
								}}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ThemeCard({
	name,
	description,
	active,
	onClick,
	preview,
}: {
	name: string;
	description: string;
	active: boolean;
	onClick: () => void;
	preview: { bg: string; raised: string; text: string; accent: string };
}) {
	return (
		<button
			onClick={onClick}
			className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
				active
					? "border-accent shadow-lg shadow-accent/10"
					: "border-edge hover:border-edge-active"
			}`}
		>
			{/* Mini preview */}
			<div
				className="w-full h-20 rounded-lg mb-3 p-3 flex flex-col justify-between"
				style={{ background: preview.bg }}
			>
				<div className="flex items-center gap-2">
					<div
						className="w-2 h-2 rounded-full"
						style={{ background: preview.accent }}
					/>
					<div
						className="h-1.5 w-12 rounded-full opacity-60"
						style={{ background: preview.text }}
					/>
				</div>
				<div className="flex gap-1.5">
					<div
						className="h-6 flex-1 rounded"
						style={{ background: preview.raised }}
					/>
					<div
						className="h-6 flex-1 rounded"
						style={{ background: preview.raised }}
					/>
				</div>
			</div>

			<div className="text-fg text-sm font-semibold">{name}</div>
			<div className="text-fg-3 text-xs mt-0.5">{description}</div>
		</button>
	);
}

export default GlobalSettings;
