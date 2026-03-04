// ── Zoom module ──
// Scales the UI by changing the root font-size. All Tailwind rem-based
// classes scale automatically. The browser re-renders text natively at
// the new size — no bitmap scaling, so text stays crisp in WKWebView.
// Terminal canvases handle zoom separately (see TerminalView).

const ZOOM_KEY = "dev3-zoom";
const DEFAULT_ZOOM = 1.0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const BASE_FONT_SIZE = 16; // browser default root font-size in px

function applyZoom(level: number) {
	const clamped = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level)) * 100) / 100;
	document.documentElement.style.fontSize = `${BASE_FONT_SIZE * clamped}px`;

	// Clean up stale inline styles from previous zoom implementations
	const root = document.getElementById("root");
	if (root) {
		root.style.transform = "";
		root.style.transformOrigin = "";
		root.style.width = "";
		root.style.height = "";
	}
	// Also clear any leftover CSS zoom from the previous approach
	(document.documentElement.style as any).zoom = "";

	localStorage.setItem(ZOOM_KEY, String(clamped));
	window.dispatchEvent(new CustomEvent("zoom-changed", { detail: clamped }));
}

function getZoom(): number {
	return parseFloat(localStorage.getItem(ZOOM_KEY) || String(DEFAULT_ZOOM));
}

function adjustZoom(delta: number) {
	applyZoom(getZoom() + delta);
}

/** Call once before React mounts to apply saved zoom and expose the API globally. */
export function bootstrapZoom() {
	applyZoom(getZoom());
	(window as any).__dev3Zoom = {
		applyZoom, getZoom, adjustZoom,
		ZOOM_STEP, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM,
	};
}

/** Type for the zoom API exposed on window.__dev3Zoom */
export interface Dev3ZoomApi {
	applyZoom: (level: number) => void;
	getZoom: () => number;
	adjustZoom: (delta: number) => void;
	ZOOM_STEP: number;
	DEFAULT_ZOOM: number;
	MIN_ZOOM: number;
	MAX_ZOOM: number;
}

/** Get the zoom API set up during bootstrap */
export function getZoomApi(): Dev3ZoomApi {
	return (window as any).__dev3Zoom;
}
