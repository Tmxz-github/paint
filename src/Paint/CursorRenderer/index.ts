import { Cursor } from "../Cursor";
import { Layer } from "../Layer";
import { Vec2D } from "../Types";
import { BoundBox } from "../Types";

export class CursorRenderer {
	/** 光标 */
	public cursor: Cursor;
	/** 光标离屏渲染层 — 仅用于脏区追踪，不直接参与合成 */
	public readonly cursorLayer: Layer;
	/** 页面加载时如果光标在元素内则需要动一下 cursor 才能渲染 */
	public cursorIn: boolean = false;
	/** 光标在 canvas 元素上的坐标 */
	public pointerPos: Vec2D = Vec2D.Zero;
	/** 光标在画布上的坐标 */
	public canvasPos: Vec2D = Vec2D.Zero;
	/** 画布准备拖动 */
	public _grabReady: boolean = false;
	/** 画布拖动中 */
	public _grabbing: boolean = false;
	/** 画布拖动开始坐标，每次拖动时都会变化 */
	public grabStartPos: Vec2D = Vec2D.Zero;
	/** 剪切内容拖动开始坐标，每次拖动时都会变化 */
	public clipGrabStartPos: Vec2D = Vec2D.Zero;

	/** 上一帧光标在画布坐标下的位置，用于脏区清除 */
	private _lastCursorCanvasPos: Vec2D | null = null;

	constructor(
		private viewCtx: CanvasRenderingContext2D,
		private canvasElement: HTMLCanvasElement,
	) {
		this.cursorLayer = new Layer({
			width: canvasElement.width,
			height: canvasElement.height,
		});
		this.cursor = new Cursor();
	}

	get grabReady(): boolean {
		return this._grabReady;
	}
	set grabReady(value: boolean) {
		if (value) {
			if (!this._grabbing) {
				this.canvasElement.style.cursor = "grab";
			}
		} else {
			this.canvasElement.style.cursor = "none";
		}
		this._grabReady = value;
	}

	get grabbing(): boolean {
		return this._grabbing;
	}
	set grabbing(value: boolean) {
		if (value) {
			this.canvasElement.style.cursor = "grabbing";
		} else {
			if (this._grabReady) {
				this.canvasElement.style.cursor = "grab";
			} else {
				this.canvasElement.style.cursor = "crosshair";
			}
		}
		this._grabbing = value;
	}

	/**
	 * @param pos 光标在 canvas 元素上的坐标（屏幕坐标）
	 */
	public render(pos: Vec2D): void {
		// 将屏幕坐标转换为画布坐标（反算 viewCtx 上的变换）
		const t = this.viewCtx.getTransform();
		const inverse = t.inverse();
		this.canvasPos = {
			x: inverse.a * pos.x + inverse.c * pos.y + inverse.e,
			y: inverse.b * pos.x + inverse.d * pos.y + inverse.f,
		};

		// 计算脏区：合并新旧光标位置
		let dirtyBox: BoundBox;
		if (!this._lastCursorCanvasPos) {
			const newBox = this.cursor.getRenderBBox(this.canvasPos);
			dirtyBox = newBox;
		} else {
			const oldBox = this.cursor.getRenderBBox(this._lastCursorCanvasPos);
			const newBox = this.cursor.getRenderBBox(this.canvasPos);
			dirtyBox = BoundBox.merge(oldBox, newBox);
		}
		console.log(dirtyBox);
		// const res = BoundBox.shrink(BoundBox.inflate(dirtyBox, 8), this.canvasElement.width, this.canvasElement.height);
		// 标记 cursorLayer 脏区 → renderLayers 会合成该区域，从 viewCtx 上擦除旧光标

		// 直接在 viewCtx 上绘制新光标（路径渲染，随 transform 平滑缩放）
		if (!this._grabReady && !this._grabbing) {
			this.viewCtx.save();
			this.viewCtx.lineWidth = this.cursor.cursorLineWith;
			this.viewCtx.beginPath();
			this.viewCtx.arc(this.canvasPos.x, this.canvasPos.y, this.cursor.ridus, 0, Math.PI * 2);
			this.viewCtx.stroke();
			this.viewCtx.restore();
		}

		this.cursorLayer.markDirty(dirtyBox);
		// 更新上一帧光标位置
		this._lastCursorCanvasPos = this.canvasPos;

		// 更新 Cursor 实例的 curPos / lastPos（外部依赖此值，如 DrawMode 绘制时读取）
		// this.cursor.curPos = canvasPos;
	}
}
