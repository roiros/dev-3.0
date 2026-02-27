import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { TmuxSessionInfo } from "../../shared/types";
import { api } from "../rpc";
import { useT } from "../i18n";

const POLL_INTERVAL = 15_000;

function TmuxSessionsIndicator() {
	const t = useT();
	const [sessions, setSessions] = useState<TmuxSessionInfo[]>([]);
	const [popoverOpen, setPopoverOpen] = useState(false);
	const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
	const [popoverVisible, setPopoverVisible] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Polling
	useEffect(() => {
		let cancelled = false;

		async function fetch() {
			try {
				const result = await api.request.listTmuxSessions();
				if (!cancelled) setSessions(result);
			} catch {
				// silently ignore
			}
		}

		fetch();
		const interval = setInterval(fetch, POLL_INTERVAL);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	// Hover helpers
	function clearHoverTimeout() {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}

	function showPopover() {
		clearHoverTimeout();
		if (!popoverOpen && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setPopoverPos({ top: rect.bottom + 6, left: rect.right });
			setPopoverVisible(false);
		}
		setPopoverOpen(true);
	}

	function hidePopover() {
		clearHoverTimeout();
		timeoutRef.current = setTimeout(() => {
			setPopoverOpen(false);
			setPopoverVisible(false);
		}, 200);
	}

	// Cleanup timeout
	useEffect(() => {
		return () => clearHoverTimeout();
	}, []);

	// Escape closes
	useEffect(() => {
		if (!popoverOpen) return;
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				setPopoverOpen(false);
				setPopoverVisible(false);
			}
		}
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [popoverOpen]);

	// Viewport clamping
	useLayoutEffect(() => {
		if (!popoverOpen || !popoverRef.current || !triggerRef.current) return;

		const menu = popoverRef.current.getBoundingClientRect();
		const trigger = triggerRef.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 8;

		let top = trigger.bottom + 6;
		let left = trigger.right - menu.width;

		if (top + menu.height > vh - pad) {
			top = trigger.top - menu.height - 6;
		}
		if (left + menu.width > vw - pad) {
			left = vw - menu.width - pad;
		}
		if (left < pad) left = pad;
		if (top < pad) top = pad;

		setPopoverPos({ top, left });
		setPopoverVisible(true);
	}, [popoverOpen]);

	if (sessions.length === 0) return null;

	return (
		<>
			<button
				ref={triggerRef}
				onMouseEnter={showPopover}
				onMouseLeave={hidePopover}
				className="flex items-center gap-1 text-fg-3 hover:text-fg transition-colors px-2 py-1 rounded-lg hover:bg-elevated"
				title={t("header.tmuxSessionsTooltip")}
			>
				<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<rect x="2" y="4" width="20" height="16" rx="2" strokeWidth={1.5} />
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 15h4M7 9l3 3-3 3" />
				</svg>
				<span className="text-[11px] font-medium tabular-nums">{sessions.length}</span>
			</button>

			{popoverOpen && createPortal(
				<div
					ref={popoverRef}
					className="fixed z-50 bg-overlay rounded-xl shadow-2xl shadow-black/40 border border-edge-active p-3 min-w-[240px] max-w-[360px]"
					style={{
						top: popoverPos.top,
						left: popoverPos.left,
						visibility: popoverVisible ? "visible" : "hidden",
					}}
					onMouseEnter={showPopover}
					onMouseLeave={hidePopover}
				>
					<div className="text-xs font-semibold text-fg mb-2">
						{t.plural("header.tmuxSessionCount", sessions.length)}
					</div>
					<div className="flex flex-col gap-1">
						{sessions.map((s) => {
							const isCleanup = s.name.startsWith("dev3-cl-");
							return (
								<div
									key={s.name}
									className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-raised/50 text-xs"
								>
									<div
										className={`w-2 h-2 rounded-full flex-shrink-0 ${
											s.attached ? "bg-[#34d399]" : "bg-fg-muted/40"
										}`}
									/>
									<span className="font-mono text-fg-2 truncate">{s.name}</span>
									{isCleanup && (
										<span className="text-[10px] text-fg-muted flex-shrink-0">
											({t("header.tmuxSessionCleanup")})
										</span>
									)}
									<span className="ml-auto text-[10px] text-fg-muted flex-shrink-0">
										{s.attached
											? t("header.tmuxSessionAttached")
											: t("header.tmuxSessionDetached")}
									</span>
								</div>
							);
						})}
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}

export default TmuxSessionsIndicator;
