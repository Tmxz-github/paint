import type { PaintMode } from ".";
import type { Paint } from "..";
import type { MyPointerEvent } from "../Input/pointer-listener";
import type { BrushCommitData } from "../DefaultPlugins";
import { BoundBox } from "../Types";

export class DrawMode implements PaintMode {
	/** 画布开始绘制 */
	private drawing: boolean = false;
	/** 每一笔绘制后的包围盒 */
	private lineBBox: BoundBox = BoundBox.Empty;
	constructor(private ctx: Paint) {}
	onEnterMode(data: any): void {
		this.ctx.state = "DRAW";
		this.ctx.pointerListener.on("MOVE", this.onPointerMove, this);
		this.ctx.pointerListener.on("UP", this.onPointerUp, this);
	}
	onLeaveMode(data: any): void {
		this.ctx.pointerListener.off("MOVE", this.onPointerMove);
		this.ctx.pointerListener.off("UP", this.onPointerUp);
	}
	onPointerMove(_ev: MyPointerEvent) {
		if (this.ctx.canDraw && this.ctx.state === "DRAW") {
			this.lineBBox.left = Math.floor(
				Math.min(this.lineBBox.left, this.ctx.cursorRenderer.cursor.curPos.x - this.ctx.brushManager.brush.size),
			);
			this.lineBBox.right = Math.ceil(
				Math.max(this.lineBBox.right, this.ctx.cursorRenderer.cursor.curPos.x + this.ctx.brushManager.brush.size),
			);
			this.lineBBox.top = Math.floor(
				Math.min(this.lineBBox.top, this.ctx.cursorRenderer.cursor.curPos.y - this.ctx.brushManager.brush.size),
			);
			this.lineBBox.bottom = Math.ceil(
				Math.max(this.lineBBox.bottom, this.ctx.cursorRenderer.cursor.curPos.y + this.ctx.brushManager.brush.size),
			);
			this.ctx.draw(this.ctx.cursorRenderer.cursor.curPos);
			this.drawing = true;
		}
	}
	onPointerUp(_ev: MyPointerEvent) {
		if (this.drawing) {
			this.ctx.line.endLine();
			this.ctx.canvasHistory.commitChange(this.lineBBox, this.ctx.layerManager.currentLayer);

			// 标记整笔脏区，确保下一帧 renderLayers 只重绘受影响区域
			this.ctx.layerManager.currentLayer.markDirty(this.lineBBox);

			// 笔刷提交钩子
			const commitData: BrushCommitData = {
				brush: this.ctx.brushManager.brush,
				boundBox: this.lineBBox,
				layer: this.ctx.layerManager.currentLayer,
			};
			this.ctx.plugins.forEach((p) => p.onBrushCommit?.(commitData));

			this.ctx.layerManager.currentLayer.preCtx.putImageData(this.ctx.getImageData(), 0, 0);
			/** 每一笔绘制完后重置包围盒 */
			this.lineBBox = {
				top: Infinity,
				left: Infinity,
				bottom: 0,
				right: 0,
			};
		}
		this.drawing = false;
	}
}
