import { Fragment } from "react";
import type { Project, Task } from "../../shared/types";
import type { Route } from "../state";

interface GlobalHeaderProps {
	route: Route;
	projects: Project[];
	tasks: Task[];
	navigate: (route: Route) => void;
}

interface BreadcrumbSegment {
	label: string;
	onClick?: () => void;
}

function GlobalHeader({ route, projects, tasks, navigate }: GlobalHeaderProps) {
	const segments: BreadcrumbSegment[] = [];

	// App name — always present
	segments.push({
		label: "dev-3.0",
		onClick:
			route.screen !== "dashboard"
				? () => navigate({ screen: "dashboard" })
				: undefined,
	});

	// Project name — when inside a project
	if ("projectId" in route) {
		const project = projects.find((p) => p.id === route.projectId);
		if (project) {
			segments.push({
				label: project.name,
				onClick:
					route.screen !== "project"
						? () =>
								navigate({
									screen: "project",
									projectId: route.projectId,
								})
						: undefined,
			});
		}
	}

	// Last segment — screen-specific
	if (route.screen === "task") {
		const task = tasks.find((t) => t.id === route.taskId);
		segments.push({ label: task?.title || "Task" });
	} else if (route.screen === "project-settings") {
		segments.push({ label: "Settings" });
	} else if (route.screen === "settings") {
		segments.push({ label: "Settings" });
	}

	return (
		<div className="flex items-center justify-between px-5 py-2.5 border-b border-edge flex-shrink-0">
			{/* Breadcrumbs */}
			<div className="flex items-center gap-2 text-sm min-w-0 overflow-hidden">
				{segments.map((seg, i) => (
					<Fragment key={i}>
						{i > 0 && (
							<span className="text-fg-muted flex-shrink-0">
								/
							</span>
						)}
						{seg.onClick ? (
							<button
								onClick={seg.onClick}
								className="text-fg-3 hover:text-fg transition-colors truncate"
							>
								{seg.label}
							</button>
						) : (
							<span className="text-fg font-semibold truncate">
								{seg.label}
							</span>
						)}
					</Fragment>
				))}
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1 flex-shrink-0">
				{/* Project settings gear — only on project kanban screen */}
				{"projectId" in route && route.screen === "project" && (
					<button
						onClick={() =>
							navigate({
								screen: "project-settings",
								projectId: route.projectId,
							})
						}
						className="text-fg-3 hover:text-fg transition-colors p-1.5 rounded-lg hover:bg-elevated"
						title="Project Settings"
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
								strokeWidth={1.5}
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</button>
				)}

				{/* Global settings */}
				{route.screen !== "settings" && (
					<button
						onClick={() => navigate({ screen: "settings" })}
						className="text-fg-3 hover:text-fg transition-colors p-1.5 rounded-lg hover:bg-elevated"
						title="Settings"
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
								strokeWidth={1.5}
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
							/>
						</svg>
					</button>
				)}
			</div>
		</div>
	);
}

export default GlobalHeader;
