import type { BoundBox, Vec2D } from "../Types";
import { Clamp } from "../Utils";

export class Cursor {
	/** 鼠标在画布上光标半径 */
	public get ridus(): number {
		return this._ridus;
	}
	public set ridus(value: number) {
		value = Clamp(value, 4, 128);
		this._ridus = value;
	}
	/** 鼠标在画布上渲染时，光标圆的线宽 */
	public get cursorLineWith(): number {
		return this._cursorLineWith;
	}
	public set cursorLineWith(value: number) {
		value = Clamp(value, 0.01, 10);
		this._cursorLineWith = value;
	}
	constructor(
		private _ridus: number = 2,
		private _cursorLineWith: number = 0.05,
	) {}

	/**
	 * 计算光标占据的包围盒
	 */
	getRenderBBox(pos: Vec2D): BoundBox {
		const half = this._ridus + this._cursorLineWith;
		return {
			left: pos.x - half,
			top: pos.y - half,
			right: pos.x + half,
			bottom: pos.y + half,
		};
	}
}
