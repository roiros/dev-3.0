import { useState, type Dispatch } from "react";
import type { Project, Task, TaskStatus } from "../../shared/types";
import { STATUS_COLORS } from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";
import TaskCard from "./TaskCard";

interface KanbanColumnProps {
	status: TaskStatus;
	label: string;
	tasks: Task[];
	project: Project;
	dispatch: Dispatch<AppAction>;
	navigate: (route: Route) => void;
}

function KanbanColumn({
	status,
	label,
	tasks,
	project,
	dispatch,
	navigate,
}: KanbanColumnProps) {
	const [newTitle, setNewTitle] = useState("");
	const [adding, setAdding] = useState(false);
	const color = STATUS_COLORS[status];

	async function handleCreate() {
		const title = newTitle.trim();
		if (!title) return;
		try {
			const task = await api.request.createTask({
				projectId: project.id,
				title,
			});
			dispatch({ type: "addTask", task });
			setNewTitle("");
			setAdding(false);
		} catch (err) {
			alert(`Failed to create task: ${err}`);
		}
	}

	return (
		<div className="flex flex-col flex-shrink-0 w-[240px] h-full bg-[#1e2133] rounded-2xl overflow-hidden border border-[#2a2e48]">
			{/* Column header */}
			<div
				className="px-4 py-3.5 flex-shrink-0"
				style={{ borderBottom: `2px solid ${color}30` }}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div
							className="w-3 h-3 rounded-full flex-shrink-0"
							style={{ background: color }}
						/>
						<span className="text-[#eceef8] text-sm font-semibold">
							{label}
						</span>
					</div>
					{tasks.length > 0 && (
						<span
							className="text-xs font-bold px-2 py-0.5 rounded-full"
							style={{
								color,
								background: `${color}18`,
							}}
						>
							{tasks.length}
						</span>
					)}
				</div>
			</div>

			{/* Tasks */}
			<div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
				{tasks.map((task) => (
					<TaskCard
						key={task.id}
						task={task}
						project={project}
						dispatch={dispatch}
						navigate={navigate}
					/>
				))}

				{tasks.length === 0 && !adding && (
					<div className="text-[#4e5380] text-sm text-center py-8">
						No tasks
					</div>
				)}
			</div>

			{/* Add task (only in To Do column) */}
			{status === "todo" && (
				<div className="px-3 pb-3 flex-shrink-0">
					{adding ? (
						<div className="space-y-2">
							<input
								type="text"
								value={newTitle}
								onChange={(e) => setNewTitle(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleCreate();
									if (e.key === "Escape") setAdding(false);
								}}
								placeholder="Task title..."
								autoFocus
								className="w-full px-3 py-2.5 bg-[#262940] border border-[#3d4268] rounded-xl text-[#eceef8] text-sm placeholder-[#4e5380] outline-none focus:border-[#5e9eff]/50 transition-colors"
							/>
							<div className="flex gap-2">
								<button
									onClick={handleCreate}
									className="flex-1 px-3 py-2 bg-[#5e9eff] text-white text-sm font-semibold rounded-xl hover:bg-[#4d8bff] transition-colors"
								>
									Add
								</button>
								<button
									onClick={() => setAdding(false)}
									className="px-3 py-2 text-[#6b7094] text-sm hover:text-[#eceef8] transition-colors"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setAdding(true)}
							className="w-full text-[#6b7094] hover:text-[#5e9eff] text-sm font-medium text-center py-2.5 rounded-xl hover:bg-[#5e9eff]/8 border border-dashed border-[#2a2e48] hover:border-[#5e9eff]/30 transition-all"
						>
							+ New Task
						</button>
					)}
				</div>
			)}
		</div>
	);
}

export default KanbanColumn;
