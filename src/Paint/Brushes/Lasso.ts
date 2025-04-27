import type { Brush } from ".";
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

		this.burshCtx.strokeRect(leftTop.x, leftTop.y, rightBottom.x - leftTop.x, rightBottom.y - leftTop.y);

		return {
			top: leftTop.y,
			bottom: rightBottom.y,
			left: leftTop.x,
			right: rightBottom.x,
		};
	}

	public drawDot(point: Vec2D) {
		this.burshCtx.save();

		this.burshCtx.fillStyle = "black";
		this.burshCtx.lineDashOffset = 0.1;

		this.preEndpoint = {
			x: point.x,
			y: point.y,
		};
		this.burshCtx.clearRect(0, 0, this.burshCtx.canvas.width, this.burshCtx.canvas.height);
		this.preEndpoint.x = Math.floor(this.preEndpoint.x) + 0.5;
		this.preEndpoint.y = Math.floor(this.preEndpoint.y) + 0.5;
		this.BBox = this.drawRect(this.startPoint, this.preEndpoint);

		this.burshCtx.restore();
	}
}
