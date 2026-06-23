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
		this.ctx.pointerPos = pos;
		this.ctx.renderLayers();
		this.ctx.cursorRender(pos);

		if (this.ctx.grabbing) {
			this.ctx.grabTo(this.ctx.pointerPos);
		}
	}
	onPointerDown({ pos }: MyPointerEvent) {
		this.ctx.canvasReady = true;
		if (this.ctx.grabReady) {
			this.ctx.grabbing = true;
		}
		this.ctx.grabStartPos = pos;
	}
	onPointerUp({ pos }: MyPointerEvent) {
		this.ctx.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.grabbing = false;
		this.ctx.renderLayers();
	}
	onPointerLeave({ pos }: MyPointerEvent) {
		this.ctx.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.cursorIn = false;
		this.ctx.line.endLine();
		this.ctx.renderLayers();
	}
	onPointerEnter({ pos }: MyPointerEvent) {
		this.ctx.pointerPos = pos;
		this.ctx.containerEl.focus();
		this.ctx.cursorIn = true;
		this.ctx.renderLayers();
	}
	onWheel({ e, pos }: MyPointerEvent) {
		this.ctx.pointerPos = pos;
		(e as WheelEvent).deltaY < 0
			? this.ctx.zoomIn({
					scaleStep: this.ctx.scaleStep * this.ctx.scaleValue,
					center: { x: e.offsetX, y: e.offsetY },
					smooth: true,
				})
			: this.ctx.zoomOut({
					scaleStep: this.ctx.scaleStep * this.ctx.scaleValue,
					center: { x: e.offsetX, y: e.offsetY },
					smooth: true,
				});
	}
}
