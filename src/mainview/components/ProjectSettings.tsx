import { useState, type Dispatch } from "react";
import type { Project } from "../../shared/types";
import type { AppAction, Route } from "../state";
import { api } from "../rpc";

interface ProjectSettingsProps {
	projectId: string;
	projects: Project[];
	dispatch: Dispatch<AppAction>;
	navigate: (route: Route) => void;
}

function ProjectSettings({
	projectId,
	projects,
	dispatch,
	navigate,
}: ProjectSettingsProps) {
	const project = projects.find((p) => p.id === projectId);

	const [setupScript, setSetupScript] = useState(project?.setupScript || "");
	const [defaultTmuxCommand, setDefaultTmuxCommand] = useState(
		project?.defaultTmuxCommand || "claude",
	);
	const [defaultBaseBranch, setDefaultBaseBranch] = useState(
		project?.defaultBaseBranch || "main",
	);
	const [saving, setSaving] = useState(false);

	if (!project) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-[#0f1014]">
				<span className="text-[#f7768e] text-sm">Project not found</span>
			</div>
		);
	}

	async function handleSave() {
		setSaving(true);
		try {
			const updated = await api.request.updateProjectSettings({
				projectId,
				setupScript,
				defaultTmuxCommand,
				defaultBaseBranch,
			});
			dispatch({ type: "updateProject", project: updated });
			navigate({ screen: "project", projectId });
		} catch (err) {
			alert(`Failed to save settings: ${err}`);
		}
		setSaving(false);
	}

	return (
		<div className="h-full w-full flex flex-col bg-[#0f1014]">
			{/* Header */}
			<div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2030]">
				<button
					onClick={() => navigate({ screen: "project", projectId })}
					className="text-[#3b4261] hover:text-[#c0caf5] transition-colors p-1 -ml-1 rounded-md hover:bg-[#1e2030]"
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
				<span className="text-[#c0caf5] font-semibold text-sm">
					Settings
				</span>
				<span className="text-[#3b4261] text-xs">{project.name}</span>
			</div>

			{/* Form */}
			<div className="flex-1 overflow-y-auto p-6">
				<div className="max-w-lg space-y-6">
					{/* Setup Script */}
					<div>
						<label className="block text-[#a9b1d6] text-xs font-medium mb-1.5">
							Setup Script
						</label>
						<p className="text-[#3b4261] text-[11px] mb-2">
							Runs in the worktree directory after creation
						</p>
						<textarea
							value={setupScript}
							onChange={(e) => setSetupScript(e.target.value)}
							rows={4}
							placeholder="bun install"
							className="w-full px-3 py-2 bg-[#13141c] border border-[#1e2030] rounded-lg text-[#c0caf5] text-xs font-mono placeholder-[#292e42] outline-none focus:border-[#7aa2f7]/30 transition-colors resize-y"
						/>
					</div>

					{/* Default Tmux Command */}
					<div>
						<label className="block text-[#a9b1d6] text-xs font-medium mb-1.5">
							Default Command
						</label>
						<p className="text-[#3b4261] text-[11px] mb-2">
							Command to run inside tmux for new tasks
						</p>
						<input
							type="text"
							value={defaultTmuxCommand}
							onChange={(e) => setDefaultTmuxCommand(e.target.value)}
							placeholder="claude"
							className="w-full px-3 py-2 bg-[#13141c] border border-[#1e2030] rounded-lg text-[#c0caf5] text-xs placeholder-[#292e42] outline-none focus:border-[#7aa2f7]/30 transition-colors"
						/>
					</div>

					{/* Default Base Branch */}
					<div>
						<label className="block text-[#a9b1d6] text-xs font-medium mb-1.5">
							Base Branch
						</label>
						<p className="text-[#3b4261] text-[11px] mb-2">
							Branch to create worktrees from
						</p>
						<input
							type="text"
							value={defaultBaseBranch}
							onChange={(e) => setDefaultBaseBranch(e.target.value)}
							placeholder="main"
							className="w-full px-3 py-2 bg-[#13141c] border border-[#1e2030] rounded-lg text-[#c0caf5] text-xs placeholder-[#292e42] outline-none focus:border-[#7aa2f7]/30 transition-colors"
						/>
					</div>

					{/* Save Button */}
					<button
						onClick={handleSave}
						disabled={saving}
						className="px-5 py-2 bg-[#7aa2f7] text-[#0f1014] text-xs font-medium rounded-lg hover:bg-[#89b4fa] disabled:opacity-50 transition-colors"
					>
						{saving ? "Saving..." : "Save Settings"}
					</button>
				</div>
			</div>
		</div>
	);
}

export default ProjectSettings;
