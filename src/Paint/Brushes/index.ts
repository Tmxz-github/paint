import { Pen } from "./Pen";
import { BaseBrush } from "./BaseBrush";
export interface BrushStyle {
	size: number;
	color: string;
	thickness: number;
}

export type BrushTypes = "PEN" | "ERASER" | "LASSO";

export { Pen, BaseBrush };
