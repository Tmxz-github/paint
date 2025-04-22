import type { Vec2D } from "../types";
import { Pen } from "./Pen";
import { Eraser } from "./Eraser";
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

export { Pen, Eraser };
