import type { Brush } from "../../Brushes";
import type { Vec2D } from "../../types";
import { Clamp } from "../../Utils";

export class EraserBrush implements Brush {
	private _color: string = "transparent";
	public get color(): string {
		return this._color;
	}
	public set color(value: string) {
		this._color = value;
	}
	public get thickness(): number {
		return this._thickness;
	}
	/** 0 - 1 */
	public set thickness(value: number) {
		value = Clamp(value, 0.1, 1);
		this._thickness = value;
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
		private _thickness: number = 1,
	) {}

	public drawDot(point: Vec2D) {
		this.burshCtx.save();
		this.burshCtx.globalCompositeOperation = "destination-out";
		this.burshCtx.globalAlpha = this._thickness;
		this.burshCtx.beginPath();
		this.burshCtx.arc(point.x, point.y, this._size, 0, Math.PI * 2);
		this.burshCtx.fill();

		this.burshCtx.restore();
	}
}
