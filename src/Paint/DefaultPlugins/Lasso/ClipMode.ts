import { PaintMode } from "../../Mode";
import type { Paint } from "../..";
import { LassoSelector } from "./LassoSelector";
import type { MyPointerEvent } from "../../Input/pointer-listener";
import { Vec2D } from "../../Types/vec2d";
import { deepClone, inBBox } from "../../Utils";
import { Layer } from "../../Layer";
import { BoundBox, ClipedArea } from "../../Types";

const MARGIN = 2;

export class ClipMode extends PaintMode {
	private readonly clipedArea: ClipedArea = ClipedArea.Empty;
	private clipped: boolean = false;
	private clipGrabStartPos: Vec2D = Vec2D.Zero;
	/** onEnterDown 时保存的未收缩原始选区范围 */
	private _origBox: BoundBox = BoundBox.Empty;

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
		this._origBox = BoundBox.Empty;
		this.ctx.pointerListener.on("MOVE", this.onPointerMove, this);
		this.ctx.pointerListener.on("DOWN", this.onPointerDown, this);
		this.ctx.pointerListener.on("UP", this.onPointerUp, this);
		this.ctx.keyListener.on("Enter:down", this.onEnterDown, [this.ctx], this);
	}

	onLeaveMode(_data: any): void {
		this.offClip();
		this.ctx.pointerListener.off("MOVE", this.onPointerMove);
		this.ctx.pointerListener.off("DOWN", this.onPointerDown);
		this.ctx.pointerListener.off("UP", this.onPointerUp);
		this.ctx.keyListener.off("Enter:down", this.onEnterDown);
	}

	private clearRectLayer(box: BoundBox) {
		const b = BoundBox.inflate(box, MARGIN);
		if (BoundBox.IsEmpty(b)) return;
		const w = b.right - b.left;
		const h = b.bottom - b.top;
		this.lassoRectLayer.vCtx.clearRect(b.left, b.top, w, h);
		this.lassoRectLayer.markDirty(b);
	}

	private onPointerMove({ pos }: MyPointerEvent) {
		if (this.ctx.canDraw && this.ctx.state === "CLIP") {
			this.clearRectLayer(this.selector.boundBox);
			this.selector.drawSelection([this.selector.startPoint, this.ctx.cursorRenderer.canvasPos]);
			this.ctx.renderLayers();
			return;
		}
		if (this.ctx.state !== "CLIPPING" || !this.ctx.canDraw) {
			return;
		}

		const currentBox = this.selector.boundBox;
		const inBox = inBBox(this.ctx.cursorRenderer.canvasPos, currentBox);
		if (!inBox) return;
		const t = this.ctx.viewCtx.getTransform();
		const inverse = t.inverse();
		const rawOffset = Vec2D.Sub(pos, this.clipGrabStartPos);
		const offset: Vec2D = {
			x: inverse.a * rawOffset.x + inverse.c * rawOffset.y,
			y: inverse.b * rawOffset.x + inverse.d * rawOffset.y,
		};

		const oldBox = currentBox;

		this.selector.startPoint = Vec2D.Add(this.selector.startPoint, offset);

		const boxW = oldBox.right - oldBox.left;
		const boxH = oldBox.bottom - oldBox.top;
		const newBox: BoundBox = {
			top: this.selector.startPoint.y,
			left: this.selector.startPoint.x,
			bottom: this.selector.startPoint.y + boxH,
			right: this.selector.startPoint.x + boxW,
		};

		this.clearRectLayer(oldBox);
		this.selector.drawSelection([this.selector.startPoint, Vec2D.Add(this.selector.preEndpoint, offset)]);
		this.lassoRectLayer.markDirty(BoundBox.inflate(this.selector.boundBox, MARGIN));

		const inflatedOld = BoundBox.inflate(oldBox, MARGIN);
		this.lassoLayer.vCtx.clearRect(
			inflatedOld.left,
			inflatedOld.top,
			inflatedOld.right - inflatedOld.left,
			inflatedOld.bottom - inflatedOld.top,
		);
		this.grabContent(newBox);
		this.clipGrabStartPos = pos;
	}

	private onPointerDown({ pos }: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			this.selector.startPoint = deepClone(this.ctx.cursorRenderer.canvasPos);
		}
		if (this.ctx.state === "CLIPPING") {
			this.clipGrabStartPos = pos;
		}
	}

	private onPointerUp(_ev: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			const oldBox = this.selector.boundBox;
			this.clearRectLayer(oldBox);
			this.selector.drawSelection([this.selector.startPoint, this.ctx.cursorRenderer.canvasPos]);
			this.lassoRectLayer.markDirty(BoundBox.inflate(this.selector.boundBox, MARGIN));
			this.ctx.renderLayers();
		}
	}

	private onEnterDown() {
		if (this.ctx.state === "CLIP") {
			this.ctx.state = "CLIPPING";
			this._origBox = deepClone(this.selector.boundBox);

			const origImg = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				this._origBox.left,
				this._origBox.top,
				this._origBox.right - this._origBox.left,
				this._origBox.bottom - this._origBox.top,
			);
			this.clipedArea.imageData = origImg;

			this.clearRectLayer(this._origBox);
			this.selector.setMinBoundBox(origImg);
			const tightBox = {
				top: this.selector.boundBox.top,
				left: this.selector.boundBox.left,
				bottom: this.selector.boundBox.bottom,
				right: this.selector.boundBox.right,
			};
			this.clipedArea.boundBox = tightBox;

			this.clipedArea.imageData = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				tightBox.left,
				tightBox.top,
				tightBox.right - tightBox.left,
				tightBox.bottom - tightBox.top,
			);

			this.ctx.layerManager.currentLayer.vCtx.clearRect(
				this._origBox.left,
				this._origBox.top,
				this._origBox.right - this._origBox.left,
				this._origBox.bottom - this._origBox.top,
			);
			this.ctx.layerManager.currentLayer.markDirty(this._origBox);

			this.grabContent(tightBox);
			this.lassoLayer.markDirty(tightBox);
		} else if (this.ctx.state === "CLIPPING") {
			this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
			this.lassoRectLayer.markDirty({
				top: 0,
				left: 0,
				bottom: this.ctx.height,
				right: this.ctx.width,
			});

			const boundBox = this.selector.boundBox;
			const lassoCtx = this.lassoLayer.vCtx;
			lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
			this.lassoLayer.markDirty(boundBox);

			this.putContent(boundBox);
			this.ctx.canvasHistory.commitChange(
				this.clipedArea.boundBox,
				this.ctx.layerManager.currentLayer,
				this.selector.boundBox,
			);
			this.ctx.layerManager.currentLayer.snapshot();
			this.clipped = true;
			this.ctx.state = "CLIP";
		}
	}

	private offClip() {
		const fullDirty = { top: 0, left: 0, bottom: this.ctx.height, right: this.ctx.width };
		this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoRectLayer.markDirty(fullDirty);
		this.lassoLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoLayer.markDirty(fullDirty);
		if (!this.clipped) {
			this.putContent(this.clipedArea.boundBox);
		}
	}

	private grabContent(boundBox: BoundBox) {
		const targetPos = { x: Math.floor(boundBox.left), y: Math.floor(boundBox.top) };
		this.lassoLayer.vCtx.putImageData(this.clipedArea.imageData, targetPos.x, targetPos.y);
	}

	private putContent(boundBox: BoundBox) {
		const targetPos = { x: Math.floor(boundBox.left), y: Math.floor(boundBox.top) };
		this.ctx.layerManager.currentLayer.vCtx.putImageData(this.clipedArea.imageData, targetPos.x, targetPos.y);
	}
}
