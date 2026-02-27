import { useEffect, useRef, useState } from "react";
import type { Task } from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";
import { useT } from "../i18n";
import TerminalView from "../TerminalView";

interface TaskTerminalProps {
	projectId: string;
	taskId: string;
	tasks: Task[];
	navigate: (route: Route) => void;
	dispatch: React.Dispatch<AppAction>;
}

const PTY_CONNECT_TIMEOUT_MS = 10_000;

function TaskTerminal({ projectId, taskId, tasks, navigate, dispatch }: TaskTerminalProps) {
	const t = useT();
	const [ptyUrl, setPtyUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [moving, setMoving] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const task = tasks.find((t) => t.id === taskId);

	useEffect(() => {
		(async () => {
			try {
				const url = await api.request.getPtyUrl({ taskId });
				setPtyUrl(url);
			} catch (err) {
				console.error("Failed to get PTY URL:", err);
				setError(task?.worktreePath ?? taskId);
			}
		})();
	}, [taskId]);

	// Timeout: if PTY URL was fetched but terminal doesn't connect,
	// the ptyDied event will fire and we catch it below.
	// For getPtyUrl success + broken session: listen for ptyDied.
	useEffect(() => {
		function onPtyDied(e: Event) {
			const detail = (e as CustomEvent).detail;
			if (detail?.taskId === taskId) {
				setError(task?.worktreePath ?? taskId);
			}
		}
		window.addEventListener("rpc:ptyDied", onPtyDied);
		return () => window.removeEventListener("rpc:ptyDied", onPtyDied);
	}, [taskId, task?.worktreePath]);

	// Fallback timeout for cases where ptyDied doesn't fire
	useEffect(() => {
		if (ptyUrl && !error) {
			timeoutRef.current = setTimeout(() => {
				// If still no error and URL set but nothing connected, set error
				// This is a safety net; ptyDied usually fires first.
			}, PTY_CONNECT_TIMEOUT_MS);
		}
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [ptyUrl, error]);

	async function handleMove(newStatus: "completed" | "cancelled") {
		setMoving(true);
		try {
			const updated = await api.request.moveTask({ taskId, projectId, newStatus });
			dispatch({ type: "updateTask", task: updated });
			navigate({ screen: "project", projectId });
		} catch (err) {
			console.error("Failed to move task:", err);
			setMoving(false);
		}
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="bg-raised border border-edge rounded-lg p-6 max-w-md w-full space-y-4">
					<div className="flex items-center gap-2 text-danger font-medium">
						<span className="text-lg">&#9888;</span>
						<span>{t("terminal.envError")}</span>
					</div>
					<div className="space-y-2">
						<p className="text-fg-2 text-sm">{t("terminal.errorPath")}</p>
						<code className="block bg-base text-fg-3 text-xs px-3 py-2 rounded border border-edge select-all break-all">
							{error}
						</code>
					</div>
					<p className="text-fg-3 text-sm">{t("terminal.worktreeNotFound")}</p>
					<div className="flex gap-3 pt-2">
						<button
							onClick={() => handleMove("completed")}
							disabled={moving}
							className="flex-1 px-4 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
						>
							{t("terminal.complete")}
						</button>
						<button
							onClick={() => handleMove("cancelled")}
							disabled={moving}
							className="flex-1 px-4 py-2 bg-danger/10 text-danger rounded text-sm font-medium hover:bg-danger/20 disabled:opacity-50 transition-colors"
						>
							{t("terminal.cancelTask")}
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full w-full">
			{ptyUrl ? (
				<TerminalView ptyUrl={ptyUrl} taskId={taskId} />
			) : (
				<div className="flex items-center justify-center h-full">
					<div className="flex items-center gap-3">
						<div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
						<span className="text-fg-3 text-sm">{t("terminal.connecting")}</span>
					</div>
				</div>
			)}
		</div>
	);
}

export default TaskTerminal;
