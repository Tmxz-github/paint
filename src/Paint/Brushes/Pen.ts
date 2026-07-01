import type { BrushStyle } from ".";
import type { Vec2D } from "../Types";
import { BaseBrush } from "./BaseBrush";

export class Pen extends BaseBrush {
	constructor(brushCtx: CanvasRenderingContext2D, name: string, size: number = 2, thickness: number = 2, color: string = "black") {
		super(brushCtx, name, size, thickness, color);
	}

	protected onColorChange(value: string): void {
		this.brushCtx.strokeStyle = value;
	}

	public drawDot(point: Vec2D, options?: BrushStyle) {
		this.brushCtx.save();
		if (options) {
			this.brushCtx.fillStyle = options.color || this.brushCtx.fillStyle;
			this._size = options.size || this._size;
		}
		this.brushCtx.lineWidth = 0;

		this.brushCtx.beginPath();
		this.brushCtx.globalAlpha = this._thickness;
		this.brushCtx.arc(point.x, point.y, this._size, 0, Math.PI * 2);
		this.brushCtx.fill();

		this.brushCtx.restore();
	}
}
