import type { Dispatch } from "react";
import type { Project } from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";

interface DashboardProps {
	projects: Project[];
	dispatch: Dispatch<AppAction>;
	navigate: (route: Route) => void;
}

function Dashboard({ projects, dispatch, navigate }: DashboardProps) {
	async function handleAddProject() {
		try {
			const folder = await api.request.pickFolder();
			if (!folder) return;

			const name = folder.split("/").pop() || folder;
			const result = await api.request.addProject({ path: folder, name });

			if (result.ok) {
				dispatch({ type: "addProject", project: result.project });
			} else {
				alert(result.error);
			}
		} catch (err) {
			alert(`Failed to add project: ${err}`);
		}
	}

	async function handleRemoveProject(projectId: string) {
		if (!confirm("Remove this project from the list?")) return;
		try {
			await api.request.removeProject({ projectId });
			dispatch({ type: "removeProject", projectId });
		} catch (err) {
			alert(`Failed to remove project: ${err}`);
		}
	}

	return (
		<div className="h-full w-full flex flex-col bg-[#0f1014]">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2030]">
				<div className="flex items-center gap-3">
					<div className="w-2 h-2 rounded-full bg-[#7aa2f7]" />
					<span className="text-[#c0caf5] font-semibold text-base tracking-tight">
						dev-3.0
					</span>
				</div>
				<button
					onClick={handleAddProject}
					className="px-4 py-1.5 bg-[#7aa2f7]/10 text-[#7aa2f7] text-sm font-medium rounded-lg hover:bg-[#7aa2f7]/20 border border-[#7aa2f7]/20 transition-all"
				>
					Add Project
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6">
				{projects.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-[#565f89]">
						<div className="w-16 h-16 rounded-2xl bg-[#16161e] flex items-center justify-center mb-4">
							<svg
								className="w-8 h-8 text-[#3b4261]"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
								/>
							</svg>
						</div>
						<p className="text-sm font-medium mb-1">No projects yet</p>
						<p className="text-xs text-[#3b4261]">
							Add a git repository to get started
						</p>
					</div>
				) : (
					<div className="max-w-2xl mx-auto space-y-2">
						{projects.map((project) => (
							<div
								key={project.id}
								className="group flex items-center gap-4 p-4 bg-[#16161e] rounded-xl hover:bg-[#1a1e2e] transition-all cursor-pointer"
								onClick={() =>
									navigate({ screen: "project", projectId: project.id })
								}
							>
								<div className="w-10 h-10 rounded-lg bg-[#7aa2f7]/10 flex items-center justify-center flex-shrink-0">
									<svg
										className="w-5 h-5 text-[#7aa2f7]"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.5}
											d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
										/>
									</svg>
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-[#c0caf5] font-medium text-sm truncate">
										{project.name}
									</div>
									<div className="text-[#3b4261] text-xs mt-0.5 truncate font-mono">
										{project.path}
									</div>
								</div>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleRemoveProject(project.id);
									}}
									className="opacity-0 group-hover:opacity-100 text-[#3b4261] hover:text-[#f7768e] text-xs transition-all px-2 py-1 rounded hover:bg-[#f7768e]/10"
								>
									Remove
								</button>
								<svg
									className="w-4 h-4 text-[#3b4261] group-hover:text-[#565f89] transition-colors flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export default Dashboard;
