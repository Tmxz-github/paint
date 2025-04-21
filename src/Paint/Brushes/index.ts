import type { Vec2D } from "../types";

export interface BrushStyle {
	size: number;
	color: string;
	thickness: number;
}

export interface Brush {
	size: number;
	color: string;
	thickness: number;
	drawDot: (point: Vec2D) => void;
}

export type BurshTypes = "PEN" | "ERASER";



