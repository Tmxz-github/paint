import { PaintMode } from "../../Mode";
import type { Paint } from "../..";
import { LassoSelector } from "./LassoSelector";
import type { InputEvent } from "../../Input/InputBus";
import { Vec2D } from "../../Types/vec2d";
import { deepClone, inBBox } from "../../Utils";
import { Layer } from "../../Layer";
import { BoundBox, ClipedArea } from "../../Types";
import { canvasToScreen, canvasBoxToScreen } from "../../Utils/canvas";

const MARGIN = 2;

export class ClipMode extends PaintMode {
	private readonly clipedArea: ClipedArea = ClipedArea.Empty;
	private clipped: boolean = false;
	private clipGrabStartPos: Vec2D = Vec2D.Zero;

	constructor(
		private ctx: Paint,
		private lassoLayer: Layer,
		private lassoRectLayer: Layer,
		private selector: LassoSelector,
	) {
		super();
	}

	onEnterMode(_data: any): void {
		this.ctx.state = "CLIP";
		this.clipped = false;
		this.ctx.input.on("pointer:move", this.onPointerMove, [], this);
		this.ctx.input.on("pointer:down", this.onPointerDown, [], this);
		this.ctx.input.on("pointer:up", this.onPointerUp, [], this);
		this.ctx.input.on("enter:down", this.onEnterDown, [this.ctx], this);
	}

	onLeaveMode(_data: any): void {
		this.offClip();
		this.ctx.input.off("pointer:move", this.onPointerMove);
		this.ctx.input.off("pointer:down", this.onPointerDown);
		this.ctx.input.off("pointer:up", this.onPointerUp);
		this.ctx.input.off("enter:down", this.onEnterDown);
	}

	// ─── 坐标转换 ─────────────────────────────────────

	private get domMatrix(): DOMMatrix {
		return this.ctx.viewCtx.getTransform();
	}

	private get zoomScale(): number {
		const t = this.domMatrix;
		return Math.sqrt(t.a * t.a + t.b * t.b);
	}

	// ─── 对 lassoRectLayer（UI overlay）的操作 ─────────

	private screenMargin(): number {
		return MARGIN * this.zoomScale;
	}

	private clearRectLayer(canvasBox: BoundBox) {
		const sm = this.screenMargin();
		const sb = BoundBox.Inflate(canvasBoxToScreen(canvasBox, this.domMatrix), sm);
		if (BoundBox.IsEmpty(sb)) return;
		this.lassoRectLayer.vCtx.clearRect(sb.left, sb.top, sb.right - sb.left, sb.bottom - sb.top);
		this.lassoRectLayer.markDirty(sb);
	}

	private drawSelectionScreen(start: Vec2D, end: Vec2D) {
		const ctx = this.lassoRectLayer.vCtx;
		const left = Math.min(start.x, end.x);
		const right = Math.max(start.x, end.x);
		const top = Math.min(start.y, end.y);
		const bottom = Math.max(start.y, end.y);
		ctx.save();
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#000";
		ctx.setLineDash([4, 3]);
		ctx.beginPath();
		ctx.rect(left, top, right - left, bottom - top);
		ctx.stroke();
		ctx.restore();
		return BoundBox.Inflate({ top, left, bottom, right }, this.screenMargin());
	}

	/** transform 变化后重绘剪切框（屏幕坐标） */
	public redrawSelectionRect(): void {
		if (BoundBox.IsEmpty(this.selector.boundBox)) return;
		// 清除 lassoRectLayer 全部内容
		this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoRectLayer.markDirty({
			top: 0,
			left: 0,
			bottom: this.ctx.height,
			right: this.ctx.width,
		});
		// 基于当前 boundBox（canvas 坐标）重新转换到屏幕坐标并绘制
		const screenStart = canvasToScreen(this.selector.startPoint, this.domMatrix);
		const screenEnd = canvasToScreen(this.selector.preEndpoint, this.domMatrix);
		const screenDirty = this.drawSelectionScreen(screenStart, screenEnd);
		this.lassoRectLayer.markDirty(screenDirty);
	}

	// ─── 事件处理 ─────────────────────────────────────

	private onPointerMove(ev: InputEvent) {
		const pos = ev.pos!;
		if (this.ctx.canDraw && this.ctx.state === "CLIP") {
			const oldBox = this.selector.boundBox;
			const newEnd = this.ctx.cursorRenderer.canvasPos;

			this.selector.updateBounds(this.selector.startPoint, newEnd);
			this.clearRectLayer(oldBox);
			const screenDirty = this.drawSelectionScreen(
				canvasToScreen(this.selector.startPoint, this.domMatrix),
				canvasToScreen(newEnd, this.domMatrix),
			);
			this.lassoRectLayer.markDirty(screenDirty);
			return;
		}
		if (this.ctx.state !== "CLIPPING" || !this.ctx.canDraw) return;

		const oldBox = deepClone(this.selector.boundBox);
		const inBox = inBBox(this.ctx.cursorRenderer.canvasPos, oldBox);
		if (!inBox) return;

		const inverse = this.domMatrix.inverse();
		const rawOffset = Vec2D.Sub(pos, this.clipGrabStartPos);
		const offset: Vec2D = {
			x: inverse.a * rawOffset.x + inverse.c * rawOffset.y,
			y: inverse.b * rawOffset.x + inverse.d * rawOffset.y,
		};

		this.selector.startPoint = Vec2D.Add(this.selector.startPoint, offset);

		const boxW = oldBox.right - oldBox.left;
		const boxH = oldBox.bottom - oldBox.top;
		const putContentBox: BoundBox = {
			top: this.selector.startPoint.y,
			left: this.selector.startPoint.x,
			bottom: this.selector.startPoint.y + boxH,
			right: this.selector.startPoint.x + boxW,
		};

		this.selector.updateBounds(this.selector.startPoint, Vec2D.Add(this.selector.preEndpoint, offset));

		this.clearRectLayer(oldBox);
		const screenDirty = this.drawSelectionScreen(
			canvasToScreen(this.selector.startPoint, this.domMatrix),
			canvasToScreen(this.selector.preEndpoint, this.domMatrix),
		);
		this.lassoRectLayer.markDirty(screenDirty);

		const inflatedOld = BoundBox.Inflate(oldBox, MARGIN);
		this.lassoLayer.vCtx.clearRect(
			inflatedOld.left,
			inflatedOld.top,
			inflatedOld.right - inflatedOld.left,
			inflatedOld.bottom - inflatedOld.top,
		);
		this.grabContent(putContentBox);
		this.clipGrabStartPos = pos;
	}

