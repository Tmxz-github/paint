import type { PaintMode } from ".";
import type { Paint } from "..";
import type { InputEvent } from "../Input/InputBus";
import type { BrushCommitData } from "../DefaultPlugins";
import { BoundBox } from "../Types";

export class DrawMode implements PaintMode {
	private drawing: boolean = false;
	private lineBBox: BoundBox = BoundBox.Empty;

	constructor(private ctx: Paint) {}

	onEnterMode(_data: any): void {
		this.ctx.state = "DRAW";
		this.ctx.input.on("pointer:move", this.onPointerMove, [], this);
		this.ctx.input.on("pointer:up", this.onPointerUp, [], this);
		this.ctx.input.on("pointer:down", this.onPointerDown, [], this);
	}

	onLeaveMode(_data: any): void {
		this.ctx.input.off("pointer:move", this.onPointerMove);
		this.ctx.input.off("pointer:up", this.onPointerUp);
		this.ctx.input.off("pointer:down", this.onPointerDown);
	}

	private onPointerDown(_ev: InputEvent) {
		this.drawing = true;
	}

	private onPointerMove(_ev: InputEvent) {
		if (this.ctx.canDraw && this.ctx.state === "DRAW" && this.drawing) {
			this.lineBBox.left = Math.floor(
				Math.min(this.lineBBox.left, this.ctx.cursorRenderer.canvasPos.x - this.ctx.brushManager.brush.size),
			);
			this.lineBBox.right = Math.ceil(
				Math.max(this.lineBBox.right, this.ctx.cursorRenderer.canvasPos.x + this.ctx.brushManager.brush.size),
			);
			this.lineBBox.top = Math.floor(
				Math.min(this.lineBBox.top, this.ctx.cursorRenderer.canvasPos.y - this.ctx.brushManager.brush.size),
			);
			this.lineBBox.bottom = Math.ceil(
				Math.max(this.lineBBox.bottom, this.ctx.cursorRenderer.canvasPos.y + this.ctx.brushManager.brush.size),
			);
			this.ctx.draw(this.ctx.cursorRenderer.canvasPos);
		}
	}

	private onPointerUp(_ev: InputEvent) {
		if (this.drawing) {
			this.ctx.line.endLine();
			this.ctx.canvasHistory.commitChange(this.lineBBox, this.ctx.layerManager.currentLayer);
			this.ctx.layerManager.currentLayer.markDirty(this.lineBBox);

			const commitData: BrushCommitData = {
				brush: this.ctx.brushManager.brush,
				boundBox: this.lineBBox,
				layer: this.ctx.layerManager.currentLayer,
			};
			this.ctx.plugins.forEach((p) => p.onBrushCommit?.(commitData));
			this.ctx.layerManager.currentLayer.snapshot();
			this.lineBBox = BoundBox.Empty;
		}
		this.drawing = false;
	}
}
