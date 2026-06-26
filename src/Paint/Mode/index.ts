import type { Paint } from "..";
import type { MyPointerEvent } from "../Input/pointer-listener";

export abstract class PaintMode {
	abstract onEnterMode(data: any): void;
	abstract onLeaveMode(data: any): void;
}

export class BaseMode extends PaintMode {
	constructor(private ctx: Paint) {
		super();
	}
	onEnterMode(data: any) {
		this.ctx.pointerListener.on("MOVE", (ev: MyPointerEvent) => {
			this.onPointerMove(ev);
		});
		this.ctx.pointerListener.on("DOWN", (ev: MyPointerEvent) => {
			this.onPointerDown(ev);
		});
		this.ctx.pointerListener.on("UP", (ev: MyPointerEvent) => {
			this.onPointerUp(ev);
		});
		this.ctx.pointerListener.on("LEAVE", (ev: MyPointerEvent) => {
			this.onPointerLeave(ev);
		});
		this.ctx.pointerListener.on("ENTER", (ev: MyPointerEvent) => {
			this.onPointerEnter(ev);
		});
		this.ctx.pointerListener.on("WHEEL", (ev: MyPointerEvent) => {
			this.onWheel(ev);
		});

		this.ctx.keyListener.on(" :down", () => {
			this.ctx.cursorRenderer.grabReady = true;
		});
		this.ctx.keyListener.on(" :up", () => {
			this.ctx.cursorRenderer.grabReady = false;
			this.ctx.cursorRenderer.grabbing = false;
		});
		this.ctx.keyListener.control().on("z:up", () => {
			this.ctx.canvasHistory.undo();
			this.ctx.renderLayers();
		});
		this.ctx.keyListener.control().on("r:up", () => {
			this.ctx.canvasHistory.redo();
			this.ctx.renderLayers();
		});
		this.ctx.keyListener.on("w:down", () => {
			this.ctx.zoomIn();
		});
		this.ctx.keyListener.on("s:down", () => {
			this.ctx.zoomOut();
		});
	}
	onLeaveMode(data: any) {
		// todo off
	}
	private onPointerMove({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.renderLayers();
		this.ctx.cursorRenderer.render(pos);

		if (this.ctx.cursorRenderer.grabbing) {
			this.ctx.grabTo(this.ctx.cursorRenderer.pointerPos);
		}
	}
	private onPointerDown({ pos }: MyPointerEvent) {
		this.ctx.canvasReady = true;
		if (this.ctx.cursorRenderer.grabReady) {
			this.ctx.cursorRenderer.grabbing = true;
		}
		this.ctx.cursorRenderer.grabStartPos = pos;
	}
	private onPointerUp({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.cursorRenderer.grabbing = false;
		this.ctx.renderLayers();
	}
	private onPointerLeave({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.cursorRenderer.cursorIn = false;
		this.ctx.line.endLine();
		this.ctx.renderLayers();
	}
	private onPointerEnter({ pos }: MyPointerEvent) {
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.containerEl.focus();
		this.ctx.cursorRenderer.cursorIn = true;
		this.ctx.renderLayers();
	}
	private onWheel({ e, pos }: MyPointerEvent) {
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
