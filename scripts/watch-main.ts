import { watch, type WatchEventType } from "node:fs";

const WATCH_DIRS = ["src/bun", "src/shared"];
const DEBOUNCE_MS = 2000;
const CMD = ["bunx", "electrobun", "dev"];

let child: ReturnType<typeof Bun.spawn> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let restarting = false;

const log = (msg: string) =>
	console.log(`\x1b[36m[watch]\x1b[0m ${msg}`);

const warn = (msg: string) =>
	console.log(`\x1b[33m[watch]\x1b[0m ${msg}`);

function start() {
	log("Starting electrobun dev...");
	child = Bun.spawn(CMD, {
		stdio: ["inherit", "inherit", "inherit"],
		cwd: import.meta.dir + "/..",
	});
	child.exited.then((code) => {
		if (!restarting) {
			warn(`electrobun dev exited with code ${code}`);
		}
	});
}

async function restart() {
	if (restarting) return;
	restarting = true;
	log("Restarting electrobun dev...");

	if (child) {
		child.kill();
		await child.exited;
		child = null;
	}

	start();
	restarting = false;
	log("Press \x1b[1mR\x1b[0m to restart, \x1b[1mQ\x1b[0m to quit");
}

function scheduleRestart(reason: string) {
	if (debounceTimer) clearTimeout(debounceTimer);
	log(`${reason} — restarting in ${DEBOUNCE_MS / 1000}s...`);
	debounceTimer = setTimeout(() => {
		debounceTimer = null;
		restart();
	}, DEBOUNCE_MS);
}

async function shutdown() {
	log("Shutting down...");
	if (debounceTimer) clearTimeout(debounceTimer);
	if (child) {
		child.kill();
		await child.exited;
	}
	process.exit(0);
}

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
	process.stdin.resume();
	process.stdin.on("data", (data: Buffer) => {
		const key = data.toString();
		if (key === "r" || key === "R") {
			if (debounceTimer) clearTimeout(debounceTimer);
			log("Manual restart triggered");
			restart();
		} else if (key === "q" || key === "Q" || key === "\x03") {
			shutdown();
		}
	});
}

// --- Start ---

start();
log("Press \x1b[1mR\x1b[0m to restart, \x1b[1mQ\x1b[0m to quit");
