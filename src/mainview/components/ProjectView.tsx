import { useEffect, type Dispatch } from "react";
import type { Project, Task } from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";
import KanbanBoard from "./KanbanBoard";

interface ProjectViewProps {
	projectId: string;
	projects: Project[];
	tasks: Task[];
	dispatch: Dispatch<AppAction>;
	navigate: (route: Route) => void;
}

function ProjectView({
	projectId,
	projects,
	tasks,
	dispatch,
	navigate,
}: ProjectViewProps) {
	const project = projects.find((p) => p.id === projectId);

	useEffect(() => {
		(async () => {
			try {
				const tasks = await api.request.getTasks({ projectId });
				dispatch({ type: "setTasks", tasks });
			} catch (err) {
				console.error("Failed to load tasks:", err);
			}
		})();
	}, [projectId, dispatch]);

	if (!project) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<span className="text-danger text-base">Project not found</span>
			</div>
		);
	}

	return (
		<div className="h-full w-full overflow-hidden">
			<KanbanBoard
				project={project}
				tasks={tasks}
				dispatch={dispatch}
				navigate={navigate}
			/>
		</div>
	);
}

export default ProjectView;
