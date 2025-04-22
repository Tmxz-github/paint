import type { Brush } from ".";
import type { Vec2D } from "../types";
import { Clamp } from "../Utils";

export class Eraser implements Brush {
	public readonly color: string = "rgba(0, 0, 0, 255)";
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
		this.burshCtx.arc(point.x, point.y, this._size, 0, Math.PI * 2);
		this.burshCtx.clip();
		const left = Math.floor(point.x - this._size);
		const top = Math.floor(point.y - this._size);
		const size = this._size * 2;
		const imageData = this.burshCtx.getImageData(left, top, size, size);

		this.burshCtx.globalAlpha = 0.5;
		for (let i = 0; i < imageData.data.length; i += 4) {
			if (imageData.data[i + 3] <= 0.1) {
				imageData.data[i + 3] = 0;
				continue;
			}
			imageData.data[i + 3] = imageData.data[i + 3] * (1 - this._thickness);
		}

		this.burshCtx.putImageData(imageData, left, top);

		this.burshCtx.restore();
	}
}
