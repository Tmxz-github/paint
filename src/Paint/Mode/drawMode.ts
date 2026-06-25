import type { PaintMode } from ".";
import type { Paint } from "..";
import type { MyPointerEvent } from "../Input/pointer-listener";
import type { BrushCommitData } from "../DefaultPlugins";

export class DrawMode implements PaintMode {
	/** 画布开始绘制 */
	private drawing: boolean = false;
	constructor(private ctx: Paint) {}

	onPointerMove(_ev: MyPointerEvent) {
		if (this.ctx.canDraw) {
			this.ctx.lineBBox.left = Math.floor(
				Math.min(this.ctx.lineBBox.left, this.ctx.cursorRenderer.cursor.curPos.x - this.ctx.brushManager.brush.size),
			);
			this.ctx.lineBBox.right = Math.ceil(
				Math.max(this.ctx.lineBBox.right, this.ctx.cursorRenderer.cursor.curPos.x + this.ctx.brushManager.brush.size),
			);
			this.ctx.lineBBox.top = Math.floor(
				Math.min(this.ctx.lineBBox.top, this.ctx.cursorRenderer.cursor.curPos.y - this.ctx.brushManager.brush.size),
			);
			this.ctx.lineBBox.bottom = Math.ceil(
				Math.max(this.ctx.lineBBox.bottom, this.ctx.cursorRenderer.cursor.curPos.y + this.ctx.brushManager.brush.size),
			);
			this.ctx.draw(this.ctx.cursorRenderer.cursor.curPos);
			this.drawing = true;
		}
	}
	onPointerDown(_ev: MyPointerEvent) {}
	onPointerUp(_ev: MyPointerEvent) {
		if (this.ctx.canvasReady && this.drawing) {
			this.ctx.line.endLine();

			this.ctx.canvasHistory.commitChange(this.ctx.lineBBox, this.ctx.layerManager.currentLayer);

			// 笔刷提交钩子
			const commitData: BrushCommitData = {
				brush: this.ctx.brushManager.brush,
				boundBox: this.ctx.lineBBox,
				layer: this.ctx.layerManager.currentLayer,
			};
			this.ctx.plugins.forEach((p) => p.onBrushCommit?.(commitData));

			this.ctx.layerManager.currentLayer.preCtx.putImageData(this.ctx.getImageData(), 0, 0);
			/** 每一笔绘制完后重置包围盒 */
			this.ctx.lineBBox = {
				top: Infinity,
				left: Infinity,
				bottom: 0,
				right: 0,
			};
		}
		this.drawing = false;
	}
	onPointerLeave(_ev: MyPointerEvent) {}
	onPointerEnter(_ev: MyPointerEvent) {}
	onWheel(_ev: MyPointerEvent) {}
}
