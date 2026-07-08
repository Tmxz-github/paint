import type { Vec2D } from "../../Types";
import { BaseBrush } from "../../Brushes/BaseBrush";
import type { context2D } from "../../Types/canvas";

export class EraserBrush extends BaseBrush {
	protected readonly sizeMin = 1;

	constructor(getCtx: () => context2D, name: string, size: number, thickness: number = 1) {
		super(getCtx, name, size, thickness, "transparent");
	}

	public drawDot(point: Vec2D) {
		this.brushCtx.save();
		this.brushCtx.globalCompositeOperation = "destination-out";
		this.brushCtx.globalAlpha = this._thickness;
		this.brushCtx.beginPath();
		this.brushCtx.arc(point.x, point.y, this._size, 0, Math.PI * 2);
		this.brushCtx.fill();
		this.brushCtx.restore();
	}
}
