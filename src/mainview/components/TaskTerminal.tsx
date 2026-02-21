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
		<div className="h-full w-full flex flex-col bg-[#171924]">
			{/* Header */}
			<div className="flex items-center gap-4 px-5 py-3 border-b border-[#2a2e48]">
				<button
					onClick={() => navigate({ screen: "project", projectId })}
					className="text-[#6b7094] hover:text-[#eceef8] transition-colors p-1.5 rounded-lg hover:bg-[#262940]"
				>
					<svg
						className="w-5 h-5"
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
					<span className="text-[#eceef8] text-sm font-semibold truncate">
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
						<div className="flex items-center gap-3">
							<div className="w-2 h-2 rounded-full bg-[#5e9eff] animate-pulse" />
							<span className="text-[#6b7094] text-sm">
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
