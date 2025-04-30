import type { PaintMode } from ".";
import type { Paint } from "..";
import type { Lasso } from "../Brushes/Lasso";
import type { MyPointerEvent } from "../Input/pointer-listener";
import { Vec2D } from "../types";
import { deepClone } from "../Utils";

export class ClipMode implements PaintMode {
	constructor(private ctx: Paint) {}

	onPointerMove({ e, pos }: MyPointerEvent) {
		this.ctx.renderLayers();

		this.ctx.cursorRender(this.ctx.pointerPos);

		if (this.ctx.canvasReady && this.ctx.currentLayer.visiable && !this.ctx.grabbing && this.ctx.state === "CLIP") {
			this.ctx.brush.drawDot(this.ctx.cursor.curPos);
			return;
		}

		if (this.ctx.canvasReady && this.ctx.currentLayer.visiable && !this.ctx.grabbing && this.ctx.state === "CLIPPING") {
			if (this.ctx.inBBox(this.ctx.cursor.curPos, (this.ctx.brush as Lasso).boundBox)) {
				const boundBox = (this.ctx.brush as Lasso).boundBox;
				if (this.ctx.clipStarted) {
					this.ctx.currentLayer.vCtx.clearRect(
						boundBox.left,
						boundBox.top,
						boundBox.right - boundBox.left,
						boundBox.bottom - boundBox.top
					);
				}
				const offset = Vec2D.Sub(pos, this.ctx.clipGrabStartPos);

				offset.x /= this.ctx.scaleValue;
				offset.y /= this.ctx.scaleValue;

				(this.ctx.brush as Lasso).startPoint = Vec2D.Add((this.ctx.brush as Lasso).startPoint, offset);

				const lassoCtx = this.ctx.backLayers[0].vCtx;
				lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
				this.ctx.brush.drawDot(Vec2D.Add((this.ctx.brush as Lasso).preEndpoint, offset));
				this.ctx.grabContent((this.ctx.brush as Lasso).boundBox);

				this.ctx.clipGrabStartPos = pos;

				this.ctx.clipStarted = false;
			}
			return;
		}
	}
	onPointerDown({ pos }: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			(this.ctx.brush as Lasso).startPoint = deepClone(this.ctx.cursor.curPos);
		}
		if (this.ctx.state === "CLIPPING") {
			this.ctx.clipGrabStartPos = pos;
		}
	}
	onPointerUp(ev: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			(this.ctx.brush as Lasso).drawDot(this.ctx.cursor.curPos);
		}
		if (this.ctx.state === "CLIPPING") {
			(this.ctx.brush as Lasso).drawDot(undefined, false);
		}
	}
	onPointerLeave(ev: MyPointerEvent) {
	}
	onPointerEnter(ev: MyPointerEvent){}
	onWheel(ev: MyPointerEvent){}
}
