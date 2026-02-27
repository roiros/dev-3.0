import { useState, useRef, useCallback, useEffect, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Terminal } from "ghostty-web";
import { api } from "../rpc";
import { useT } from "../i18n";

// ---- Singleton screenshot terminal ----

let screenshotTerm: Terminal | null = null;
let screenshotContainer: HTMLDivElement | null = null;
let screenshotCanvas: HTMLCanvasElement | null = null;

function getScreenshotTerminal(): { term: Terminal; canvas: HTMLCanvasElement } {
	if (screenshotTerm && screenshotCanvas) {
		return { term: screenshotTerm, canvas: screenshotCanvas };
	}

	// Create off-screen container
	screenshotContainer = document.createElement("div");
	Object.assign(screenshotContainer.style, {
		position: "fixed",
		left: "-9999px",
		top: "-9999px",
		width: "800px",
		height: "400px",
		opacity: "0",
		pointerEvents: "none",
	});
	document.body.appendChild(screenshotContainer);

	screenshotTerm = new Terminal({
		fontSize: 11,
		fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
		cursorBlink: false,
		cursorStyle: "bar",
		cols: 100,
		rows: 25,
		theme: {
			background: "#1a1b26",
			foreground: "#a9b1d6",
			cursor: "#1a1b26", // invisible cursor
			selectionBackground: "#33467c",
			black: "#15161e",
			red: "#f7768e",
			green: "#9ece6a",
			yellow: "#e0af68",
			blue: "#7aa2f7",
			magenta: "#bb9af7",
			cyan: "#7dcfff",
			white: "#a9b1d6",
			brightBlack: "#414868",
			brightRed: "#f7768e",
			brightGreen: "#9ece6a",
			brightYellow: "#e0af68",
			brightBlue: "#7aa2f7",
			brightMagenta: "#bb9af7",
			brightCyan: "#7dcfff",
			brightWhite: "#c0caf5",
		},
	});

	screenshotTerm.open(screenshotContainer);
	screenshotCanvas = screenshotTerm.renderer!.getCanvas();

	return { term: screenshotTerm, canvas: screenshotCanvas };
}

async function captureScreenshot(ansiContent: string): Promise<string> {
	const { term, canvas } = getScreenshotTerminal();

	term.reset();
	term.write(ansiContent);

	// Wait for render — ghostty-web renders on rAF
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	// Extra frame to ensure paint is complete
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

	return canvas.toDataURL("image/png");
}

// ---- Popover component ----

interface TerminalPreviewProps {
	taskId: string;
	children: ReactNode;
}

const SHOW_DELAY = 400;
const HIDE_DELAY = 200;

function TerminalPreview({ taskId, children }: TerminalPreviewProps) {
	const t = useT();
	const [visible, setVisible] = useState(false);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [noContent, setNoContent] = useState(false);
	const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
	const [posReady, setPosReady] = useState(false);

	const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const generationRef = useRef(0);
	const triggerRef = useRef<HTMLDivElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	const clearTimers = useCallback(() => {
		if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
		if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
	}, []);

	const handleMouseEnter = useCallback(() => {
		if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
		if (visible) return;

		showTimerRef.current = setTimeout(async () => {
			const gen = ++generationRef.current;
			setLoading(true);
			setNoContent(false);
			setImageUrl(null);
			setVisible(true);
			setPosReady(false);

			try {
				const ansi = await api.request.captureTaskPane({ taskId });
				if (gen !== generationRef.current) return;

				if (!ansi) {
					setNoContent(true);
					setLoading(false);
					return;
				}

				const dataUrl = await captureScreenshot(ansi);
				if (gen !== generationRef.current) return;

				setImageUrl(dataUrl);
			} catch {
				if (gen !== generationRef.current) return;
				setNoContent(true);
			}
			setLoading(false);
		}, SHOW_DELAY);
	}, [taskId, visible]);

	const handleMouseLeave = useCallback(() => {
		if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }

		hideTimerRef.current = setTimeout(() => {
			generationRef.current++;
			setVisible(false);
			setImageUrl(null);
			setLoading(false);
			setNoContent(false);
		}, HIDE_DELAY);
	}, []);

	const handlePopoverEnter = useCallback(() => {
		if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
	}, []);

	const handlePopoverLeave = useCallback(() => {
		handleMouseLeave();
	}, [handleMouseLeave]);

	// Escape to close
	useEffect(() => {
		if (!visible) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				generationRef.current++;
				setVisible(false);
				setImageUrl(null);
				setLoading(false);
				setNoContent(false);
			}
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [visible]);

	// Cleanup on unmount
	useEffect(() => clearTimers, [clearTimers]);

	// Position popover after render
	useLayoutEffect(() => {
		if (!visible || !popoverRef.current || !triggerRef.current) return;

		const trigger = triggerRef.current.getBoundingClientRect();
		const popover = popoverRef.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 12;

		// Try to place above the card
		let top = trigger.top - popover.height - 8;
		let left = trigger.left + (trigger.width - popover.width) / 2;

		// If overflows top, place below
		if (top < pad) {
			top = trigger.bottom + 8;
		}
		// If overflows bottom too, just clamp
		if (top + popover.height > vh - pad) {
			top = vh - popover.height - pad;
		}
		// Clamp horizontal
		if (left < pad) left = pad;
		if (left + popover.width > vw - pad) left = vw - popover.width - pad;

		setPopoverPos({ top, left });
		setPosReady(true);
	}, [visible, imageUrl, loading, noContent]);

	return (
		<div
			ref={triggerRef}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{children}
			{visible && createPortal(
				<div
					ref={popoverRef}
					className="fixed z-50 bg-overlay rounded-xl shadow-2xl shadow-black/50 border border-edge-active overflow-hidden"
					style={{
						top: popoverPos.top,
						left: popoverPos.left,
						visibility: posReady ? "visible" : "hidden",
						maxWidth: "min(820px, calc(100vw - 24px))",
					}}
					onMouseEnter={handlePopoverEnter}
					onMouseLeave={handlePopoverLeave}
				>
					{/* Header */}
					<div className="px-3 py-2 border-b border-edge flex items-center gap-2">
						<svg className="w-3.5 h-3.5 text-fg-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						<span className="text-xs text-fg-2 font-medium">{t("preview.title")}</span>
					</div>

					{/* Content */}
					{loading && !imageUrl && !noContent && (
						<div className="flex items-center justify-center py-8 px-12">
							<div className="flex items-center gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
								<span className="text-xs text-fg-3">{t("preview.loading")}</span>
							</div>
						</div>
					)}

					{noContent && (
						<div className="flex items-center justify-center py-8 px-12">
							<span className="text-xs text-fg-muted">{t("preview.noContent")}</span>
						</div>
					)}

					{imageUrl && (
						<img
							src={imageUrl}
							alt="Terminal preview"
							className="block"
							style={{
								width: "800px",
								maxWidth: "100%",
								height: "auto",
								imageRendering: "auto",
							}}
						/>
					)}
				</div>,
				document.body,
			)}
		</div>
	);
}

export default TerminalPreview;
