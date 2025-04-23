import type { Brush } from ".";
import type { Vec2D } from "../types";
import { Clamp } from "../Utils";

export class Eraser implements Brush {
	private _color: string = "white";
	// 应同画布背景色相同
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
	constructor(private burshCtx: CanvasRenderingContext2D, private _size: number, private _thickness: number = 0.5) {}

	public drawDot(point: Vec2D) {
		this.burshCtx.save();
		this.burshCtx.fillStyle = "red";
		this.burshCtx.lineWidth = 0;

		this.burshCtx.beginPath();
		this.burshCtx.fillStyle = this._color;
		this.burshCtx.globalAlpha = this._thickness;
		this.burshCtx.arc(point.x, point.y, this._size, 0, Math.PI * 2);
		this.burshCtx.fill();
		// this.burshCtx.clip();
		// const left = Math.floor(point.x - this._size);
		// const top = Math.floor(point.y - this._size);
		// const size = this._size * 2;
		// const imageData = this.burshCtx.getImageData(left, top, size, size);

		// for (let i = 0; i < imageData.data.length; i += 4) {
		// 	if (imageData.data[i + 3] <= 0.1) {
		// 		imageData.data[i + 3] = 0;
		// 		continue;
		// 	}
		// 	imageData.data[i + 3] = imageData.data[i + 3] * (1 - this._thickness);
		// }

		// this.burshCtx.putImageData(imageData, left, top);

		this.burshCtx.restore();
	}
}
