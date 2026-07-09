import { BaseSelector } from "../../Selectors/BaseSelector";
import { TRANSPARENT } from "../../constants";
import { BoundBox } from "../../Types";
import { Vec2D } from "../../Types/vec2d";
import type { context2D } from "../../Types/canvas";

export class LassoSelector extends BaseSelector {
	public get startPoint(): Vec2D {
		return this._startPoint;
	}
	public set startPoint(value: Vec2D) {
		value.x = Math.floor(value.x) + 0.5;
		value.y = Math.floor(value.y) + 0.5;
		this._startPoint = value;
	}

	private _startPoint: Vec2D = Vec2D.Zero;
	public preEndpoint: Vec2D = Vec2D.Zero;
	public boundBox: BoundBox = BoundBox.Empty;
	private rectLineWidth: number = 1;

	constructor(selectorCtx: context2D) {
		super(selectorCtx);
	}

	private drawRect(point1: Vec2D, point2: Vec2D): BoundBox {
		if (Vec2D.Equal(point1, point2)) return BoundBox.Empty;
		const left = Math.min(point1.x, point2.x);
		const right = Math.max(point1.x, point2.x);
		const top = Math.min(point1.y, point2.y);
		const bottom = Math.max(point1.y, point2.y);
		this.selectorCtx.beginPath();
		this.selectorCtx.rect(left, top, right - left, bottom - top);
		this.selectorCtx.stroke();

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

		for (let x = 0; x < pixelLength; x += 4) {
			if (imageData.data[x + 3 + yb * pixelLength] !== TRANSPARENT) {
				this.boundBox.bottom -= height - yb - 2;
				break;
			}
			if (x === pixelLength - 4) {
				yb -= 1;
				if (yb < 0) break;
				x = 0;
			}
		}

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

		const endPoint = { x: this.boundBox.right, y: this.boundBox.bottom };
		this.drawSelection([this.startPoint, endPoint]);
	}

	public drawSelection(points?: Vec2D[]) {
		if (!points) return;
		if (points.length < 2) return;
		const [startPoint, endPoint] = points;

		this.preEndpoint = endPoint;
		this.preEndpoint.x = Math.floor(this.preEndpoint.x) + 0.5;
		this.preEndpoint.y = Math.floor(this.preEndpoint.y) + 0.5;

		this.selectorCtx.save();
		this.selectorCtx.lineWidth = this.rectLineWidth;
		this.selectorCtx.strokeStyle = "#000";
		this.selectorCtx.setLineDash([4, 3]);
		this.selectorCtx.lineDashOffset = 0.1;
		this.boundBox = this.drawRect(startPoint, this.preEndpoint);
		this.selectorCtx.restore();
	}

	public getBoundBox(): BoundBox {
		return this.boundBox;
	}
}
