import { useState, useEffect, useRef, type Dispatch } from "react";
import type { Project } from "../../shared/types";
import { titleFromDescription } from "../../shared/types";
import type { AppAction } from "../state";
import { api } from "../rpc";
import { useT } from "../i18n";
import { trackEvent } from "../analytics";
import { labelColor } from "../utils/label-color";

interface CreateTaskModalProps {
	project: Project;
	dispatch: Dispatch<AppAction>;
	onClose: () => void;
	allProjectLabels?: string[];
}

function CreateTaskModal({ project, dispatch, onClose, allProjectLabels = [] }: CreateTaskModalProps) {
	const t = useT();
	const [description, setDescription] = useState("");
	const [creating, setCreating] = useState(false);
	const [labels, setLabels] = useState<string[]>([]);
	const [labelInput, setLabelInput] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const generatedTitle = description.trim()
		? titleFromDescription(description)
		: "";

	const labelSuggestions = allProjectLabels.filter(
		(l) => l.toLowerCase().includes(labelInput.toLowerCase()) && !labels.includes(l),
	);
	const canAddNew =
		labelInput.trim().length > 0 &&
		!labels.includes(labelInput.trim()) &&
		!allProjectLabels.some((l) => l.toLowerCase() === labelInput.trim().toLowerCase());

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [onClose]);

	function addLabel(label: string) {
		const trimmed = label.trim();
		if (!trimmed || labels.includes(trimmed)) return;
		setLabels((prev) => [...prev, trimmed]);
		setLabelInput("");
	}

	function removeLabel(label: string) {
		setLabels((prev) => prev.filter((l) => l !== label));
	}

	function handleLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			addLabel(labelInput);
		} else if (e.key === "Backspace" && labelInput === "" && labels.length > 0) {
			removeLabel(labels[labels.length - 1]);
		}
	}

	async function handleCreate() {
		const trimmed = description.trim();
		if (!trimmed || creating) return;
		setCreating(true);
		try {
			const task = await api.request.createTask({
				projectId: project.id,
				description: trimmed,
				labels,
			});
			dispatch({ type: "addTask", task });
			trackEvent("task_created", { project_id: project.id });
			onClose();
		} catch (err) {
			alert(t("kanban.failedCreate", { error: String(err) }));
			setCreating(false);
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-overlay border border-edge rounded-2xl shadow-2xl w-[520px] p-6 space-y-5">
				<h2 className="text-fg text-lg font-semibold">
					{t("createTask.title")}
				</h2>

				{/* Description textarea */}
				<div className="space-y-1.5">
					<label className="text-fg-2 text-sm font-medium">
						{t("createTask.descriptionLabel")}
					</label>
					<textarea
						ref={textareaRef}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
								handleCreate();
							}
						}}
						placeholder={t("createTask.descriptionPlaceholder")}
						rows={4}
						className="w-full px-3 py-2.5 bg-elevated border border-edge-active rounded-xl text-fg text-sm placeholder-fg-muted outline-none focus:border-accent/50 transition-colors resize-y min-h-[80px] max-h-[300px]"
					/>
					{generatedTitle && (
						<div className="text-fg-3 text-xs">
							{t("createTask.generatedTitle")}{" "}
							<span className="text-fg-2 font-medium">{generatedTitle}</span>
						</div>
					)}
				</div>

				{/* Labels */}
				<div className="space-y-1.5">
					<label className="text-fg-2 text-sm font-medium">{t("labels.labels")}</label>
					<div className="flex flex-wrap gap-1.5 items-center px-3 py-2 bg-elevated border border-edge-active rounded-xl min-h-[38px] focus-within:border-accent/50 transition-colors">
						{labels.map((label) => {
							const c = labelColor(label);
							return (
								<span
									key={label}
									className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
									style={{ color: c, borderColor: `${c}50`, backgroundColor: `${c}18` }}
								>
									{label}
									<button
										type="button"
										onClick={() => removeLabel(label)}
										className="hover:opacity-70 transition-opacity"
									>
										<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
											<path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
										</svg>
									</button>
								</span>
							);
						})}
						<input
							type="text"
							value={labelInput}
							onChange={(e) => setLabelInput(e.target.value)}
							onKeyDown={handleLabelKeyDown}
							placeholder={labels.length === 0 ? t("labels.addLabel") : ""}
							className="flex-1 min-w-[80px] bg-transparent text-fg text-sm outline-none placeholder-fg-muted"
						/>
					</div>
					{/* Suggestions dropdown */}
					{(labelSuggestions.length > 0 || canAddNew) && labelInput.trim().length > 0 && (
						<div className="bg-overlay border border-edge rounded-xl shadow-lg py-1 max-h-32 overflow-y-auto">
							{labelSuggestions.map((l) => (
								<button
									key={l}
									type="button"
									onMouseDown={(e) => { e.preventDefault(); addLabel(l); }}
									className="w-full text-left px-3 py-1.5 text-xs hover:bg-raised-hover transition-colors"
									style={{ color: labelColor(l) }}
								>
									{l}
								</button>
							))}
							{canAddNew && (
								<button
									type="button"
									onMouseDown={(e) => { e.preventDefault(); addLabel(labelInput); }}
									className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:bg-raised-hover transition-colors"
								>
									+ {labelInput.trim()}
								</button>
							)}
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center justify-between pt-1">
					<span className="text-fg-muted text-xs">
						{t("createTask.submitHint")}
					</span>
					<div className="flex gap-2">
						<button
							onClick={onClose}
							className="px-4 py-2 text-fg-3 text-sm hover:text-fg transition-colors rounded-xl"
						>
							{t("kanban.cancel")}
						</button>
						<button
							onClick={handleCreate}
							disabled={!description.trim() || creating}
							className="px-5 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{creating ? t("createTask.creating") : t("createTask.create")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default CreateTaskModal;
