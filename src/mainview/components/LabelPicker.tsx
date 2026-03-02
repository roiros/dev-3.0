import {
	useState,
	useRef,
	useEffect,
	useLayoutEffect,
	type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { labelColor } from "../utils/label-color";
import { useT } from "../i18n";

interface LabelPickerProps {
	currentLabels: string[];
	allProjectLabels: string[];
	anchorRef: RefObject<HTMLElement | null>;
	onSave: (labels: string[]) => void;
	onClose: () => void;
}

function LabelPicker({
	currentLabels,
	allProjectLabels,
	anchorRef,
	onSave,
	onClose,
}: LabelPickerProps) {
	const t = useT();
	const [query, setQuery] = useState("");
	const [pos, setPos] = useState({ top: 0, left: 0 });
	const [visible, setVisible] = useState(false);
	const popupRef = useRef<HTMLDivElement>(null);
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

	// Position popup below anchor
	useLayoutEffect(() => {
		if (!anchorRef.current || !popupRef.current) return;
		const anchor = anchorRef.current.getBoundingClientRect();
		const popup = popupRef.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 8;

		let top = anchor.bottom + 4;
		let left = anchor.left;

		if (top + popup.height > vh - pad) top = anchor.top - popup.height - 4;
		if (left + popup.width > vw - pad) left = vw - popup.width - pad;
		if (left < pad) left = pad;
		if (top < pad) top = pad;

		setPos({ top, left });
		setVisible(true);
	}, [anchorRef]);

	// Close on outside click
	useEffect(() => {
		function handle(e: MouseEvent) {
			if (
				popupRef.current &&
				!popupRef.current.contains(e.target as Node) &&
				anchorRef.current &&
				!anchorRef.current.contains(e.target as Node)
			) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, [onClose, anchorRef]);

	// Close on Escape
	useEffect(() => {
		function handle(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handle);
		return () => document.removeEventListener("keydown", handle);
	}, [onClose]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	function toggle(label: string) {
		const next = currentLabels.includes(label)
			? currentLabels.filter((l) => l !== label)
			: [...currentLabels, label];
		onSave(next);
	}

	function addNew() {
		if (!queryTrimmed) return;
		const normalized = queryTrimmed;
		if (!currentLabels.includes(normalized)) {
			onSave([...currentLabels, normalized]);
		}
		setQuery("");
	}

	return createPortal(
		<div
			ref={popupRef}
			style={{ top: pos.top, left: pos.left, visibility: visible ? "visible" : "hidden" }}
			className="fixed z-50 w-52 bg-overlay border border-edge rounded-xl shadow-2xl py-2"
		>
			{/* Search / add input */}
			<div className="px-2 pb-2">
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
					className="w-full px-2 py-1 bg-elevated border border-edge-active rounded-lg text-fg text-xs placeholder-fg-muted outline-none focus:border-accent/50"
				/>
			</div>

			{/* Existing labels list */}
			<div className="max-h-48 overflow-y-auto">
				{filtered.length === 0 && !canAdd && (
					<div className="px-3 py-1.5 text-fg-muted text-xs">
						{t("labels.noLabels")}
					</div>
				)}
				{filtered.map((label) => {
					const active = currentLabels.includes(label);
					const color = labelColor(label);
					return (
						<button
							key={label}
							onMouseDown={(e) => {
								e.preventDefault();
								toggle(label);
							}}
							className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-raised-hover transition-colors text-left"
						>
							{/* Checkbox indicator */}
							<span
								className="w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center"
								style={{
									borderColor: color,
									backgroundColor: active ? color : "transparent",
								}}
							>
								{active && (
									<svg width="8" height="6" viewBox="0 0 8 6" fill="none">
										<path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								)}
							</span>
							<span
								className="text-xs font-medium truncate"
								style={{ color }}
							>
								{label}
							</span>
						</button>
					);
				})}
				{canAdd && (
					<button
						onMouseDown={(e) => {
							e.preventDefault();
							addNew();
						}}
						className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-raised-hover transition-colors text-left"
					>
						<span className="text-fg-muted text-xs">+</span>
						<span className="text-fg-2 text-xs truncate">
							{queryTrimmed}
						</span>
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
}

export default LabelPicker;
