import type { PaintMode } from ".";
import type { Paint } from "..";
import type { MyPointerEvent } from "../Input/pointer-listener";

export class DrawMode implements PaintMode {
	/** 画布开始绘制 */
	private drawing: boolean = false;
	constructor(private ctx: Paint) {}

	onPointerMove(ev: MyPointerEvent) {
		if (this.ctx.canvasReady && this.ctx.currentLayer.visiable && !this.ctx.grabbing) {
			this.ctx.lineBBox.left = Math.floor(
				Math.min(this.ctx.lineBBox.left, this.ctx.cursor.curPos.x - this.ctx.brush.size)
			);
			this.ctx.lineBBox.right = Math.ceil(
				Math.max(this.ctx.lineBBox.right, this.ctx.cursor.curPos.x + this.ctx.brush.size)
			);
			this.ctx.lineBBox.top = Math.floor(
				Math.min(this.ctx.lineBBox.top, this.ctx.cursor.curPos.y - this.ctx.brush.size)
			);
			this.ctx.lineBBox.bottom = Math.ceil(
				Math.max(this.ctx.lineBBox.bottom, this.ctx.cursor.curPos.y + this.ctx.brush.size)
			);
			this.ctx.draw(this.ctx.cursor.curPos);
			this.drawing = true;
		}
	}
	onPointerDown(ev: MyPointerEvent) {}
	onPointerUp(ev: MyPointerEvent) {
		if (this.ctx.canvasReady && this.drawing) {
			this.ctx.line.endLine();

			this.ctx.canvasHistory.commitChange(this.ctx.lineBBox, this.ctx.currentLayer);

			this.ctx.currentLayer.preCtx.putImageData(this.ctx.getImageData(), 0, 0);
			/** 每一笔绘制完后重制包围盒 */
			this.ctx.lineBBox = {
				top: Infinity,
				left: Infinity,
				bottom: 0,
				right: 0,
			};
		}
		this.drawing = false;
	}
	onPointerLeave(ev: MyPointerEvent) {}
	onPointerEnter(ev: MyPointerEvent) {}
	onWheel(ev: MyPointerEvent) {}
}
