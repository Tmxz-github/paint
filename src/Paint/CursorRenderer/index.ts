import { Cursor } from "../Cursor";
import { Layer } from "../Layer";
import { Vec2D } from "../Types";
import { BoundBox } from "../Types";
import { TransformManager } from "../Transform";
import type { context2D } from "../Types/canvas";

export class CursorRenderer {
	public cursor: Cursor;
	/** 页面加载时如果光标在元素内则需要动一下 cursor 才能渲染 */
	public cursorIn: boolean = false;
	/** 光标在 canvas 元素上的坐标 */
	public pointerPos: Vec2D = Vec2D.Zero;
	/** 光标在画布上的坐标 */
	public canvasPos: Vec2D = Vec2D.Zero;
	/** 上一帧光标在画布坐标下的位置，用于脏区清除 */
	private _lastCursorCanvasPos: Vec2D | null = null;

	constructor(
		private viewCtx: context2D,
		private readonly cursorLayer: Layer,
		private readonly transform: TransformManager,
	) {
		this.cursor = new Cursor();
	}

	/**
	 * @param pos 光标在 canvas 元素上的坐标
	 */
	public render(pos: Vec2D): void {
		const t = this.viewCtx.getTransform();
		const inverse = t.inverse();
		this.canvasPos = {
			x: inverse.a * pos.x + inverse.c * pos.y + inverse.e,
			y: inverse.b * pos.x + inverse.d * pos.y + inverse.f,
		};

		let dirtyBox: BoundBox;
		if (!this._lastCursorCanvasPos) {
			const newBox = this.cursor.getRenderBBox(this.canvasPos);
			dirtyBox = newBox;
		} else {
			const oldBox = this.cursor.getRenderBBox(this._lastCursorCanvasPos);
			const newBox = this.cursor.getRenderBBox(this.canvasPos);
			dirtyBox = BoundBox.merge(oldBox, newBox);
		}

		// 直接在 viewCtx 上绘制新光标，确保光标不随缩放模糊，一直平滑
		if (!this.transform.grabReady && !this.transform.grabbing) {
			this.viewCtx.save();
			this.viewCtx.lineWidth = this.cursor.cursorLineWith;
			this.viewCtx.beginPath();
			this.viewCtx.arc(this.canvasPos.x, this.canvasPos.y, this.cursor.ridus, 0, Math.PI * 2);
			this.viewCtx.stroke();
			this.viewCtx.restore();
		}

		this.cursorLayer.markDirty(dirtyBox);
		this._lastCursorCanvasPos = this.canvasPos;
	}
}
