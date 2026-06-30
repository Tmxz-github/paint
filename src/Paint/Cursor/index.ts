import type { Vec2D } from "../Types";
import { Clamp } from "../Utils";

export class Cursor {
	public get ridus(): number {
		return this._ridus;
	}
	public set ridus(value: number) {
		value = Clamp(value, 4, 128);
		this._ridus = value;
	}
	constructor(
		private _ridus: number = 2,
		public cursorLineWith: number = 0.05,
	) {}

	/**
	 * 计算光标占据的包围盒（包含线宽）
	 */
	getRenderBBox(pos: Vec2D): { left: number; top: number; right: number; bottom: number } {
		const half = this._ridus + this.cursorLineWith;
		return {
			left: pos.x - half,
			top: pos.y - half,
			right: pos.x + half,
			bottom: pos.y + half,
		};
	}
}
