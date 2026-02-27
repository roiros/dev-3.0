import type { CSSProperties } from "react";

export interface AnsiSegment {
	text: string;
	style: CSSProperties;
}

interface SgrState {
	bold: boolean;
	dim: boolean;
	italic: boolean;
	underline: boolean;
	fg: string | null;
	bg: string | null;
}

const BASIC_COLORS = [
	"#000000", "#cc0000", "#00cc00", "#cccc00",
	"#0000cc", "#cc00cc", "#00cccc", "#cccccc",
];

const BRIGHT_COLORS = [
	"#555555", "#ff5555", "#55ff55", "#ffff55",
	"#5555ff", "#ff55ff", "#55ffff", "#ffffff",
];

function color256(n: number): string {
	if (n < 8) return BASIC_COLORS[n];
	if (n < 16) return BRIGHT_COLORS[n - 8];
	if (n < 232) {
		const idx = n - 16;
		const r = Math.floor(idx / 36);
		const g = Math.floor((idx % 36) / 6);
		const b = idx % 6;
		const toHex = (v: number) => (v === 0 ? 0 : 55 + v * 40);
		return `rgb(${toHex(r)},${toHex(g)},${toHex(b)})`;
	}
	// Grayscale 232-255
	const v = 8 + (n - 232) * 10;
	return `rgb(${v},${v},${v})`;
}

function stateToStyle(state: SgrState): CSSProperties {
	const style: CSSProperties = {};
	if (state.bold) style.fontWeight = "bold";
	if (state.dim) style.opacity = 0.6;
	if (state.italic) style.fontStyle = "italic";
	if (state.underline) style.textDecoration = "underline";
	if (state.fg) style.color = state.fg;
	if (state.bg) style.backgroundColor = state.bg;
	return style;
}

function resetState(): SgrState {
	return { bold: false, dim: false, italic: false, underline: false, fg: null, bg: null };
}

function applySgr(state: SgrState, params: number[]): void {
	let i = 0;
	while (i < params.length) {
		const p = params[i];
		if (p === 0) {
			Object.assign(state, resetState());
		} else if (p === 1) {
			state.bold = true;
		} else if (p === 2) {
			state.dim = true;
		} else if (p === 3) {
			state.italic = true;
		} else if (p === 4) {
			state.underline = true;
		} else if (p === 22) {
			state.bold = false;
			state.dim = false;
		} else if (p === 23) {
			state.italic = false;
		} else if (p === 24) {
			state.underline = false;
		} else if (p >= 30 && p <= 37) {
			state.fg = BASIC_COLORS[p - 30];
		} else if (p === 38) {
			// Extended foreground
			if (params[i + 1] === 5 && i + 2 < params.length) {
				state.fg = color256(params[i + 2]);
				i += 2;
			} else if (params[i + 1] === 2 && i + 4 < params.length) {
				state.fg = `rgb(${params[i + 2]},${params[i + 3]},${params[i + 4]})`;
				i += 4;
			}
		} else if (p === 39) {
			state.fg = null;
		} else if (p >= 40 && p <= 47) {
			state.bg = BASIC_COLORS[p - 40];
		} else if (p === 48) {
			// Extended background
			if (params[i + 1] === 5 && i + 2 < params.length) {
				state.bg = color256(params[i + 2]);
				i += 2;
			} else if (params[i + 1] === 2 && i + 4 < params.length) {
				state.bg = `rgb(${params[i + 2]},${params[i + 3]},${params[i + 4]})`;
				i += 4;
			}
		} else if (p === 49) {
			state.bg = null;
		} else if (p >= 90 && p <= 97) {
			state.fg = BRIGHT_COLORS[p - 90];
		} else if (p >= 100 && p <= 107) {
			state.bg = BRIGHT_COLORS[p - 100];
		}
		i++;
	}
}

// Matches SGR sequences: \x1b[...m
const SGR_RE = /\x1b\[([0-9;]*)m/g;
// Matches any non-SGR escape sequence (CSI, OSC, charset).
// CSI final bytes: A-L, N-Z, a-l, n-z (excludes 'm' which is SGR)
const NON_SGR_RE = /\x1b(?:\[[0-9;]*[A-LN-Za-ln-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|\([A-B0-2])/g;

/**
 * Parse ANSI-colored text into styled segments for React rendering.
 * Supports SGR codes (bold, dim, italic, underline, 8/16/256/24-bit colors).
 * Strips non-SGR escape sequences (cursor movement, OSC, charset).
 */
export function parseAnsi(input: string): AnsiSegment[] {
	// Strip non-SGR escapes first
	const cleaned = input.replace(NON_SGR_RE, "");

	const segments: AnsiSegment[] = [];
	const state = resetState();
	let lastIndex = 0;

	SGR_RE.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = SGR_RE.exec(cleaned)) !== null) {
		// Text before this SGR sequence
		if (match.index > lastIndex) {
			const text = cleaned.slice(lastIndex, match.index);
			if (text) {
				segments.push({ text, style: stateToStyle(state) });
			}
		}

		// Parse SGR params
		const paramStr = match[1];
		const params = paramStr === "" ? [0] : paramStr.split(";").map(Number);
		applySgr(state, params);

		lastIndex = match.index + match[0].length;
	}

	// Remaining text
	if (lastIndex < cleaned.length) {
		const text = cleaned.slice(lastIndex);
		if (text) {
			segments.push({ text, style: stateToStyle(state) });
		}
	}

	return segments;
}
