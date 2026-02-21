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
		<div className="flex flex-col flex-shrink-0 w-[200px] h-full bg-[#13141c] rounded-xl overflow-hidden">
			{/* Color accent */}
			<div className="h-[3px] flex-shrink-0" style={{ background: color }} />

			{/* Column header */}
			<div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
				<div className="flex items-center gap-2">
					<div
						className="w-2 h-2 rounded-full flex-shrink-0"
						style={{ background: color }}
					/>
					<span className="text-[#a9b1d6] text-xs font-medium">
						{label}
					</span>
				</div>
				{tasks.length > 0 && (
					<span
						className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
						style={{
							color,
							background: `${color}15`,
						}}
					>
						{tasks.length}
					</span>
				)}
			</div>

			{/* Tasks */}
			<div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
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
					<div className="text-[#292e42] text-[11px] text-center py-6">
						No tasks
					</div>
				)}
			</div>

			{/* Add task (only in To Do column) */}
			{status === "todo" && (
				<div className="px-2 pb-2 flex-shrink-0">
					{adding ? (
						<div className="space-y-1.5">
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
								className="w-full px-2.5 py-1.5 bg-[#1a1b26] border border-[#292e42] rounded-lg text-[#c0caf5] text-xs placeholder-[#3b4261] outline-none focus:border-[#7aa2f7]/50 transition-colors"
							/>
							<div className="flex gap-1.5">
								<button
									onClick={handleCreate}
									className="flex-1 px-2 py-1 bg-[#7aa2f7] text-[#0f1014] text-xs font-medium rounded-md hover:bg-[#89b4fa] transition-colors"
								>
									Add
								</button>
								<button
									onClick={() => setAdding(false)}
									className="px-2 py-1 text-[#3b4261] text-xs hover:text-[#c0caf5] transition-colors"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setAdding(true)}
							className="w-full text-[#3b4261] hover:text-[#7aa2f7] text-xs text-center py-1.5 rounded-lg hover:bg-[#7aa2f7]/5 transition-all"
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
