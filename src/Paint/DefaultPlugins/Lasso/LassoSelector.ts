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

	/** 扫描 ImageData 四边并将 boundBox 收缩至非透明内容的最小范围（不触发绘制） */
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
				this.boundBox.bottom -= height - 1 - yb;
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
				if (xl >= pixelLength) break;
				y = 0;
			}
		}

		for (let y = 0; y < height; y += 1) {
			if (imageData.data[xr + y * pixelLength] !== TRANSPARENT) {
				this.boundBox.right -= (width * 4 - 1 - xr) / 4;
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
		this.preEndpoint = {
			x: Math.floor(this.boundBox.right) + 0.5,
			y: Math.floor(this.boundBox.bottom) + 0.5,
		};
	}

	/** 绘制选区矩形到 selectorCtx（纯绘制，不修改状态） */
	public drawSelection(points?: Vec2D[]) {
		if (!points || points.length < 2) return;
		const [startPoint, endPoint] = points;
		this.selectorCtx.save();
		this.selectorCtx.lineWidth = this.rectLineWidth;
		this.selectorCtx.strokeStyle = "#000";
		this.selectorCtx.setLineDash([4, 3]);
		this.selectorCtx.lineDashOffset = 0.1;
		this.drawRect(startPoint, endPoint);
		this.selectorCtx.restore();
	}

	/** 从 canvas 坐标更新选区状态（boundBox / preEndpoint / startPoint），不触发绘制 */
	public updateBounds(start: Vec2D, end: Vec2D) {
		this.preEndpoint = {
			x: Math.floor(end.x) + 0.5,
			y: Math.floor(end.y) + 0.5,
		};
		this._startPoint = {
			x: Math.floor(start.x) + 0.5,
			y: Math.floor(start.y) + 0.5,
		};
		const left = Math.min(this._startPoint.x, this.preEndpoint.x);
		const right = Math.max(this._startPoint.x, this.preEndpoint.x);
		const top = Math.min(this._startPoint.y, this.preEndpoint.y);
		const bottom = Math.max(this._startPoint.y, this.preEndpoint.y);
		this.boundBox = { top, left, bottom, right };
	}

	public getBoundBox(): BoundBox {
		return this.boundBox;
	}
}
