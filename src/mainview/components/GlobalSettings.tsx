import { useState, useEffect } from "react";
import { useT, useLocale, ALL_LOCALES, LOCALE_LABELS } from "../i18n";
import type { Locale } from "../i18n";
import type { CodingAgent, AgentConfiguration } from "../../shared/types";
import { api } from "../rpc";

type Theme = "dark" | "light";

function GlobalSettings() {
	const t = useT();
	const [locale, setLocale] = useLocale();

	const [theme, setTheme] = useState<Theme>(
		() => (localStorage.getItem("dev3-theme") as Theme) || "dark",
	);

	const [agents, setAgents] = useState<CodingAgent[]>([]);
	const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
	const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);

	useEffect(() => {
		api.request.getAgents().then(setAgents);
	}, []);

	function applyTheme(th: Theme) {
		setTheme(th);
		document.documentElement.dataset.theme = th;
		localStorage.setItem("dev3-theme", th);
	}

	async function persistAgents(updated: CodingAgent[]) {
		setAgents(updated);
		await api.request.saveAgents({ agents: updated });
	}

	function updateAgent(agentId: string, patch: Partial<CodingAgent>) {
		const updated = agents.map((a) =>
			a.id === agentId ? { ...a, ...patch } : a,
		);
		persistAgents(updated);
	}

	function updateConfig(
		agentId: string,
		configId: string,
		patch: Partial<AgentConfiguration>,
	) {
		const updated = agents.map((a) => {
			if (a.id !== agentId) return a;
			return {
				...a,
				configurations: a.configurations.map((c) =>
					c.id === configId ? { ...c, ...patch } : c,
				),
			};
		});
		persistAgents(updated);
	}

	function addConfig(agentId: string) {
		const newConfig: AgentConfiguration = {
			id: crypto.randomUUID(),
			name: "New Config",
		};
		const updated = agents.map((a) => {
			if (a.id !== agentId) return a;
			return { ...a, configurations: [...a.configurations, newConfig] };
		});
		persistAgents(updated);
		setExpandedConfigId(newConfig.id);
	}

	function deleteConfig(agentId: string, configId: string) {
		const updated = agents.map((a) => {
			if (a.id !== agentId) return a;
			const filtered = a.configurations.filter((c) => c.id !== configId);
			const newDefault =
				a.defaultConfigId === configId
					? filtered[0]?.id
					: a.defaultConfigId;
			return { ...a, configurations: filtered, defaultConfigId: newDefault };
		});
		persistAgents(updated);
		if (expandedConfigId === configId) setExpandedConfigId(null);
	}

	function addAgent() {
		const id = crypto.randomUUID();
		const configId = crypto.randomUUID();
		const agent: CodingAgent = {
			id,
			name: "New Agent",
			baseCommand: "",
			configurations: [{ id: configId, name: "Default" }],
			defaultConfigId: configId,
		};
		const updated = [...agents, agent];
		persistAgents(updated);
		setExpandedAgentId(id);
		setExpandedConfigId(null);
	}

	function deleteAgent(agentId: string) {
		const updated = agents.filter((a) => a.id !== agentId);
		persistAgents(updated);
		if (expandedAgentId === agentId) {
			setExpandedAgentId(null);
			setExpandedConfigId(null);
		}
	}

	return (
		<div className="h-full w-full flex flex-col bg-base">
			<div className="flex-1 overflow-y-auto p-7">
				<div className="max-w-xl space-y-8">
					{/* Theme */}
					<div>
						<label className="block text-fg text-sm font-semibold mb-3">
							{t("settings.theme")}
						</label>
						<div className="flex gap-3">
							<ThemeCard
								name={t("settings.themeDark")}
								description={t("settings.themeDarkDesc")}
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
								name={t("settings.themeLight")}
								description={t("settings.themeLightDesc")}
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

					{/* Coding Agents */}
					<div>
						<label className="block text-fg text-sm font-semibold mb-3">
							{t("settings.agents")}
						</label>

						<div className="space-y-2 mb-3">
							{agents.map((agent) => {
								const isExpanded = expandedAgentId === agent.id;
								return (
									<div
										key={agent.id}
										className="bg-raised border border-edge rounded-xl overflow-hidden"
									>
										{/* Agent header */}
										<button
											onClick={() => {
												setExpandedAgentId(isExpanded ? null : agent.id);
												setExpandedConfigId(null);
											}}
											className="w-full flex items-center gap-3 px-4 py-3 hover:bg-raised-hover transition-colors text-left"
										>
											<span className="text-fg-3 text-xs">
												{isExpanded ? "▼" : "▶"}
											</span>
											<span className="text-fg text-sm font-medium flex-1">
												{agent.name}
											</span>
											<span className="text-fg-3 text-xs font-mono">
												{agent.baseCommand}
											</span>
											<span className="text-fg-muted text-xs">
												{agent.configurations.length} config{agent.configurations.length !== 1 ? "s" : ""}
											</span>
											{agent.isDefault && (
												<span className="text-fg-muted text-xs px-2 py-0.5 bg-elevated rounded-md">
													{t("settings.defaultBadge")}
												</span>
											)}
										</button>

										{/* Expanded agent editor */}
										{isExpanded && (
											<div className="border-t border-edge px-4 py-4 space-y-4">
												{/* Agent name */}
												<div>
													<label className="block text-fg-2 text-xs mb-1">
														{t("settings.agentName")}
													</label>
													<input
														type="text"
														value={agent.name}
														onChange={(e) =>
															updateAgent(agent.id, { name: e.target.value })
														}
														className="w-full px-3 py-2 bg-elevated border border-edge rounded-lg text-fg text-sm outline-none focus:border-accent/40 transition-colors"
													/>
												</div>

												{/* Base command */}
												<div>
													<label className="block text-fg-2 text-xs mb-1">
														{t("settings.agentBaseCommand")}
													</label>
													<input
														type="text"
														value={agent.baseCommand}
														onChange={(e) =>
															updateAgent(agent.id, {
																baseCommand: e.target.value,
															})
														}
														placeholder="claude"
														className="w-full px-3 py-2 bg-elevated border border-edge rounded-lg text-fg text-sm font-mono placeholder-fg-muted outline-none focus:border-accent/40 transition-colors"
													/>
												</div>

												{/* Configurations */}
												<div>
													<label className="block text-fg-2 text-xs font-semibold mb-2">
														{t("settings.configurations")}
													</label>
													<div className="space-y-2">
														{agent.configurations.map((config) => {
															const isConfigExpanded =
																expandedConfigId === config.id;
															return (
																<ConfigEditor
																	key={config.id}
																	config={config}
																	isExpanded={isConfigExpanded}
																	canDelete={agent.configurations.length > 1}
																	onToggle={() =>
																		setExpandedConfigId(
																			isConfigExpanded ? null : config.id,
																		)
																	}
																	onChange={(patch) =>
																		updateConfig(agent.id, config.id, patch)
																	}
																	onDelete={() =>
																		deleteConfig(agent.id, config.id)
																	}
																	t={t}
																/>
															);
														})}
													</div>
													<button
														onClick={() => addConfig(agent.id)}
														className="mt-2 px-3 py-1.5 text-accent text-xs font-semibold hover:bg-accent/10 rounded-lg transition-colors"
													>
														+ {t("settings.addConfig")}
													</button>
												</div>

												{/* Delete agent */}
												{agent.isDefault ? (
													<p className="text-fg-muted text-xs italic">
														{t("settings.cantDeleteDefault")}
													</p>
												) : (
													<button
														onClick={() => deleteAgent(agent.id)}
														className="text-danger text-xs hover:underline"
													>
														{t("settings.deleteAgent")}
													</button>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>

						<button
							onClick={addAgent}
							className="px-4 py-2 text-accent text-sm font-semibold hover:bg-accent/10 rounded-lg transition-colors"
						>
							+ {t("settings.addAgent")}
						</button>
					</div>

					{/* Language */}
					<div>
						<label className="block text-fg text-sm font-semibold mb-3">
							{t("settings.language")}
						</label>
						<div className="flex gap-3">
							{ALL_LOCALES.map((loc) => (
								<LanguageCard
									key={loc}
									locale={loc}
									label={LOCALE_LABELS[loc]}
									active={locale === loc}
									onClick={() => setLocale(loc)}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ---- Config Editor ----

function ConfigEditor({
	config,
	isExpanded,
	canDelete,
	onToggle,
	onChange,
	onDelete,
	t,
}: {
	config: AgentConfiguration;
	isExpanded: boolean;
	canDelete: boolean;
	onToggle: () => void;
	onChange: (patch: Partial<AgentConfiguration>) => void;
	onDelete: () => void;
	t: (key: string, vars?: Record<string, string>) => string;
}) {
	return (
		<div className="bg-elevated border border-edge rounded-lg overflow-hidden">
			<button
				onClick={onToggle}
				className="w-full flex items-center gap-2 px-3 py-2 hover:bg-elevated-hover transition-colors text-left"
			>
				<span className="text-fg-3 text-xs">{isExpanded ? "▼" : "▶"}</span>
				<span className="text-fg text-sm flex-1">{config.name}</span>
				{config.model && (
					<span className="text-accent text-xs font-mono px-1.5 py-0.5 bg-accent/10 rounded">
						{config.model}
					</span>
				)}
			</button>

			{isExpanded && (
				<div className="border-t border-edge px-3 py-3 space-y-3">
					{/* Config name */}
					<div>
						<label className="block text-fg-2 text-xs mb-1">
							{t("settings.configName")}
						</label>
						<input
							type="text"
							value={config.name}
							onChange={(e) => onChange({ name: e.target.value })}
							className="w-full px-3 py-1.5 bg-base border border-edge rounded-lg text-fg text-sm outline-none focus:border-accent/40 transition-colors"
						/>
					</div>

					{/* Model */}
					<div>
						<label className="block text-fg-2 text-xs mb-1">
							{t("settings.configModel")}
						</label>
						<input
							type="text"
							value={config.model || ""}
							onChange={(e) =>
								onChange({ model: e.target.value || undefined })
							}
							placeholder="opus, sonnet, etc."
							className="w-full px-3 py-1.5 bg-base border border-edge rounded-lg text-fg text-sm font-mono placeholder-fg-muted outline-none focus:border-accent/40 transition-colors"
						/>
					</div>

					{/* Append prompt */}
					<div>
						<label className="block text-fg-2 text-xs mb-1">
							{t("settings.configAppendPrompt")}
						</label>
						<textarea
							value={config.appendPrompt || ""}
							onChange={(e) =>
								onChange({ appendPrompt: e.target.value || undefined })
							}
							rows={3}
							className="w-full px-3 py-1.5 bg-base border border-edge rounded-lg text-fg text-sm font-mono placeholder-fg-muted outline-none focus:border-accent/40 transition-colors resize-y"
						/>
						<p className="text-fg-muted text-xs mt-1">
							{t("settings.configAppendPromptHint")}
						</p>
					</div>

					{/* Additional args */}
					<div>
						<label className="block text-fg-2 text-xs mb-1">
							{t("settings.configAdditionalArgs")}
						</label>
						<ListEditor
							items={config.additionalArgs || []}
							onChange={(items) =>
								onChange({
									additionalArgs: items.length > 0 ? items : undefined,
								})
							}
							placeholder="--flag"
							addLabel={t("settings.configAddArg")}
						/>
					</div>

					{/* Env vars */}
					<div>
						<label className="block text-fg-2 text-xs mb-1">
							{t("settings.configEnvVars")}
						</label>
						<KeyValueEditor
							entries={config.envVars || {}}
							onChange={(entries) =>
								onChange({
									envVars:
										Object.keys(entries).length > 0 ? entries : undefined,
								})
							}
							addLabel={t("settings.configAddEnvVar")}
						/>
					</div>

					{/* Base command override */}
					<div>
						<label className="block text-fg-2 text-xs mb-1">
							{t("settings.configBaseCommandOverride")}
						</label>
						<input
							type="text"
							value={config.baseCommandOverride || ""}
							onChange={(e) =>
								onChange({
									baseCommandOverride: e.target.value || undefined,
								})
							}
							placeholder=""
							className="w-full px-3 py-1.5 bg-base border border-edge rounded-lg text-fg text-sm font-mono placeholder-fg-muted outline-none focus:border-accent/40 transition-colors"
						/>
					</div>

					{/* Delete config */}
					{canDelete && (
						<button
							onClick={onDelete}
							className="text-danger text-xs hover:underline"
						>
							{t("settings.deleteConfig")}
						</button>
					)}
				</div>
			)}
		</div>
	);
}

// ---- List Editor (for additionalArgs) ----

function ListEditor({
	items,
	onChange,
	placeholder,
	addLabel,
}: {
	items: string[];
	onChange: (items: string[]) => void;
	placeholder: string;
	addLabel: string;
}) {
	return (
		<div className="space-y-1.5">
			{items.map((item, i) => (
				<div key={i} className="flex gap-2">
					<input
						type="text"
						value={item}
						onChange={(e) => {
							const next = [...items];
							next[i] = e.target.value;
							onChange(next);
						}}
						placeholder={placeholder}
						className="flex-1 px-3 py-1.5 bg-base border border-edge rounded-lg text-fg text-sm font-mono placeholder-fg-muted outline-none focus:border-accent/40 transition-colors"
					/>
					<button
						onClick={() => onChange(items.filter((_, j) => j !== i))}
						className="text-danger text-xs hover:underline shrink-0 px-2"
					>
						×
					</button>
				</div>
			))}
			<button
				onClick={() => onChange([...items, ""])}
				className="text-accent text-xs hover:underline"
			>
				+ {addLabel}
			</button>
		</div>
	);
}

// ---- Key-Value Editor (for envVars) ----

function KeyValueEditor({
	entries,
	onChange,
	addLabel,
}: {
	entries: Record<string, string>;
	onChange: (entries: Record<string, string>) => void;
	addLabel: string;
}) {
	const pairs = Object.entries(entries);

	function updateKey(oldKey: string, newKey: string) {
		const result: Record<string, string> = {};
		for (const [k, v] of pairs) {
			result[k === oldKey ? newKey : k] = v;
		}
		onChange(result);
	}

	function updateValue(key: string, value: string) {
		onChange({ ...entries, [key]: value });
	}

	function remove(key: string) {
		const next = { ...entries };
		delete next[key];
		onChange(next);
	}

	function add() {
		onChange({ ...entries, "": "" });
	}

	return (
		<div className="space-y-1.5">
			{pairs.map(([key, value], i) => (
				<div key={i} className="flex gap-2">
					<input
						type="text"
						value={key}
						onChange={(e) => updateKey(key, e.target.value)}
						placeholder="KEY"
						className="w-1/3 px-3 py-1.5 bg-base border border-edge rounded-lg text-fg text-sm font-mono placeholder-fg-muted outline-none focus:border-accent/40 transition-colors"
					/>
					<input
						type="text"
						value={value}
						onChange={(e) => updateValue(key, e.target.value)}
						placeholder="value"
						className="flex-1 px-3 py-1.5 bg-base border border-edge rounded-lg text-fg text-sm font-mono placeholder-fg-muted outline-none focus:border-accent/40 transition-colors"
					/>
					<button
						onClick={() => remove(key)}
						className="text-danger text-xs hover:underline shrink-0 px-2"
					>
						×
					</button>
				</div>
			))}
			<button onClick={add} className="text-accent text-xs hover:underline">
				+ {addLabel}
			</button>
		</div>
	);
}

// ---- Theme & Language Cards ----

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

function LanguageCard({
	locale,
	label,
	active,
	onClick,
}: {
	locale: Locale;
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	const flags: Record<Locale, string> = {
		en: "EN",
		ru: "RU",
		es: "ES",
	};

	return (
		<button
			onClick={onClick}
			className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
				active
					? "border-accent shadow-lg shadow-accent/10"
					: "border-edge hover:border-edge-active"
			}`}
		>
			<div className="text-2xl mb-2 font-mono text-fg-2 font-bold">
				{flags[locale]}
			</div>
			<div className="text-fg text-sm font-semibold">{label}</div>
		</button>
	);
}

export default GlobalSettings;