	private onPointerDown(ev: InputEvent) {
		const pos = ev.pos!;
		if (this.ctx.state === "CLIP") {
			this.selector.startPoint = deepClone(this.ctx.cursorRenderer.canvasPos);
		}
		if (this.ctx.state === "CLIPPING") {
			this.clipGrabStartPos = pos;
		}
	}

	private onPointerUp(_ev: InputEvent) {
		if (this.ctx.state === "CLIP") {
			const oldBox = this.selector.boundBox;
			const newEnd = this.ctx.cursorRenderer.canvasPos;
			this.selector.updateBounds(this.selector.startPoint, newEnd);
			this.clearRectLayer(oldBox);
			const screenDirty = this.drawSelectionScreen(
				canvasToScreen(this.selector.startPoint, this.domMatrix),
				canvasToScreen(newEnd, this.domMatrix),
			);
			this.lassoRectLayer.markDirty(screenDirty);
			this.ctx.renderLayers();
		}
	}

	private onEnterDown() {
		if (this.ctx.state === "CLIP") {
			this.ctx.state = "CLIPPING";
			const originBox = deepClone(BoundBox.Shrink(this.selector.boundBox, 2));

			const origImg = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				originBox.left,
				originBox.top,
				originBox.right - originBox.left,
				originBox.bottom - originBox.top,
			);

			this.clearRectLayer(BoundBox.Inflate(originBox, 2));
			this.selector.setMinBoundBox(origImg);
			// originBox 已经是脏区了
			this.drawSelectionScreen(
				canvasToScreen(this.selector.startPoint, this.domMatrix),
				canvasToScreen(this.selector.preEndpoint, this.domMatrix),
			);
			const tightBox = deepClone(this.selector.boundBox);
			this.clipedArea.boundBox = tightBox;

			this.clipedArea.imageData = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				tightBox.left,
				tightBox.top,
				tightBox.right - tightBox.left,
				tightBox.bottom - tightBox.top,
			);

			this.ctx.layerManager.currentLayer.vCtx.clearRect(
				originBox.left,
				originBox.top,
				originBox.right - originBox.left,
				originBox.bottom - originBox.top,
			);
			this.ctx.layerManager.currentLayer.markDirty(originBox);

			this.grabContent(tightBox);
			this.lassoLayer.markDirty(tightBox);
			this.ctx.renderLayers();
		} else if (this.ctx.state === "CLIPPING") {
			this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
			this.lassoRectLayer.markDirty({
				top: 0,
				left: 0,
				bottom: this.ctx.height,
				right: this.ctx.width,
			});

			const boundBox = this.selector.boundBox;
			this.lassoLayer.vCtx.clearRect(
				boundBox.left,
				boundBox.top,
				boundBox.right - boundBox.left,
				boundBox.bottom - boundBox.top,
			);
			this.lassoLayer.markDirty(boundBox);

			this.putContent(boundBox);
			this.ctx.layerManager.currentLayer.markDirty(boundBox);
			this.ctx.canvasHistory.commitChange(
				this.clipedArea.boundBox,
				this.ctx.layerManager.currentLayer,
				this.selector.boundBox,
			);
			this.ctx.layerManager.currentLayer.snapshot();
			this.clipped = true;
			this.ctx.state = "CLIP";
			// 清除 selector 状态，避免缩放时 ghost 剪切框
			this.selector.boundBox = BoundBox.Empty;
			this.ctx.renderLayers();
		}
	}

	private offClip() {
		const fullDirty = { top: 0, left: 0, bottom: this.ctx.height, right: this.ctx.width };
		this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoRectLayer.markDirty(fullDirty);
		this.lassoLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoLayer.markDirty(fullDirty);
		if (!this.clipped && !ClipedArea.IsEmpty(this.clipedArea)) {
			this.putContent(this.clipedArea.boundBox);
			this.ctx.layerManager.currentLayer.markDirty(this.clipedArea.boundBox);
		}
	}

	private grabContent(boundBox: BoundBox) {
		const p = { x: Math.floor(boundBox.left), y: Math.floor(boundBox.top) };
		this.lassoLayer.vCtx.putImageData(this.clipedArea.imageData, p.x, p.y);
	}

	private putContent(boundBox: BoundBox) {
		const p = { x: Math.floor(boundBox.left), y: Math.floor(boundBox.top) };
		this.ctx.layerManager.currentLayer.vCtx.putImageData(this.clipedArea.imageData, p.x, p.y);
	}
}
