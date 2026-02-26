import { useReducer } from "react";
import type { Project, Task } from "../shared/types";

// ---- Routes ----

export type Route =
	| { screen: "dashboard" }
	| { screen: "project"; projectId: string }
	| { screen: "task"; projectId: string; taskId: string }
	| { screen: "project-settings"; projectId: string }
	| { screen: "settings" };

// ---- State ----

export interface AppState {
	route: Route;
	projects: Project[];
	currentProjectTasks: Task[];
	loading: boolean;
	bellTaskIds: Set<string>;
}

export const initialState: AppState = {
	route: { screen: "dashboard" },
	projects: [],
	currentProjectTasks: [],
	loading: true,
	bellTaskIds: new Set(),
};

// ---- Actions ----

export type AppAction =
	| { type: "navigate"; route: Route }
	| { type: "setProjects"; projects: Project[] }
	| { type: "setTasks"; tasks: Task[] }
	| { type: "updateTask"; task: Task }
	| { type: "addTask"; task: Task }
	| { type: "removeTask"; taskId: string }
	| { type: "spawnVariants"; sourceTaskId: string; variants: Task[] }
	| { type: "addProject"; project: Project }
	| { type: "removeProject"; projectId: string }
	| { type: "updateProject"; project: Project }
	| { type: "setLoading"; loading: boolean }
	| { type: "addBell"; taskId: string }
	| { type: "clearBell"; taskId: string };

export function reducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "navigate": {
			// Auto-clear bell when user opens the task terminal
			let bellTaskIds = state.bellTaskIds;
			if (action.route.screen === "task" && bellTaskIds.has(action.route.taskId)) {
				const next = new Set(bellTaskIds);
				next.delete(action.route.taskId);
				bellTaskIds = next;
			}
			return { ...state, route: action.route, bellTaskIds };
		}
		case "setProjects":
			return { ...state, projects: action.projects };
		case "setTasks":
			return { ...state, currentProjectTasks: action.tasks };
		case "updateTask":
			return {
				...state,
				currentProjectTasks: state.currentProjectTasks.map((t) =>
					t.id === action.task.id ? action.task : t,
				),
			};
		case "addTask":
			return {
				...state,
				currentProjectTasks: [...state.currentProjectTasks, action.task],
			};
		case "removeTask":
			return {
				...state,
				currentProjectTasks: state.currentProjectTasks.filter(
					(t) => t.id !== action.taskId,
				),
			};
		case "spawnVariants":
			return {
				...state,
				currentProjectTasks: [
					...state.currentProjectTasks.filter(
						(t) => t.id !== action.sourceTaskId,
					),
					...action.variants,
				],
			};
		case "addProject":
			return { ...state, projects: [...state.projects, action.project] };
		case "removeProject":
			return {
				...state,
				projects: state.projects.filter((p) => p.id !== action.projectId),
			};
		case "updateProject":
			return {
				...state,
				projects: state.projects.map((p) =>
					p.id === action.project.id ? action.project : p,
				),
			};
		case "setLoading":
			return { ...state, loading: action.loading };
		case "addBell": {
			// Don't add bell if user is already viewing this task's terminal
			if (
				state.route.screen === "task" &&
				state.route.taskId === action.taskId
			) {
				return state;
			}
			if (state.bellTaskIds.has(action.taskId)) return state;
			return { ...state, bellTaskIds: new Set([...state.bellTaskIds, action.taskId]) };
		}
		case "clearBell": {
			if (!state.bellTaskIds.has(action.taskId)) return state;
			const next = new Set(state.bellTaskIds);
			next.delete(action.taskId);
			return { ...state, bellTaskIds: next };
		}
		default:
			return state;
	}
}

export function useAppState() {
	return useReducer(reducer, initialState);
}
