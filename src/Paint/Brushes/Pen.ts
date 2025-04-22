import type { Brush, BrushStyle } from ".";
import type { Vec2D } from "../types";
import { Clamp } from "../Utils";

export class Pen implements Brush {
	public get thickness(): number {
		return this._thickness;
	}
	/** 0 - 1 */
	public set thickness(value: number) {
		value = Clamp(value, 0, 1);
		this._thickness = value;
	}
	public get color(): string {
		return this._color;
	}
	public set color(value: string) {
		this.burshCtx.strokeStyle = value;
		this._color = value;
	}
	public get size(): number {
		return this._size;
	}
	public set size(value: number) {
		value = Clamp(value, 1, 128);
		this.burshCtx.lineWidth = value;
		this._size = value;
	}
	constructor(
		private burshCtx: CanvasRenderingContext2D,
		private _size: number,
		private _thickness: number,
		private _color: string
	) {}

	public drawDot(point: Vec2D, options?: BrushStyle) {
		this.burshCtx.save();
		if (options) {
			this.burshCtx.fillStyle = options.color || this.burshCtx.fillStyle;
			this.size = options.size || this.size;
		}
		this.burshCtx.lineWidth = 0;

		this.burshCtx.beginPath();
		this.burshCtx.arc(point.x, point.y, this.size, 0, Math.PI * 2);
		this.burshCtx.fill();

		this.burshCtx.restore();
	}
}
