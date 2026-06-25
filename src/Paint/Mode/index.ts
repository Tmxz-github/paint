import type { Paint } from "..";
import type { MyPointerEvent } from "../Input/pointer-listener";

export interface PaintMode {
	onPointerMove: (e: MyPointerEvent) => void;
	onPointerDown: (e: MyPointerEvent) => void;
	onPointerUp: (e: MyPointerEvent) => void;
	onPointerLeave: (e: MyPointerEvent) => void;
	onPointerEnter: (e: MyPointerEvent) => void;
	onWheel: (e: MyPointerEvent) => void;
}

export class BaseMode implements PaintMode {
	constructor(private ctx: Paint) {}
	onPointerMove({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.renderLayers();
		this.ctx.cursorRenderer.render(pos);

		if (this.ctx.cursorRenderer.grabbing) {
			this.ctx.grabTo(this.ctx.cursorRenderer.pointerPos);
		}
	}
	onPointerDown({ pos }: MyPointerEvent) {
		this.ctx.canvasReady = true;
		if (this.ctx.cursorRenderer.grabReady) {
			this.ctx.cursorRenderer.grabbing = true;
		}
		this.ctx.cursorRenderer.grabStartPos = pos;
	}
	onPointerUp({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.cursorRenderer.grabbing = false;
		this.ctx.renderLayers();
	}
	onPointerLeave({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.cursorRenderer.cursorIn = false;
		this.ctx.line.endLine();
		this.ctx.renderLayers();
	}
	onPointerEnter({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.containerEl.focus();
		this.ctx.cursorRenderer.cursorIn = true;
		this.ctx.renderLayers();
	}
	onWheel({ e, pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		(e as WheelEvent).deltaY < 0
			? this.ctx.zoomIn({
					zoomMode: "wheel",
					center: { x: e.offsetX, y: e.offsetY },
					smooth: true,
				})
			: this.ctx.zoomOut({
					zoomMode: "wheel",
					center: { x: e.offsetX, y: e.offsetY },
					smooth: true,
				});
	}
}
