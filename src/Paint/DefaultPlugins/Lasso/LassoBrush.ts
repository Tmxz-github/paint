import type { Brush } from "../../Brushes";
import { TRANSPARENT } from "../../constants";
import { BoundBox, Vec2D } from "../../types";

export class LassoBrush implements Brush {
	public get startPoint(): Vec2D {
		return this._startPoint;
	}
	public set startPoint(value: Vec2D) {
		value.x = Math.floor(value.x) + 0.5;
		value.y = Math.floor(value.y) + 0.5;
		this._startPoint = value;
	}

	private _startPoint: Vec2D = new Vec2D();
	public preEndpoint: Vec2D = new Vec2D();
	public boundBox: BoundBox = new BoundBox();
	public color = "transparent";
	public size = -1;
	public thickness = -1;
	constructor(private burshCtx: CanvasRenderingContext2D) {}

	private drawRect(point1: Vec2D, point2: Vec2D): BoundBox {
		if (Vec2D.Equal(point1, point2)) return new BoundBox();
		const left = Math.min(point1.x, point2.x);
		const right = Math.max(point1.x, point2.x);
		const top = Math.min(point1.y, point2.y);
		const bottom = Math.max(point1.y, point2.y);
		this.burshCtx.beginPath();
		this.burshCtx.rect(left, top, right - left, bottom - top);
		this.burshCtx.stroke();

		return { top, bottom, left, right };
	}

	/** 扫描 ImageData 四边，将 boundBox 收缩至仅含非透明像素的最小范围 */
	public setMinBoundBox(imageData: ImageData) {
		const width = imageData.width;
		const height = imageData.height;

		let yt = 0;
		let yb = height - 1;
		let xl = 0;
		let xr = width * 4 - 1;
		const pixelLength = width * 4;

		// 从上往下扫描，找到第一行非透明像素
		for (let x = 0; x < pixelLength; x += 4) {
			if (imageData.data[x + 3 + yt * pixelLength] !== TRANSPARENT) {
				this.boundBox.top += yt;
				break;
			}
			if (x === pixelLength - 4) {
				yt += 1;
				if (yt >= height) break;
				x = 0;
			}
		}

		// 从下往上扫描，找到最后一行非透明像素
		for (let x = 0; x < pixelLength; x += 4) {
			if (imageData.data[x + 3 + yb * pixelLength] !== TRANSPARENT) {
				this.boundBox.bottom -= height - yb - 1;
				break;
			}
			if (x === pixelLength - 4) {
				yb -= 1;
				if (yb < 0) break;
				x = 0;
			}
		}

		// 从左往右扫描，找到第一列非透明像素
		for (let y = 0; y < height; y += 1) {
			if (imageData.data[xl + 3 + y * pixelLength] !== TRANSPARENT) {
				this.boundBox.left += xl / 4;
				break;
			}
			if (y === height - 1) {
				xl += 4;
				if (xl >= width) break;
				y = 0;
			}
		}

		// 从右往左扫描，找到最后一列非透明像素
		for (let y = 0; y < height; y += 1) {
			if (imageData.data[xr + y * pixelLength] !== TRANSPARENT) {
				this.boundBox.right -= width - xr / 4 - 1;
				break;
			}
			if (y === height - 1) {
				xr -= 4;
				if (xr < 0) break;
				y = 0;
			}
		}

		this.startPoint = {
			x: this.boundBox.left,
			y: this.boundBox.top,
		};

		this.drawDot({ x: this.boundBox.right, y: this.boundBox.bottom });
	}

	public drawDot(point?: Vec2D, clear: boolean = true) {
		this.burshCtx.save();

		this.burshCtx.fillStyle = "black";
		this.burshCtx.lineDashOffset = 0.1;

		if (clear) {
			this.burshCtx.clearRect(0, 0, this.burshCtx.canvas.width, this.burshCtx.canvas.height);
		}
		if (point) {
			this.preEndpoint = {
				x: point.x,
				y: point.y,
			};
		}
		this.preEndpoint.x = Math.floor(this.preEndpoint.x) + 0.5;
		this.preEndpoint.y = Math.floor(this.preEndpoint.y) + 0.5;
		this.boundBox = this.drawRect(this.startPoint, this.preEndpoint);
		this.burshCtx.restore();
	}
}
