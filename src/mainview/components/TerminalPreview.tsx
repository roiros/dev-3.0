import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../rpc";
import { useT } from "../i18n";
import { parseAnsi } from "../utils/ansi-to-html";

interface TerminalPreviewProps {
	taskId: string;
	anchorRect: DOMRect;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
}

function TerminalPreview({ taskId, anchorRect, onMouseEnter, onMouseLeave }: TerminalPreviewProps) {
	const t = useT();
	const [content, setContent] = useState<string | null | undefined>(undefined); // undefined = loading
	const [pos, setPos] = useState({ top: 0, left: 0 });
	const [visible, setVisible] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let cancelled = false;
		api.request.captureTerminal({ taskId, lines: 24 }).then((result) => {
			if (!cancelled) setContent(result);
		}).catch(() => {
			if (!cancelled) setContent(null);
		});
		return () => { cancelled = true; };
	}, [taskId]);

	useLayoutEffect(() => {
		if (!ref.current) return;

		const el = ref.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 8;

		// Prefer right side of the card
		let left = anchorRect.right + 8;
		let top = anchorRect.top;

		// If overflows right, try left side
		if (left + el.width > vw - pad) {
			left = anchorRect.left - el.width - 8;
		}
		// If still overflows left, center below
		if (left < pad) {
			left = Math.max(pad, anchorRect.left);
			top = anchorRect.bottom + 8;
		}
		// Clamp vertical
		if (top + el.height > vh - pad) {
			top = vh - el.height - pad;
		}
		if (top < pad) top = pad;

		setPos({ top, left });
		setVisible(true);
	}, [anchorRect, content]);

	const isLoading = content === undefined;
	const noSession = content === null;

	const segments = !isLoading && !noSession ? parseAnsi(content) : [];

	return createPortal(
		<div
			ref={ref}
			className="fixed z-[60] rounded-lg shadow-2xl shadow-black/50 border border-edge-active overflow-hidden"
			style={{
				top: pos.top,
				left: pos.left,
				visibility: visible ? "visible" : "hidden",
				maxWidth: 480,
				maxHeight: 320,
				backgroundColor: "#0d1117",
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{isLoading ? (
				<div className="px-4 py-3 text-xs text-gray-400 font-mono">
					{t("task.previewLoading")}
				</div>
			) : noSession ? (
				<div className="px-4 py-3 text-xs text-gray-500 font-mono">
					{t("task.previewNoSession")}
				</div>
			) : (
				<pre
					className="px-3 py-2 text-[11px] leading-[1.4] font-mono overflow-hidden whitespace-pre-wrap break-all"
					style={{ color: "#c9d1d9", margin: 0 }}
				>
					{segments.map((seg, i) => (
						<span key={i} style={seg.style}>{seg.text}</span>
					))}
				</pre>
			)}
		</div>,
		document.body,
	);
}

export default TerminalPreview;
