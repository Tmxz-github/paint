import type { Layer } from "./layer";
import { type Vec2d } from "./types";

export class Cursor {
	constructor(
		private curCtx: CanvasRenderingContext2D,
		private layers: Layer[],
		private _curPos: Vec2d = { x: 0, y: 0 },
		private lastPos: Vec2d = { x: 0, y: 0 },
		private _ridus: number = 8,
		public cursorLineWith: number = 1
	) {}

	public get curPos(): Vec2d {
		return this._curPos;
	}
	public set curPos(value: Vec2d) {
		this._curPos = value;
	}
	public get ridus(): number {
		return this._ridus;
	}
	public set ridus(value: number) {
		if (value > 256 || value < 4) return;
		this._ridus = value;
		this.render();
	}

	render(pos?: Vec2d) {
		if (!pos) {
			pos = this.lastPos;
		}
		this.curPos = pos;
		this.clear();
		this.curCtx.save();
		this.curCtx.lineWidth = this.cursorLineWith;
		this.curCtx.beginPath();
		this.curCtx.arc(pos.x, pos.y, this._ridus, 0, Math.PI * 2);
		this.curCtx.stroke();
		this.curCtx.restore();
		this.lastPos = {
			x: pos.x,
			y: pos.y,
		};
	}

	clear() {
		// todo
		// 1. 只清除外接正方形和内接正方形夹的部分
		// 2. 只清除圆边部分
		this.curCtx.clearRect(
			this.lastPos.x - (this._ridus + this.cursorLineWith + 2),
			this.lastPos.y - (this._ridus + this.cursorLineWith + 2),
			(this._ridus + this.cursorLineWith + 2) * 2,
			(this._ridus + this.cursorLineWith + 2) * 2
		);
		for (const layer of this.layers) {
			if (layer.visiable) {
				this.curCtx.drawImage(
					layer.vCanvas,
					this.lastPos.x - (this._ridus + this.cursorLineWith + 2),
					this.lastPos.y - (this._ridus + this.cursorLineWith + 2),
					(this._ridus + this.cursorLineWith + 2) * 2,
					(this._ridus + this.cursorLineWith + 2) * 2,
					this.lastPos.x - (this._ridus + this.cursorLineWith + 2),
					this.lastPos.y - (this._ridus + this.cursorLineWith + 2),
					(this._ridus + this.cursorLineWith + 2) * 2,
					(this._ridus + this.cursorLineWith + 2) * 2
				);
			}
		}
	}
}
