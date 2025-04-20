import type { Brush } from ".";
import type { Vec2D } from "../types";

export class Pen implements Brush {
	public get size(): number {
		return this._size;
	}
	public set size(value: number) {
		this._size = value;
	}
	constructor(private burshCtx: CanvasRenderingContext2D, private _size: number) {}

	public drawDot(point: Vec2D) {
		this.burshCtx.save();
		this.burshCtx.lineWidth = 0;

		this.burshCtx.beginPath();
		this.burshCtx.arc(point.x, point.y, this.size, 0, Math.PI * 2);
		this.burshCtx.fill();
		this.burshCtx.closePath();

		this.burshCtx.restore();
	}
}
