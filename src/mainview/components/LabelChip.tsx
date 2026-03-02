import type { Label } from "../../shared/types";

interface LabelChipProps {
	label: Label;
	size?: "sm" | "xs";
	active?: boolean;
	onClick?: (e: React.MouseEvent) => void;
}

function LabelChip({ label, size = "xs", active = false, onClick }: LabelChipProps) {
	const isSmall = size === "xs";

	return (
		<button
			type="button"
			onClick={onClick}
			className={`inline-flex items-center gap-1 rounded-full transition-all ${
				isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
			} ${
				onClick ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"
			}`}
			style={
				active
					? { background: label.color, color: "#fff" }
					: {
						background: `${label.color}22`,
						color: label.color,
						border: `1px solid ${label.color}55`,
					}
			}
			title={label.name}
		>
			<span
				className="rounded-full flex-shrink-0"
				style={{
					width: isSmall ? 5 : 6,
					height: isSmall ? 5 : 6,
					background: active ? "rgba(255,255,255,0.8)" : label.color,
				}}
			/>
			<span className="font-medium leading-none truncate max-w-[80px]">{label.name}</span>
		</button>
	);
}

export default LabelChip;
