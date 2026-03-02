import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { labelColor } from "../utils/label-color";
import { useT } from "../i18n";

interface LabelPickerProps {
	currentLabels: string[];
	allProjectLabels: string[];
	onSave: (labels: string[]) => void;
	onClose: () => void;
}

function LabelPicker({
	currentLabels,
	allProjectLabels,
	onSave,
	onClose,
}: LabelPickerProps) {
	const t = useT();
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered = allProjectLabels.filter((l) =>
		l.toLowerCase().includes(query.toLowerCase()),
	);
	const queryTrimmed = query.trim();
	const canAdd =
		queryTrimmed.length > 0 &&
		!allProjectLabels.some(
			(l) => l.toLowerCase() === queryTrimmed.toLowerCase(),
		);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		function handle(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handle);
		return () => document.removeEventListener("keydown", handle);
	}, [onClose]);

	function toggle(label: string) {
		const next = currentLabels.includes(label)
			? currentLabels.filter((l) => l !== label)
			: [...currentLabels, label];
		onSave(next);
	}

	function addNew() {
		if (!queryTrimmed) return;
		if (!currentLabels.includes(queryTrimmed)) {
			onSave([...currentLabels, queryTrimmed]);
		}
		setQuery("");
	}

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onClick={(e) => e.stopPropagation()}
		>
			<div
				className="bg-overlay border border-edge rounded-2xl shadow-2xl w-[380px] p-5 space-y-4"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between">
					<h3 className="text-fg text-base font-semibold">{t("labels.labels")}</h3>
					<button
						onClick={onClose}
						className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-3 hover:text-fg hover:bg-fg/8 transition-colors"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Current labels */}
				{currentLabels.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{currentLabels.map((label) => {
							const c = labelColor(label);
							return (
								<span
									key={label}
									className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
									style={{ color: c, borderColor: `${c}50`, backgroundColor: `${c}18` }}
								>
									{label}
									<button
										onClick={() => toggle(label)}
										className="hover:opacity-70 transition-opacity"
									>
										<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
											<path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
										</svg>
									</button>
								</span>
							);
						})}
					</div>
				)}

				{/* Search / add input */}
				<div>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								if (canAdd) addNew();
								else if (filtered.length === 1) toggle(filtered[0]);
							}
						}}
						placeholder={t("labels.addLabel")}
						className="w-full px-3 py-2 bg-elevated border border-edge-active rounded-xl text-fg text-sm placeholder-fg-muted outline-none focus:border-accent/50 transition-colors"
					/>
				</div>

				{/* Label list */}
				<div className="max-h-52 overflow-y-auto -mx-1">
					{filtered.length === 0 && !canAdd && (
						<div className="px-3 py-2 text-fg-muted text-sm">
							{t("labels.noLabels")}
						</div>
					)}
					{filtered.map((label) => {
						const active = currentLabels.includes(label);
						const color = labelColor(label);
						return (
							<button
								key={label}
								onClick={() => toggle(label)}
								className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-raised-hover transition-colors text-left"
							>
								<span
									className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center"
									style={{
										borderColor: color,
										backgroundColor: active ? color : "transparent",
									}}
								>
									{active && (
										<svg width="9" height="7" viewBox="0 0 9 7" fill="none">
											<path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									)}
								</span>
								<span className="text-sm font-medium" style={{ color }}>
									{label}
								</span>
							</button>
						);
					})}
					{canAdd && (
						<button
							onClick={addNew}
							className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-raised-hover transition-colors text-left"
						>
							<span className="w-4 h-4 rounded border-2 border-dashed border-edge flex-shrink-0" />
							<span className="text-sm text-fg-2">
								+ {queryTrimmed}
							</span>
						</button>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}

export default LabelPicker;
