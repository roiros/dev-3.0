import { useState, useRef, useEffect, type Dispatch } from "react";
import type { Project, Task, TaskStatus } from "../../shared/types";
import {
	ALL_STATUSES,
	ACTIVE_STATUSES,
	STATUS_LABELS,
	STATUS_COLORS,
} from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";

interface TaskCardProps {
	task: Task;
	project: Project;
	dispatch: Dispatch<AppAction>;
	navigate: (route: Route) => void;
}

function TaskCard({ task, project, dispatch, navigate }: TaskCardProps) {
	const [moving, setMoving] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
	const menuRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const isActive = ACTIVE_STATUSES.includes(task.status);
	const color = STATUS_COLORS[task.status];

	// Close menu on click outside
	useEffect(() => {
		if (!menuOpen) return;
		function handleClick(e: MouseEvent) {
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as Node) &&
				triggerRef.current &&
				!triggerRef.current.contains(e.target as Node)
			) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [menuOpen]);

	function toggleMenu(e: React.MouseEvent) {
		e.stopPropagation();
		if (!menuOpen && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setMenuPos({ top: rect.bottom + 4, left: rect.left });
		}
		setMenuOpen(!menuOpen);
	}

	async function handleMove(newStatus: TaskStatus) {
		setMoving(true);
		setMenuOpen(false);
		try {
			const updated = await api.request.moveTask({
				taskId: task.id,
				projectId: project.id,
				newStatus,
			});
			dispatch({ type: "updateTask", task: updated });
		} catch (err) {
			alert(`Failed to move task: ${err}`);
		}
		setMoving(false);
	}

	async function handleDelete() {
		setMenuOpen(false);
		if (!confirm(`Delete task "${task.title}"?`)) return;
		try {
			await api.request.deleteTask({
				taskId: task.id,
				projectId: project.id,
			});
			dispatch({ type: "removeTask", taskId: task.id });
		} catch (err) {
			alert(`Failed to delete task: ${err}`);
		}
	}

	function handleClick() {
		if (isActive && !menuOpen) {
			navigate({
				screen: "task",
				projectId: project.id,
				taskId: task.id,
			});
		}
	}

	return (
		<div
			className={`group p-2.5 bg-[#1a1b26] rounded-lg text-xs transition-all ${
				isActive
					? "cursor-pointer hover:bg-[#1e2030] hover:shadow-lg hover:shadow-black/20"
					: "opacity-60"
			} ${moving ? "opacity-50 pointer-events-none" : ""}`}
			onClick={handleClick}
		>
			{/* Title */}
			<div className="text-[#c0caf5] text-[12px] leading-relaxed break-words pr-5">
				{task.title}
			</div>

			{/* Bottom row: status badge + actions */}
			<div className="flex items-center justify-between mt-2">
				<button
					ref={triggerRef}
					onClick={toggleMenu}
					className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-white/5 transition-colors"
					disabled={moving}
				>
					<div
						className="w-1.5 h-1.5 rounded-full flex-shrink-0"
						style={{ background: color }}
					/>
					<span className="text-[10px] text-[#565f89]">
						{STATUS_LABELS[task.status]}
					</span>
				</button>

				{/* Delete button — visible on hover */}
				<button
					onClick={(e) => {
						e.stopPropagation();
						handleDelete();
					}}
					className="opacity-0 group-hover:opacity-100 text-[#3b4261] hover:text-[#f7768e] transition-all p-0.5 rounded hover:bg-[#f7768e]/10"
					title="Delete"
				>
					<svg
						className="w-3 h-3"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			{/* Status dropdown menu */}
			{menuOpen && (
				<div
					ref={menuRef}
					className="fixed z-50 bg-[#1e2030] rounded-lg shadow-xl shadow-black/40 border border-[#292e42] py-1 min-w-[160px]"
					style={{ top: menuPos.top, left: menuPos.left }}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="px-2.5 py-1.5 text-[10px] text-[#3b4261] uppercase tracking-wider font-medium">
						Move to
					</div>
					{ALL_STATUSES.filter((s) => s !== task.status).map((s) => (
						<button
							key={s}
							onClick={() => handleMove(s)}
							className="w-full text-left px-2.5 py-1.5 text-[11px] text-[#a9b1d6] hover:bg-[#292e42] flex items-center gap-2 transition-colors"
						>
							<div
								className="w-2 h-2 rounded-full flex-shrink-0"
								style={{ background: STATUS_COLORS[s] }}
							/>
							{STATUS_LABELS[s]}
						</button>
					))}
					<div className="border-t border-[#292e42] mt-1 pt-1">
						<button
							onClick={handleDelete}
							className="w-full text-left px-2.5 py-1.5 text-[11px] text-[#f7768e] hover:bg-[#f7768e]/10 flex items-center gap-2 transition-colors"
						>
							<svg
								className="w-3 h-3 flex-shrink-0"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
							Delete
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default TaskCard;
