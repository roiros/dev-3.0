import { useState, useEffect, type Dispatch } from "react";
import type { Project, Task } from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";
import { useT } from "../i18n";
import { labelColor } from "../utils/label-color";
import KanbanBoard from "./KanbanBoard";

interface ProjectViewProps {
	projectId: string;
	projects: Project[];
	tasks: Task[];
	dispatch: Dispatch<AppAction>;
	navigate: (route: Route) => void;
	bellCounts: Map<string, number>;
}

function ProjectView({
	projectId,
	projects,
	tasks,
	dispatch,
	navigate,
	bellCounts,
}: ProjectViewProps) {
	const t = useT();
	const project = projects.find((p) => p.id === projectId);
	const [activeLabels, setActiveLabels] = useState<string[]>([]);

	useEffect(() => {
		(async () => {
			try {
				const tasks = await api.request.getTasks({ projectId });
				dispatch({ type: "setTasks", tasks });
			} catch (err) {
				console.error("Failed to load tasks:", err);
			}
		})();
		// Reset label filter when switching projects
		setActiveLabels([]);
	}, [projectId, dispatch]);

	if (!project) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<span className="text-danger text-base">{t("project.notFound")}</span>
			</div>
		);
	}

	const allLabels = [...new Set(tasks.flatMap((t) => t.labels ?? []))];

	function toggleLabel(label: string) {
		setActiveLabels((prev) =>
			prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
		);
	}

	return (
		<div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
			{/* Label filter bar — only shown when tasks have labels */}
			{allLabels.length > 0 && (
				<div className="flex-shrink-0 flex items-center gap-2 flex-wrap px-6 pt-3 pb-1">
					<span className="text-fg-muted text-xs font-medium">{t("labels.filter")}</span>
					{allLabels.map((label) => {
						const isActive = activeLabels.includes(label);
						const c = labelColor(label);
						return (
							<button
								key={label}
								onClick={() => toggleLabel(label)}
								className="text-xs font-medium px-2 py-0.5 rounded-full border transition-all"
								style={
									isActive
										? { color: c, borderColor: c, backgroundColor: `${c}25` }
										: { color: "var(--color-fg-muted)", borderColor: "var(--color-border-edge)", backgroundColor: "transparent" }
								}
							>
								{label}
							</button>
						);
					})}
					{activeLabels.length > 0 && (
						<button
							onClick={() => setActiveLabels([])}
							className="text-xs text-fg-3 hover:text-fg transition-colors ml-1"
						>
							{t("labels.clearFilter")}
						</button>
					)}
				</div>
			)}
			<KanbanBoard
				project={project}
				tasks={tasks}
				dispatch={dispatch}
				navigate={navigate}
				bellCounts={bellCounts}
				activeLabels={activeLabels}
			/>
		</div>
	);
}

export default ProjectView;
