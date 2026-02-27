import { useState, useEffect, useCallback, useRef } from "react";
import { useT } from "../i18n";
import type { Route } from "../state";

interface HelloWorldProps {
	navigate: (route: Route) => void;
}

function HelloWorld({ navigate }: HelloWorldProps) {
	const t = useT();
	const [typedText, setTypedText] = useState("");
	const [showCursor, setShowCursor] = useState(true);
	const [phase, setPhase] = useState<"typing" | "pause" | "done">("typing");
	const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
	const containerRef = useRef<HTMLDivElement>(null);

	const fullText = t("hello.greeting");

	// Typewriter effect
	useEffect(() => {
		if (phase !== "typing") return;

		if (typedText.length < fullText.length) {
			const delay = 40 + Math.random() * 80;
			const timer = setTimeout(() => {
				setTypedText(fullText.slice(0, typedText.length + 1));
			}, delay);
			return () => clearTimeout(timer);
		}

		// Typing done — pause, then transition
		const pauseTimer = setTimeout(() => {
			setPhase("pause");
			setTimeout(() => setPhase("done"), 600);
		}, 400);
		return () => clearTimeout(pauseTimer);
	}, [typedText, fullText, phase]);

	// Cursor blink
	useEffect(() => {
		const interval = setInterval(() => setShowCursor((c) => !c), 530);
		return () => clearInterval(interval);
	}, []);

	// Mouse tracking for parallax
	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		setMousePos({
			x: (e.clientX - rect.left) / rect.width,
			y: (e.clientY - rect.top) / rect.height,
		});
	}, []);

	const parallaxX = (mousePos.x - 0.5) * 30;
	const parallaxY = (mousePos.y - 0.5) * 30;

	return (
		<div
			ref={containerRef}
			className="hello-world-container"
			onMouseMove={handleMouseMove}
		>
			{/* Floating geometric particles */}
			<div className="hello-particles" aria-hidden="true">
				{Array.from({ length: 12 }, (_, i) => (
					<div
						key={i}
						className={`hello-particle hello-particle-${i % 4}`}
						style={{
							left: `${10 + (i * 7.3) % 80}%`,
							top: `${8 + (i * 11.7) % 75}%`,
							animationDelay: `${i * 0.7}s`,
							animationDuration: `${6 + (i % 5) * 2}s`,
							transform: `translate(${parallaxX * (0.3 + (i % 3) * 0.2)}px, ${parallaxY * (0.3 + (i % 3) * 0.2)}px)`,
						}}
					/>
				))}
			</div>

			{/* Grid lines background */}
			<div className="hello-grid" aria-hidden="true" />

			{/* Main content */}
			<div
				className={`hello-content ${phase === "done" ? "hello-content-revealed" : ""}`}
				style={{
					transform: `translate(${parallaxX * 0.1}px, ${parallaxY * 0.1}px)`,
				}}
			>
				{/* Terminal prompt line */}
				<div className="hello-prompt">
					<span className="hello-prompt-symbol">&#x276F;</span>
					<span className="hello-typed-text">{typedText}</span>
					<span
						className={`hello-cursor ${showCursor ? "opacity-100" : "opacity-0"}`}
					>
						&#x2588;
					</span>
				</div>

				{/* Revealed content after typing */}
				<div
					className={`hello-reveal ${phase === "done" ? "hello-reveal-visible" : ""}`}
				>
					<div className="hello-divider" />

					<p className="hello-subtitle">{t("hello.subtitle")}</p>

					<div className="hello-stats">
						<div className="hello-stat-card glass-card border border-edge">
							<span className="hello-stat-number">&#x2731;</span>
							<span className="hello-stat-label">
								{t("hello.statTerminal")}
							</span>
						</div>
						<div className="hello-stat-card glass-card border border-edge">
							<span className="hello-stat-number">&#x25C8;</span>
							<span className="hello-stat-label">
								{t("hello.statKanban")}
							</span>
						</div>
						<div className="hello-stat-card glass-card border border-edge">
							<span className="hello-stat-number">&#x2B22;</span>
							<span className="hello-stat-label">{t("hello.statAgents")}</span>
						</div>
					</div>

					<button
						type="button"
						className="hello-cta"
						onClick={() => navigate({ screen: "dashboard" })}
					>
						{t("hello.cta")}
						<span className="hello-cta-arrow">&#x2192;</span>
					</button>
				</div>
			</div>

			{/* Ambient glow orb */}
			<div
				className="hello-orb"
				aria-hidden="true"
				style={{
					transform: `translate(${parallaxX * 0.6}px, ${parallaxY * 0.6}px)`,
				}}
			/>
		</div>
	);
}

export default HelloWorld;
