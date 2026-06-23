import type { Brush, BrushStyle } from ".";
import type { Vec2D } from "../types";
import { Clamp } from "../Utils";

export class Pen implements Brush {
	public get thickness(): number {
		return this._thickness;
	}
	/** 0 - 1 */
	public set thickness(value: number) {
		value = Clamp(value, 0.1, 1);
		this._thickness = value;
	}
	public get color(): string {
		return this._color;
	}
	public set color(value: string) {
		this.brushCtx.strokeStyle = value;
		this._color = value;
	}
	public get size(): number {
		return this._size;
	}
	public set size(value: number) {
		value = Clamp(value, 0.1, 128);
		this.brushCtx.lineWidth = value;
		this._size = value;
	}
	constructor(
		private brushCtx: CanvasRenderingContext2D,
		private _size: number,
		private _thickness: number,
		private _color: string,
	) {}

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
