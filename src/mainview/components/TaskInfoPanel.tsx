import { useState, useRef, useCallback, useEffect, useLayoutEffect, type Dispatch } from "react";
import { createPortal } from "react-dom";
import type { Task, Project, TaskStatus, BranchStatus } from "../../shared/types";
import { ACTIVE_STATUSES, STATUS_COLORS, getAllowedTransitions } from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";
import { useT, statusKey } from "../i18n";

interface TaskInfoPanelProps {
	task: Task;
	project: Project;
	dispatch: Dispatch<AppAction>;
	navigate: (route: Route) => void;
}

const COLLAPSED_HEIGHT = 36;
const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 80;
const MAX_RATIO = 0.33;

const LS_COLLAPSED = "dev3-panel-collapsed";
const LS_HEIGHT = "dev3-panel-height";

function readBool(key: string, fallback: boolean): boolean {
	try {
		const v = localStorage.getItem(key);
		if (v === "true") return true;
		if (v === "false") return false;
	} catch {}
	return fallback;
}

function readNumber(key: string, fallback: number): number {
	try {
		const v = localStorage.getItem(key);
		if (v !== null) {
			const n = Number(v);
			if (Number.isFinite(n)) return n;
		}
	} catch {}
	return fallback;
}

function formatDate(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return iso;
	}
}

/* ---- Kbd badge for hotkey display ---- */
function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-base border border-edge text-[10px] font-mono text-fg-2 leading-none">
			{children}
		</kbd>
	);
}

