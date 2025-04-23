import type { Layer } from "../Layer";
import { Vec2D } from "../types";
import { Clamp } from "../Utils";

export class Cursor {
	public get curPos(): Vec2D {
		return this._curPos;
	}
	public set curPos(value: Vec2D) {
		this._curPos = value;
	}
	public get ridus(): number {
		return this._ridus;
	}
	public set ridus(value: number) {
		value = Clamp(value, 4, 128);
		this._ridus = value;
		this.render();
	}
	public get lastPos(): Vec2D {
		return this._lastPos;
	}
	public set lastPos(value: Vec2D) {
		this._lastPos = value;
	}
	constructor(
		private curCtx: CanvasRenderingContext2D,
		private layers: Layer[],
		private _curPos: Vec2D = { x: 0, y: 0 },
		private _lastPos: Vec2D = { x: 0, y: 0 },
		private _ridus: number = 2,
		public cursorLineWith: number = 0.1
	) {}

	render(pos?: Vec2D) {
		if (!pos) {
			pos = this.lastPos;
		}
		this.curPos = pos;
		// this.clear();
		this.curCtx.save();
		this.curCtx.lineWidth = this.cursorLineWith;
		this.curCtx.beginPath();
		this.curCtx.arc(pos.x, pos.y, this._ridus, 0, Math.PI * 2);
		this.curCtx.stroke();
		this.curCtx.restore();
		this.lastPos = this.curPos;
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
