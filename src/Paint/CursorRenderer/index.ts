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
	/** 上一帧鼠标屏幕位置，直接存 pos（避免用变化后的 transform 反推导致残影） */
	private _lastScreenPos: Vec2D | null = null;

	constructor(
		private readonly viewCtx: context2D,
		private readonly cursorLayer: Layer,
		private readonly transform: TransformManager,
	) {
		this.cursor = new Cursor();
	}

	private get ctx(): context2D {
		return this.cursorLayer.vCtx as context2D;
	}

	public render(pos: Vec2D): void {
		const t = this.viewCtx.getTransform();
		const inverse = t.inverse();
		this.canvasPos = {
			x: inverse.a * pos.x + inverse.c * pos.y + inverse.e,
			y: inverse.b * pos.x + inverse.d * pos.y + inverse.f,
		};

		const scale = Math.sqrt(t.a * t.a + t.b * t.b);
		const screenRadius = this.cursor.ridus * scale;
		const half = screenRadius + this.cursor.cursorLineWith;

		// 直接用屏幕坐标计算脏区（旧位置来自 _lastScreenPos，不用 transform 反推）
		let dirtyBox: BoundBox;
		if (!this._lastScreenPos) {
			dirtyBox = {
				top: pos.y - half, left: pos.x - half,
				bottom: pos.y + half, right: pos.x + half,
			};
		} else {
			const oldBox = {
				top: this._lastScreenPos.y - half, left: this._lastScreenPos.x - half,
				bottom: this._lastScreenPos.y + half, right: this._lastScreenPos.x + half,
			};
			const newBox = {
				top: pos.y - half, left: pos.x - half,
				bottom: pos.y + half, right: pos.x + half,
			};
			dirtyBox = BoundBox.merge(oldBox, newBox);
		}
		dirtyBox = BoundBox.inflate(dirtyBox, 2);
		// 清空 cursorLayer 脏区 → 画新光标 → 标记 dirty
		const w = dirtyBox.right - dirtyBox.left;
		const h = dirtyBox.bottom - dirtyBox.top;
		if (w > 0 && h > 0) this.ctx.clearRect(dirtyBox.left, dirtyBox.top, w, h);

		if (!this.transform.grabReady && !this.transform.grabbing) {
			this.ctx.save();
			this.ctx.lineWidth = this.cursor.cursorLineWith;
			this.ctx.beginPath();
			this.ctx.arc(pos.x, pos.y, screenRadius, 0, Math.PI * 2);
			this.ctx.stroke();
			this.ctx.restore();
		}

		this.cursorLayer.markDirty(dirtyBox);
		this._lastScreenPos = { x: pos.x, y: pos.y };
	}
}
