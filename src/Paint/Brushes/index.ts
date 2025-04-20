import type { Vec2D } from "../types";

export interface Brush {
	size: number;
	drawDot: (point: Vec2D) => void;
}