/* ---- Tmux shortcuts popover ---- */
function TmuxHintsPopover({ onClose, triggerRef }: { onClose: () => void; triggerRef: React.RefObject<HTMLButtonElement | null> }) {
	const t = useT();
	const popoverRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ top: 0, left: 0 });
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
				triggerRef.current && !triggerRef.current.contains(e.target as Node)
			) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [onClose, triggerRef]);

	useLayoutEffect(() => {
		if (!popoverRef.current || !triggerRef.current) return;
		const menu = popoverRef.current.getBoundingClientRect();
		const trigger = triggerRef.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 12;

		let top = trigger.bottom + 8;
		let left = trigger.right - menu.width;

		if (top + menu.height > vh - pad) top = trigger.top - menu.height - 8;
		if (left < pad) left = pad;
		if (left + menu.width > vw - pad) left = vw - menu.width - pad;
		if (top < pad) top = pad;

		setPos({ top, left });
		setVisible(true);
	}, [triggerRef]);

	const paneShortcuts = [
		{ keys: ["⌃B", "−"], desc: t("tmux.splitH") },
		{ keys: ["⌃B", "|"], desc: t("tmux.splitV") },
		{ keys: ["⌃B", "Z"], desc: t("tmux.zoom") },
		{ keys: ["⌃B", "←↑↓→"], desc: t("tmux.navigate") },
		{ keys: ["⌃B", "X"], desc: t("tmux.closePane") },
	];

	const otherShortcuts = [
		{ keys: ["⌃B", "["], desc: t("tmux.scrollMode") },
		{ keys: ["⌃B", "D"], desc: t("tmux.detach") },
	];

	return createPortal(
		<div
			ref={popoverRef}
			className="fixed z-50 bg-overlay rounded-xl shadow-2xl shadow-black/40 border border-edge-active w-[320px]"
			style={{ top: pos.top, left: pos.left, visibility: visible ? "visible" : "hidden" }}
		>
			<div className="px-4 pt-3.5 pb-2 border-b border-edge">
				<h3 className="text-sm font-semibold text-fg">{t("tmux.title")}</h3>
			</div>

			<div className="px-4 py-3 space-y-3">
				{/* Panes section */}
				<div>
					<div className="text-[10px] uppercase tracking-wider font-semibold text-fg-3 mb-1.5">{t("tmux.panes")}</div>
					<div className="space-y-1.5">
						{paneShortcuts.map((s, i) => (
							<div key={i} className="flex items-center gap-2">
								<span className="flex items-center gap-0.5 flex-shrink-0">
									{s.keys.map((k, j) => (
										<span key={j} className="flex items-center gap-0.5">
											{j > 0 && <span className="text-fg-muted text-[10px] mx-0.5" />}
											<Kbd>{k}</Kbd>
										</span>
									))}
								</span>
								<span className="text-xs text-fg-2">{s.desc}</span>
							</div>
						))}
					</div>
				</div>

				{/* Other section */}
				<div>
					<div className="text-[10px] uppercase tracking-wider font-semibold text-fg-3 mb-1.5">{t("tmux.other")}</div>
					<div className="space-y-1.5">
						{otherShortcuts.map((s, i) => (
							<div key={i} className="flex items-center gap-2">
								<span className="flex items-center gap-0.5 flex-shrink-0">
									{s.keys.map((k, j) => (
										<span key={j} className="flex items-center gap-0.5">
											<Kbd>{k}</Kbd>
										</span>
									))}
								</span>
								<span className="text-xs text-fg-2">{s.desc}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Footer hint */}
			<div className="px-4 py-2.5 border-t border-edge text-[11px] text-fg-muted leading-snug">
				{t("tmux.hint")}
			</div>
		</div>,
		document.body,
	);
}

function TaskInfoPanel({ task, project, dispatch, navigate }: TaskInfoPanelProps) {
	const t = useT();
	const [collapsed, setCollapsed] = useState(() => readBool(LS_COLLAPSED, true));
	const [panelHeight, setPanelHeight] = useState(() => readNumber(LS_HEIGHT, DEFAULT_HEIGHT));

	const panelRef = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);

	// ---- Status dropdown state ----
	const [statusMenuOpen, setStatusMenuOpen] = useState(false);
	const [statusMenuPos, setStatusMenuPos] = useState({ top: 0, left: 0 });
	const [statusMenuVisible, setStatusMenuVisible] = useState(false);
	const [movingStatus, setMovingStatus] = useState(false);
	const statusTriggerRef = useRef<HTMLButtonElement>(null);
	const statusMenuRef = useRef<HTMLDivElement>(null);

	// Close status menu on click outside
	useEffect(() => {
		if (!statusMenuOpen) return;
		function handleClick(e: MouseEvent) {
			if (
				statusMenuRef.current &&
				!statusMenuRef.current.contains(e.target as Node) &&
				statusTriggerRef.current &&
				!statusTriggerRef.current.contains(e.target as Node)
			) {
				setStatusMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [statusMenuOpen]);

	// Smart viewport clamping for status menu
	useLayoutEffect(() => {
		if (!statusMenuOpen || !statusMenuRef.current || !statusTriggerRef.current) return;

		const menu = statusMenuRef.current.getBoundingClientRect();
		const trigger = statusTriggerRef.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 8;

		let top = trigger.bottom + 6;
		let left = trigger.left;

		if (top + menu.height > vh - pad) {
			top = trigger.top - menu.height - 6;
		}
		if (left + menu.width > vw - pad) {
			left = vw - menu.width - pad;
		}
		if (left < pad) left = pad;
		if (top < pad) top = pad;

		setStatusMenuPos({ top, left });
		setStatusMenuVisible(true);
	}, [statusMenuOpen]);

	function toggleStatusMenu(e: React.MouseEvent) {
		e.stopPropagation();
		if (!statusMenuOpen && statusTriggerRef.current) {
			const rect = statusTriggerRef.current.getBoundingClientRect();
			setStatusMenuPos({ top: rect.bottom + 6, left: rect.left });
			setStatusMenuVisible(false);
		}
		setStatusMenuOpen(!statusMenuOpen);
	}

	async function handleStatusMove(newStatus: TaskStatus) {
		setMovingStatus(true);
		setStatusMenuOpen(false);
		try {
			const updated = await api.request.moveTask({
				taskId: task.id,
				projectId: project.id,
				newStatus,
			});
			dispatch({ type: "updateTask", task: updated });
			if (!ACTIVE_STATUSES.includes(newStatus)) {
				navigate({ screen: "project", projectId: project.id });
			}
		} catch (err) {
			alert(t("task.failedMove", { error: String(err) }));
		}
		setMovingStatus(false);
	}

	// ---- Tmux hints popover ----
	const [tmuxOpen, setTmuxOpen] = useState(false);
	const tmuxTriggerRef = useRef<HTMLButtonElement>(null);

	// ---- Dev server ----
	const hasDevScript = !!(project.devScript?.trim());
	const isTaskActive = ACTIVE_STATUSES.includes(task.status);
	const devServerDisabled = !hasDevScript || !isTaskActive;

	function handleDevServer() {
		if (!devServerDisabled) {
			api.request.runDevServer({ taskId: task.id, projectId: project.id });
		}
	}

	// ---- Branch status polling ----
	const [branchStatus, setBranchStatus] = useState<BranchStatus | null>(null);
	const [rebasing, setRebasing] = useState(false);
	const [merging, setMerging] = useState(false);

	useEffect(() => {
		if (!isTaskActive || !task.worktreePath) return;

		let cancelled = false;

		async function fetchStatus() {
			try {
				const status = await api.request.getBranchStatus({
					taskId: task.id,
					projectId: project.id,
				});
				if (!cancelled) setBranchStatus(status);
			} catch (err) {
				// Silently ignore — polling will retry
			}
		}

		fetchStatus();
		const interval = setInterval(fetchStatus, 30_000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [task.id, project.id, isTaskActive, task.worktreePath]);

	async function handleRebase() {
		if (rebasing) return;
		setRebasing(true);
		try {
			const result = await api.request.rebaseTask({
				taskId: task.id,
				projectId: project.id,
			});
			if (result.ok) {
				const status = await api.request.getBranchStatus({
					taskId: task.id,
					projectId: project.id,
				});
				setBranchStatus(status);
			} else {
				alert(t("infoPanel.rebaseFailed", { error: result.error || "unknown" }));
			}
		} catch (err) {
			alert(t("infoPanel.rebaseFailed", { error: String(err) }));
		}
		setRebasing(false);
	}

	async function handleMerge() {
		if (merging) return;
		setMerging(true);
		try {
			const result = await api.request.mergeTask({
				taskId: task.id,
				projectId: project.id,
			});
			if (result.ok) {
				const status = await api.request.getBranchStatus({
					taskId: task.id,
					projectId: project.id,
				});
				setBranchStatus(status);
			} else {
				alert(t("infoPanel.mergeFailed", { error: result.error || "unknown" }));
			}
		} catch (err) {
			alert(t("infoPanel.mergeFailed", { error: String(err) }));
		}
		setMerging(false);
	}

	// ---- Panel collapse / drag ----

	// Persist collapsed
	useEffect(() => {
		try { localStorage.setItem(LS_COLLAPSED, String(collapsed)); } catch {}
	}, [collapsed]);

	// Persist height
	useEffect(() => {
		try { localStorage.setItem(LS_HEIGHT, String(panelHeight)); } catch {}
	}, [panelHeight]);

	const toggleCollapsed = useCallback(() => {
		setCollapsed((c) => !c);
	}, []);

	const onDragStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			if (collapsed) return;

			dragging.current = true;
			const startY = e.clientY;
			const startH = panelRef.current?.offsetHeight ?? panelHeight;
			const el = panelRef.current;

			if (el) el.style.transition = "none";

			function onMove(ev: MouseEvent) {
				if (!dragging.current) return;
				const maxH = window.innerHeight * MAX_RATIO;
				const newH = Math.min(maxH, Math.max(MIN_HEIGHT, startH + (ev.clientY - startY)));
				if (el) el.style.height = `${newH}px`;
			}

			function onUp(ev: MouseEvent) {
				dragging.current = false;
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);

				if (el) {
					el.style.transition = "";
					const maxH = window.innerHeight * MAX_RATIO;
					const finalH = Math.min(maxH, Math.max(MIN_HEIGHT, startH + (ev.clientY - startY)));
					setPanelHeight(finalH);
				}
			}

			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		},
		[collapsed, panelHeight],
	);

	const onHandleDoubleClick = useCallback(() => {
		setCollapsed((c) => !c);
	}, []);

	// ---- Shared elements ----

	const statusColor = STATUS_COLORS[task.status];
	const height = collapsed ? COLLAPSED_HEIGHT : panelHeight;

	const statusDropdownButton = (
		<button
			ref={statusTriggerRef}
			onClick={toggleStatusMenu}
			disabled={movingStatus}
			className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-elevated transition-colors flex-shrink-0"
		>
			<div
				className="w-2 h-2 rounded-full flex-shrink-0"
				style={{ background: statusColor }}
			/>
			<span className="text-[11px] font-medium text-fg-2">
				{t(statusKey(task.status))}
			</span>
			<svg className="w-3 h-3 text-fg-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	);

	const statusDropdownPortal = statusMenuOpen && createPortal(
		<div
			ref={statusMenuRef}
			className="fixed z-50 bg-overlay rounded-xl shadow-2xl shadow-black/40 border border-edge-active py-1.5 min-w-[180px]"
			style={{
				top: statusMenuPos.top,
				left: statusMenuPos.left,
				visibility: statusMenuVisible ? "visible" : "hidden",
			}}
			onClick={(e) => e.stopPropagation()}
		>
			<div className="px-3 py-2 text-xs text-fg-3 uppercase tracking-wider font-semibold">
				{t("task.moveTo")}
			</div>
			{getAllowedTransitions(task.status).map((s) => (
				<button
					key={s}
					onClick={() => handleStatusMove(s)}
					className="w-full text-left px-3 py-2 text-sm text-fg-2 hover:bg-elevated-hover hover:text-fg flex items-center gap-2.5 transition-colors"
				>
					<div
						className="w-2.5 h-2.5 rounded-full flex-shrink-0"
						style={{ background: STATUS_COLORS[s] }}
					/>
					{t(statusKey(s))}
				</button>
			))}
		</div>,
		document.body,
	);

	const branchStatusLoading = isTaskActive && task.worktreePath && !branchStatus ? (
		<span className="flex items-center gap-1 text-[11px] text-fg-muted flex-shrink-0">
			<svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
				<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
		</span>
	) : null;

	const branchStatusBadge = branchStatus && (branchStatus.ahead > 0 || branchStatus.behind > 0) ? (
		<span className="flex items-center gap-1.5 text-[11px] flex-shrink-0">
			{branchStatus.behind > 0 && branchStatus.ahead > 0 ? (
				<span className="font-medium">
					<span className="text-[#34d399]">{branchStatus.ahead} ahead</span>
					<span className="text-fg-muted"> · </span>
					<span className="text-[#fbbf24]">{branchStatus.behind} behind</span>
				</span>
			) : branchStatus.behind > 0 ? (
				<span className="text-[#fbbf24] font-medium">
					{t("infoPanel.commitsBehind", { count: String(branchStatus.behind) })}
				</span>
			) : (
				<span className="text-[#34d399] font-medium">
					{t("infoPanel.commitsAhead", { count: String(branchStatus.ahead) })}
				</span>
			)}
			{branchStatus.behind > 0 && (
				<button
					onClick={handleRebase}
					disabled={!branchStatus.canRebase || rebasing}
					className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
						!branchStatus.canRebase || rebasing
							? "text-fg-muted cursor-not-allowed bg-raised"
							: "text-accent hover:bg-accent/20 bg-accent/10"
					}`}
					title={!branchStatus.canRebase ? t("infoPanel.rebaseConflicts") : t("infoPanel.rebase")}
				>
					{rebasing ? t("infoPanel.rebasing") : t("infoPanel.rebase")}
				</button>
			)}
			{branchStatus.behind === 0 && branchStatus.ahead > 0 && (
				<button
					onClick={handleMerge}
					disabled={merging}
					className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
						merging
							? "text-fg-muted cursor-not-allowed bg-raised"
							: "text-accent hover:bg-accent/20 bg-accent/10"
					}`}
					title={t("infoPanel.merge")}
				>
					{merging ? t("infoPanel.merging") : t("infoPanel.merge")}
				</button>
			)}
		</span>
	) : null;

	const tmuxHintsInline = (
		<div className="flex items-center gap-2.5 flex-shrink-0">
			{/* Always-visible core shortcuts */}
			<div className="flex items-center gap-2 text-[10px] text-fg-3">
				<span className="flex items-center gap-0.5">
					<Kbd>⌃B</Kbd><Kbd>−</Kbd>
					<span className="ml-0.5 hidden xl:inline">split</span>
				</span>
				<span className="flex items-center gap-0.5">
					<Kbd>⌃B</Kbd><Kbd>|</Kbd>
					<span className="ml-0.5 hidden xl:inline">vert</span>
				</span>
				<span className="flex items-center gap-0.5">
					<Kbd>⌃B</Kbd><Kbd>Z</Kbd>
					<span className="ml-0.5 hidden xl:inline">zoom</span>
				</span>
			</div>

			{/* Info button */}
			<button
				ref={tmuxTriggerRef}
				onClick={() => setTmuxOpen(!tmuxOpen)}
				className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-fg-3 hover:text-fg hover:bg-elevated transition-colors border border-edge hover:border-edge-active"
				title={t("tmux.infoTooltip")}
			>
				<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
					<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
				</svg>
			</button>

			{tmuxOpen && <TmuxHintsPopover onClose={() => setTmuxOpen(false)} triggerRef={tmuxTriggerRef} />}
		</div>
	);

	const devServerButton = (
		<button
			onClick={handleDevServer}
			disabled={devServerDisabled}
			className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${
				devServerDisabled
					? "text-fg-muted cursor-not-allowed"
					: "text-fg-3 hover:text-fg hover:bg-elevated"
			}`}
			title={devServerDisabled ? t("header.devServerDisabled") : t("header.devServer")}
		>
			<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
					d="M5 12h14M12 5l7 7-7 7" />
			</svg>
			<span className="text-[11px] font-medium">{t("header.devServer")}</span>
		</button>
	);

	return (
		<div
			ref={panelRef}
			className="flex-shrink-0 border-b border-edge glass-header overflow-hidden transition-[height] duration-200 ease-out"
			style={{ height }}
		>
			{collapsed ? (
				/* ---- Collapsed: single row ---- */
				<div className="flex items-center h-full px-4 gap-1.5 min-w-0">
					{statusDropdownButton}
					{statusDropdownPortal}
					{task.branchName && (
						<>
							<span className="text-fg-muted text-xs flex-shrink-0">|</span>
							<span className="text-fg-3 text-xs font-mono truncate max-w-[200px] flex-shrink-0">
								{task.branchName}
							</span>
						</>
					)}
					{(branchStatusBadge || branchStatusLoading) && (
						<>
							<span className="text-fg-muted text-xs flex-shrink-0">|</span>
							{branchStatusBadge || branchStatusLoading}
						</>
					)}
					<div className="flex-1" />
					{tmuxHintsInline}
					{devServerButton}
					<button
						onClick={toggleCollapsed}
						className="flex-shrink-0 p-1 rounded hover:bg-elevated transition-colors text-fg-3 hover:text-fg"
						title={t("infoPanel.expand")}
					>
						<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>
			) : (
				/* ---- Expanded ---- */
				<div className="flex flex-col h-full">
					{/* Header row with controls */}
					<div className="flex items-center px-4 py-2 gap-2 min-w-0">
						{statusDropdownButton}
						{statusDropdownPortal}
						{task.branchName && (
							<>
								<span className="text-fg-muted text-xs flex-shrink-0">|</span>
								<span className="text-fg-3 text-xs font-mono truncate max-w-[200px] flex-shrink-0">
									{task.branchName}
								</span>
							</>
						)}
						{branchStatusBadge && (
							<>
								<span className="text-fg-muted text-xs flex-shrink-0">|</span>
								{branchStatusBadge}
							</>
						)}
						<div className="flex-1" />
						{tmuxHintsInline}
						{devServerButton}
						<button
							onClick={toggleCollapsed}
							className="flex-shrink-0 p-1 rounded hover:bg-elevated transition-colors text-fg-3 hover:text-fg"
							title={t("infoPanel.collapse")}
						>
							<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
							</svg>
						</button>
					</div>

					{/* Metadata grid */}
					<div className="flex-1 overflow-auto px-4 pb-2">
						<div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
							{task.branchName && (
								<>
									<span className="text-fg-3">{t("infoPanel.branch")}</span>
									<span className="text-fg-2 font-mono">{task.branchName}</span>
								</>
							)}

							{task.description && (
								<>
									<span className="text-fg-3">{t("infoPanel.description")}</span>
									<span className="text-fg-2 whitespace-pre-wrap">{task.description}</span>
								</>
							)}

							{task.worktreePath && (
								<>
									<span className="text-fg-3">{t("infoPanel.worktree")}</span>
									<span className="text-fg-3 font-mono truncate">{task.worktreePath}</span>
								</>
							)}

							<span className="text-fg-3">{t("infoPanel.created")}</span>
							<span className="text-fg-3">{formatDate(task.createdAt)}</span>

							<span className="text-fg-3">{t("infoPanel.updated")}</span>
							<span className="text-fg-3">{formatDate(task.updatedAt)}</span>
						</div>
					</div>

					{/* Drag handle */}
					<div
						className="flex-shrink-0 flex items-center justify-center h-[6px] cursor-row-resize group"
						onMouseDown={onDragStart}
						onDoubleClick={onHandleDoubleClick}
					>
						<div className="w-8 h-[3px] rounded-full bg-fg-muted/40 group-hover:bg-fg-muted/70 transition-colors" />
					</div>
				</div>
			)}
		</div>
	);
}

export default TaskInfoPanel;
