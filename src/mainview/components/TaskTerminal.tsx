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

function TaskTerminal({ taskId }: TaskTerminalProps) {
	const [ptyUrl, setPtyUrl] = useState<string | null>(null);

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
		<div className="h-full w-full">
			{ptyUrl ? (
				<TerminalView ptyUrl={ptyUrl} taskId={taskId} />
			) : (
				<div className="flex items-center justify-center h-full">
					<div className="flex items-center gap-3">
						<div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
						<span className="text-fg-3 text-sm">Connecting...</span>
					</div>
				</div>
			)}
		</div>
	);
}

export default TaskTerminal;
