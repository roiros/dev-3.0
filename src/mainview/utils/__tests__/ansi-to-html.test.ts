import { describe, it, expect } from "vitest";
import { parseAnsi } from "../ansi-to-html";

describe("parseAnsi", () => {
	it("returns plain text with empty style for input without escapes", () => {
		const result = parseAnsi("hello world");
		expect(result).toEqual([{ text: "hello world", style: {} }]);
	});

	it("handles empty string", () => {
		const result = parseAnsi("");
		expect(result).toEqual([]);
	});

	it("parses bold text", () => {
		const result = parseAnsi("\x1b[1mhello\x1b[0m");
		expect(result[0]).toEqual({ text: "hello", style: { fontWeight: "bold" } });
	});

	it("parses dim text", () => {
		const result = parseAnsi("\x1b[2mdim\x1b[0m");
		expect(result[0]).toEqual({ text: "dim", style: { opacity: 0.6 } });
	});

	it("parses italic text", () => {
		const result = parseAnsi("\x1b[3mitalic\x1b[0m");
		expect(result[0]).toEqual({ text: "italic", style: { fontStyle: "italic" } });
	});

	it("parses underline text", () => {
		const result = parseAnsi("\x1b[4munderline\x1b[0m");
		expect(result[0]).toEqual({ text: "underline", style: { textDecoration: "underline" } });
	});

	it("parses basic foreground colors (30-37)", () => {
		const result = parseAnsi("\x1b[31mred\x1b[0m");
		expect(result[0]).toEqual({ text: "red", style: { color: "#cc0000" } });
	});

	it("parses basic background colors (40-47)", () => {
		const result = parseAnsi("\x1b[42mgreen bg\x1b[0m");
		expect(result[0]).toEqual({ text: "green bg", style: { backgroundColor: "#00cc00" } });
	});

	it("parses bright foreground colors (90-97)", () => {
		const result = parseAnsi("\x1b[91mbright red\x1b[0m");
		expect(result[0]).toEqual({ text: "bright red", style: { color: "#ff5555" } });
	});

	it("parses bright background colors (100-107)", () => {
		const result = parseAnsi("\x1b[101mbright red bg\x1b[0m");
		expect(result[0]).toEqual({ text: "bright red bg", style: { backgroundColor: "#ff5555" } });
	});

	it("parses 256-color foreground", () => {
		const result = parseAnsi("\x1b[38;5;196mred256\x1b[0m");
		expect(result[0].text).toBe("red256");
		expect(result[0].style.color).toBeDefined();
	});

	it("parses 256-color background", () => {
		const result = parseAnsi("\x1b[48;5;21mblue256bg\x1b[0m");
		expect(result[0].text).toBe("blue256bg");
		expect(result[0].style.backgroundColor).toBeDefined();
	});

	it("parses 24-bit RGB foreground", () => {
		const result = parseAnsi("\x1b[38;2;255;128;0mrgb\x1b[0m");
		expect(result[0]).toEqual({ text: "rgb", style: { color: "rgb(255,128,0)" } });
	});

	it("parses 24-bit RGB background", () => {
		const result = parseAnsi("\x1b[48;2;0;128;255mrgbbg\x1b[0m");
		expect(result[0]).toEqual({ text: "rgbbg", style: { backgroundColor: "rgb(0,128,255)" } });
	});

	it("handles reset (\\x1b[0m) correctly", () => {
		const result = parseAnsi("\x1b[1;31mbold red\x1b[0m normal");
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			text: "bold red",
			style: { fontWeight: "bold", color: "#cc0000" },
		});
		expect(result[1]).toEqual({ text: " normal", style: {} });
	});

	it("handles implicit reset with \\x1b[m", () => {
		const result = parseAnsi("\x1b[1mbold\x1b[m normal");
		expect(result[1]).toEqual({ text: " normal", style: {} });
	});

	it("combines multiple SGR params in one sequence", () => {
		const result = parseAnsi("\x1b[1;3;31mbold italic red\x1b[0m");
		expect(result[0]).toEqual({
			text: "bold italic red",
			style: { fontWeight: "bold", fontStyle: "italic", color: "#cc0000" },
		});
	});

	it("strips cursor movement sequences", () => {
		const result = parseAnsi("\x1b[2Jhello\x1b[10;5H world");
		expect(result).toEqual([{ text: "hello world", style: {} }]);
	});

	it("strips OSC sequences (BEL terminated)", () => {
		const result = parseAnsi("\x1b]0;Window Title\x07hello");
		expect(result).toEqual([{ text: "hello", style: {} }]);
	});

	it("strips OSC sequences (ST terminated)", () => {
		const result = parseAnsi("\x1b]0;Window Title\x1b\\hello");
		expect(result).toEqual([{ text: "hello", style: {} }]);
	});

	it("handles text before and after styled segment", () => {
		const result = parseAnsi("before \x1b[32mgreen\x1b[0m after");
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ text: "before ", style: {} });
		expect(result[1]).toEqual({ text: "green", style: { color: "#00cc00" } });
		expect(result[2]).toEqual({ text: " after", style: {} });
	});

	it("handles consecutive SGR sequences without text between", () => {
		const result = parseAnsi("\x1b[1m\x1b[31mhello\x1b[0m");
		expect(result[0]).toEqual({
			text: "hello",
			style: { fontWeight: "bold", color: "#cc0000" },
		});
	});

	it("handles default foreground reset (39)", () => {
		const result = parseAnsi("\x1b[31mred\x1b[39mdefault");
		expect(result[1]).toEqual({ text: "default", style: {} });
	});

	it("handles default background reset (49)", () => {
		const result = parseAnsi("\x1b[41mred bg\x1b[49mno bg");
		expect(result[1]).toEqual({ text: "no bg", style: {} });
	});

	it("parses grayscale 256-color (232-255)", () => {
		const result = parseAnsi("\x1b[38;5;240mgray\x1b[0m");
		expect(result[0].text).toBe("gray");
		expect(result[0].style.color).toMatch(/^rgb\(/);
	});

	it("handles multiline text", () => {
		const result = parseAnsi("line1\nline2\n\x1b[31mred line3\x1b[0m\nline4");
		expect(result).toHaveLength(3);
		expect(result[0].text).toBe("line1\nline2\n");
		expect(result[1].text).toBe("red line3");
		expect(result[1].style.color).toBe("#cc0000");
		expect(result[2].text).toBe("\nline4");
		expect(result[2].style).toEqual({});
	});
});
