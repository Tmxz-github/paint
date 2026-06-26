import { PaintMode } from "../../Mode";
import type { Paint } from "../..";
import { LassoBrush } from "./LassoBrush";
import type { MyPointerEvent } from "../../Input/pointer-listener";
import { Vec2D } from "../../Types/vec2d";
import { deepClone, inBBox } from "../../Utils";
import { Layer } from "../../Layer";

export class ClipMode extends PaintMode {
	/** 开始修改剪切内容 */
	public clipStarted: boolean = false;
	/** 已经确认修改的剪切内容 */
	private clipped: boolean = false;
	constructor(
		private ctx: Paint,
		private lassoLayer: Layer,
		private lassoRectLayer: Layer,
	) {
		super();
	}

	onEnterMode(data: any): void {
		this.ctx.state = "CLIP";
		this.clipped = false;
		this.ctx.pointerListener.on("MOVE", this.onPointerMove, this);
		this.ctx.pointerListener.on("DOWN", this.onPointerDown, this);
		this.ctx.pointerListener.on("UP", this.onPointerUp, this);
		this.ctx.keyListener.on("Enter:down", this.onEnterDown, [this.ctx], this);
	}

	onLeaveMode(data: any): void {
		this.offClip();
		this.ctx.pointerListener.off("MOVE", this.onPointerMove);
		this.ctx.pointerListener.off("DOWN", this.onPointerDown);
		this.ctx.pointerListener.off("UP", this.onPointerUp);
		this.ctx.keyListener.off("Enter:down", this.onEnterDown);
	}

	private onPointerMove({ pos }: MyPointerEvent) {
		if (this.ctx.canDraw && this.ctx.state === "CLIP") {
			this.ctx.brushManager.brush.drawDot(this.ctx.cursorRenderer.cursor.curPos);
			return;
		}
		if (this.ctx.state !== "CLIPPING" || !this.ctx.canDraw) {
			return;
		}
		const boundBox = (this.ctx.brushManager.brush as LassoBrush).boundBox;
		const inBox = inBBox(this.ctx.cursorRenderer.cursor.curPos, boundBox);
		if (!inBox) {
			return;
		}
		if (this.clipStarted) {
			// 清除当前图层上原剪切区域的内容
			this.ctx.layerManager.currentLayer.vCtx.clearRect(
				boundBox.left,
				boundBox.top,
				boundBox.right - boundBox.left,
				boundBox.bottom - boundBox.top,
			);
		}
		// 计算拖拽偏移量：需反算 viewCtx 上的变换（旋转/缩放）得到正确的画布坐标偏移
		// 当前 viewCtx 的变换矩阵由 this.ctx.applyTransform 设置
		const t = this.ctx.viewCtx.getTransform();
		const inverse = t.inverse();
		const rawOffset = Vec2D.Sub(pos, this.ctx.cursorRenderer.clipGrabStartPos);
		// 通过逆变换将屏幕像素偏移转换为画布坐标偏移
		const offset: Vec2D = {
			x: inverse.a * rawOffset.x + inverse.c * rawOffset.y,
			y: inverse.b * rawOffset.x + inverse.d * rawOffset.y,
		};
		(this.ctx.brushManager.brush as LassoBrush).startPoint = Vec2D.Add(
			(this.ctx.brushManager.brush as LassoBrush).startPoint,
			offset,
		);

		const lassoCtx = this.lassoLayer.vCtx;
		lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
		this.ctx.brushManager.brush.drawDot(Vec2D.Add((this.ctx.brushManager.brush as LassoBrush).preEndpoint, offset));
		this.ctx.grabContent((this.ctx.brushManager.brush as LassoBrush).boundBox, lassoCtx);

		this.ctx.cursorRenderer.clipGrabStartPos = pos;

		this.clipStarted = false;
	}
	private onPointerDown({ pos }: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			(this.ctx.brushManager.brush as LassoBrush).startPoint = deepClone(this.ctx.cursorRenderer.cursor.curPos);
		}
		if (this.ctx.state === "CLIPPING") {
			this.ctx.cursorRenderer.clipGrabStartPos = pos;
		}
	}
	private onPointerUp(_ev: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			(this.ctx.brushManager.brush as LassoBrush).drawDot(this.ctx.cursorRenderer.cursor.curPos);
		}
		if (this.ctx.state === "CLIPPING") {
			(this.ctx.brushManager.brush as LassoBrush).drawDot(undefined, false);
		}
	}
	private onEnterDown() {
		if (this.ctx.state === "CLIP") {
			this.ctx.state = "CLIPPING";
			this.clipStarted = true;
			const lassoBrush = this.ctx.brushManager.brush as LassoBrush;
			// 保存原始 boundBox(setMinBoundBox 会修改 LassoBrush.boundBox 的引用值
			const origLeft = lassoBrush.boundBox.left;
			const origTop = lassoBrush.boundBox.top;
			const origRight = lassoBrush.boundBox.right;
			const origBottom = lassoBrush.boundBox.bottom;

			this.ctx.clipedArea.imageData = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				origLeft,
				origTop,
				origRight - origLeft,
				origBottom - origTop,
			);
			lassoBrush.setMinBoundBox(this.ctx.clipedArea.imageData);
			this.ctx.clipedArea.boundBox = lassoBrush.boundBox;
			this.ctx.clipedArea.imageData = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				lassoBrush.boundBox.left,
				lassoBrush.boundBox.top,
				lassoBrush.boundBox.right - lassoBrush.boundBox.left,
				lassoBrush.boundBox.bottom - lassoBrush.boundBox.top,
			);
		} else if (this.ctx.state === "CLIPPING") {
			(this.ctx.brushManager.brush as LassoBrush).drawDot(undefined, false);
			this.ctx.putContent((this.ctx.brushManager.brush as LassoBrush).boundBox, this.lassoLayer.vCtx);
			this.ctx.canvasHistory.commitChange(
				this.ctx.clipedArea.boundBox,
				this.ctx.layerManager.currentLayer,
				(this.ctx.brushManager.brush as LassoBrush).boundBox,
			);
			this.ctx.layerManager.currentLayer.preCtx.putImageData(this.ctx.getImageData(), 0, 0);
			this.clipped = true;
			this.ctx.state = "CLIP";
		}
	}
	private offClip() {
		this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		if (!this.clipped) {
			this.ctx.putContent(this.ctx.clipedArea.boundBox, this.lassoLayer.vCtx);
		}
		this.ctx.keyListener.off("Enter:down", this.onEnterDown);
	}
}
