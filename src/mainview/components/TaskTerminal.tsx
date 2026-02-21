import { useEffect, useState } from "react";
import type { Task } from "../../shared/types";
import type { Route } from "../state";
import { api } from "../rpc";
import TerminalView from "../TerminalView";

interface TaskTerminalProps {
	projectId: string;
	taskId: string;
	tasks: Task[];
	navigate: (route: Route) => void;
}

function TaskTerminal({ projectId, taskId, tasks, navigate }: TaskTerminalProps) {
	const [ptyUrl, setPtyUrl] = useState<string | null>(null);
	const task = tasks.find((t) => t.id === taskId);

	useEffect(() => {
		(async () => {
			try {
				const url = await api.request.getPtyUrl({ taskId });
				setPtyUrl(url);
			} catch (err) {
				console.error("Failed to get PTY URL:", err);
			}
		})();
	}, [taskId]);

	return (
		<div className="h-full w-full flex flex-col bg-[#0f1014]">
			{/* Header */}
			<div className="flex items-center gap-3 px-4 py-2 border-b border-[#1e2030]">
				<button
					onClick={() => navigate({ screen: "project", projectId })}
					className="text-[#3b4261] hover:text-[#c0caf5] transition-colors p-1 rounded-md hover:bg-[#1e2030]"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
				{task && (
					<span className="text-[#a9b1d6] text-xs font-medium truncate">
						{task.title}
					</span>
				)}
			</div>

			{/* Terminal */}
			<div className="flex-1 min-h-0">
				{ptyUrl ? (
					<TerminalView ptyUrl={ptyUrl} taskId={taskId} />
				) : (
					<div className="flex items-center justify-center h-full">
						<div className="flex items-center gap-2">
							<div className="w-1 h-1 rounded-full bg-[#7aa2f7] animate-pulse" />
							<span className="text-[#3b4261] text-xs">
								Connecting...
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default TaskTerminal;
