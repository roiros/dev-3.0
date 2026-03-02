export function labelColor(name: string): string {
	let h = 0;
	for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
	return `hsl(${Math.abs(h) % 360}, 65%, 55%)`;
}
