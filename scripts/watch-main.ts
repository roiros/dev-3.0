import { watch, type WatchEventType } from "node:fs";

const WATCH_DIRS = ["src/bun", "src/shared"];
const DEBOUNCE_MS = 2000;
const ELECTROBUN_CMD = ["bunx", "electrobun", "dev"];
const VITE_CMD = ["bunx", "vite", "--port", "5173"];

let electrobunProc: ReturnType<typeof Bun.spawn> | null = null;
let viteProc: ReturnType<typeof Bun.spawn> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let restarting = false;
const projectRoot = import.meta.dir + "/..";

const log = (msg: string) =>
	console.log(`\x1b[36m[watch]\x1b[0m ${msg}`);

const warn = (msg: string) =>
	console.log(`\x1b[33m[watch]\x1b[0m ${msg}`);

function startVite() {
	log("Starting Vite HMR server...");
	viteProc = Bun.spawn(VITE_CMD, {
		stdio: ["ignore", "inherit", "inherit"],
		cwd: projectRoot,
	});
	viteProc.exited.then((code) => {
		warn(`Vite exited with code ${code}`);
	});
}

function startElectrobun() {
	log("Starting electrobun dev...");
	electrobunProc = Bun.spawn(ELECTROBUN_CMD, {
		stdio: ["ignore", "inherit", "inherit"],
		cwd: projectRoot,
	});
	electrobunProc.exited.then((code) => {
		if (!restarting) {
			warn(`electrobun dev exited with code ${code}`);
		}
	});
}

async function restartElectrobun() {
	if (restarting) return;
	restarting = true;
	log("Restarting electrobun dev...");

	if (electrobunProc) {
		electrobunProc.kill();
		await electrobunProc.exited;
		electrobunProc = null;
	}

	startElectrobun();
	restarting = false;
	log("Press \x1b[1mR\x1b[0m to restart, \x1b[1mQ\x1b[0m to quit");
}

function scheduleRestart(reason: string) {
	if (debounceTimer) clearTimeout(debounceTimer);
	log(`${reason} — restarting in ${DEBOUNCE_MS / 1000}s...`);
	debounceTimer = setTimeout(() => {
		debounceTimer = null;
		restartElectrobun();
	}, DEBOUNCE_MS);
}

async function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;
	log("Shutting down...");
	if (debounceTimer) clearTimeout(debounceTimer);

	const exits: Promise<number>[] = [];
	if (electrobunProc) {
		electrobunProc.kill();
		exits.push(electrobunProc.exited);
	}
	if (viteProc) {
		viteProc.kill();
		exits.push(viteProc.exited);
	}
	await Promise.all(exits);
	process.exit(0);
}

// --- Signal handlers ---
// electrobun's graceful shutdown sends signals to the whole process group.
// Intercept them so the watcher survives child restarts.

let shuttingDown = false;

process.on("SIGTERM", () => {
	if (!restarting) shutdown();
});
process.on("SIGINT", () => {
	if (!restarting) shutdown();
});
process.on("SIGHUP", () => {
	if (!restarting) shutdown();
});

// --- File watchers ---

for (const dir of WATCH_DIRS) {
	watch(
		dir,
		{ recursive: true },
		(event: WatchEventType, filename: string | null) => {
			if (!filename) return;
			scheduleRestart(`File changed: ${dir}/${filename}`);
		},
	);
}

log(`Watching ${WATCH_DIRS.join(", ")} for changes...`);

// --- Stdin listener ---

if (process.stdin.isTTY) {
	process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.on("data", (data: Buffer) => {
	const key = data.toString();
	if (key === "r" || key === "R") {
		if (debounceTimer) clearTimeout(debounceTimer);
		log("Manual restart triggered");
		restartElectrobun();
	} else if (key === "q" || key === "Q" || key === "\x03") {
		shutdown();
	}
});

// --- Start ---

startVite();
startElectrobun();
log("Press \x1b[1mR\x1b[0m to restart, \x1b[1mQ\x1b[0m to quit");
