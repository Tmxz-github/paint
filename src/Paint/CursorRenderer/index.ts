import { Cursor } from "../Cursor";
import type { Vec2D } from "../Types";

export class CursorRenderer {
	/** 光标 */
	public cursor: Cursor;
	/** 页面加载时如果光标在元素内则需要动一下 cursor 才能渲染 */
	public cursorIn: boolean = false;
	/** 光标在 canvas 元素上的坐标 */
	public pointerPos: Vec2D = { x: 0, y: 0 };
	/** 画布准备拖动 */
	public _grabReady: boolean = false;
	/** 画布拖动中 */
	public _grabbing: boolean = false;
	/** 画布拖动开始坐标，每次拖动时都会变化 */
	public grabStartPos: Vec2D = { x: 0, y: 0 };
	/** 剪切内容拖动开始坐标，每次拖动时都会变化 */
	public clipGrabStartPos: Vec2D = { x: 0, y: 0 };

	constructor(
		private viewCtx: CanvasRenderingContext2D,
		private canvasElement: HTMLCanvasElement,
	) {
		this.cursor = new Cursor(this.viewCtx);
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
	 * @param pos 光标在 canvas 元素上的坐标
	 */
	public render(pos: Vec2D): void {
		if (!this._grabReady && !this._grabbing) {
			const t = this.viewCtx.getTransform();
			const inverse = t.inverse();

			const canvasX = inverse.a * pos.x + inverse.c * pos.y + inverse.e;
			const canvasY = inverse.b * pos.x + inverse.d * pos.y + inverse.f;

			this.cursor.render({
				x: canvasX,
				y: canvasY,
			});
		}
	}
}
