import type { Brush } from ".";
import { TRANSPARENT } from "../constants";
import { BBox, Vec2D } from "../types";

export class Lasso implements Brush {
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
	public BBox: BBox = new BBox();
	public color = "transparent";
	public size = -1;
	public thickness = -1;
	constructor(private burshCtx: CanvasRenderingContext2D) {}

	private drawRect(point1: Vec2D, point2: Vec2D): BBox {
		if (Vec2D.Equal(point1, point2)) return new BBox();
		let leftTop: Vec2D = new Vec2D();
		let rightBottom: Vec2D = new Vec2D();
		if (point1.x < point2.x && point1.y < point2.y) {
			leftTop = point1;
			rightBottom = point2;
		} else {
			leftTop = point2;
			rightBottom = point1;
		}
		this.burshCtx.beginPath();
		this.burshCtx.rect(leftTop.x, leftTop.y, rightBottom.x - leftTop.x, rightBottom.y - leftTop.y);
		this.burshCtx.stroke();

		return {
			top: leftTop.y,
			bottom: rightBottom.y,
			left: leftTop.x,
			right: rightBottom.x,
		};
	}

	public setMinAABB(imageData: ImageData) {
		const width = imageData.width;
		const height = imageData.height;

		let yt = 0;
		let yb = height - 1;
		let xl = 0;
		let xr = width * 4 - 1;
		const pixelLength = width * 4;

		// top
		for (let x = 0; x < pixelLength; x += 4) {
			if (imageData.data[x + 3 + yt * pixelLength] !== TRANSPARENT) {
				this.BBox.top += yt - 1;
				break;
			}
			if (x === pixelLength - 4) {
				yt += 1;
				if (yt >= height) break;
				x = 0;
			}
		}

		// bottom
		for (let x = 0; x < pixelLength; x += 4) {
			if (imageData.data[x + 3 + yb * pixelLength] !== TRANSPARENT) {
				this.BBox.bottom -= height - yb;
				break;
			}
			if (x === pixelLength - 4) {
				yb -= 1;
				if (yb < 0) break;
				x = 0;
			}
		}

		// left
		for (let y = 0; y < height; y += 1) {
			if (imageData.data[xl + 3 + y * pixelLength] !== TRANSPARENT) {
				this.BBox.left += xl / 4 - 1;
				break;
			}
			if (y === height - 1) {
				xl += 4;
				if (xl >= width) break;
				y = 0;
			}
		}

		// right
		for (let y = 0; y < height; y += 1) {
			if (imageData.data[xr + y * pixelLength] !== TRANSPARENT) {
				this.BBox.right -= width - xr / 4;
				break;
			}
			if (y === height - 1) {
				xr -= 4;
				if (xr < 0) break;
				y = 0;
			}
		}

		this.startPoint = {
			x: this.BBox.left,
			y: this.BBox.top,
		};

		this.drawDot({ x: this.BBox.right, y: this.BBox.bottom });
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
		this.BBox = this.drawRect(this.startPoint, this.preEndpoint);
		this.burshCtx.restore();
	}
}
