import type { Paint } from "..";
import type { InputEvent } from "../Input/InputBus";

export abstract class PaintMode {
	abstract onEnterMode(data: any): void;
	abstract onLeaveMode(data: any): void;
}

export class BaseMode extends PaintMode {
	constructor(private ctx: Paint) {
		super();
	}
	onEnterMode(_data: any) {
		this.ctx.input.on("pointer:move", (ev) => {
			this.onPointerMove(ev);
		});
		this.ctx.input.on("pointer:down", (ev) => {
			this.onPointerDown(ev);
		});
		this.ctx.input.on("pointer:up", (ev) => {
			this.onPointerUp(ev);
		});
		this.ctx.input.on("pointer:leave", (ev) => {
			this.onPointerLeave(ev);
		});
		this.ctx.input.on("pointer:enter", (ev) => {
			this.onPointerEnter(ev);
		});
		this.ctx.input.on("wheel:up", (ev) => {
			this.onWheel(ev);
		});
		this.ctx.input.on("wheel:down", (ev) => {
			this.onWheel(ev);
		});

		this.ctx.input.on("space:down", () => {
			this.ctx.transform.grabReady = true;
		});
		this.ctx.input.on("space:up", () => {
			this.ctx.transform.grabReady = false;
			this.ctx.transform.grabbing = false;
		});
		this.ctx.input.control().on("z:up", () => {
			this.ctx.canvasHistory.undo();
			this.ctx.renderLayers();
		});
		this.ctx.input.control().on("r:up", () => {
			this.ctx.canvasHistory.redo();
			this.ctx.renderLayers();
		});
		this.ctx.input.on("w:down", () => {
			this.ctx.zoomIn();
		});
		this.ctx.input.on("s:down", () => {
			this.ctx.zoomOut();
		});
	}
	onLeaveMode(_data: any) {
		// todo off
	}
	private onPointerMove(ev: InputEvent) {
		const pos = ev.pos!;
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.cursorRenderer.render(pos);
		this.ctx.renderLayers();

		if (this.ctx.transform.grabbing) {
			this.ctx.grabTo(this.ctx.cursorRenderer.pointerPos);
		}
	}
	private onPointerDown(ev: InputEvent) {
		const pos = ev.pos!;
		this.ctx.canvasReady = true;
		if (this.ctx.transform.grabReady) {
			this.ctx.transform.grabbing = true;
		}
		this.ctx.transform.grabStartPos = pos;
	}
	private onPointerUp(ev: InputEvent) {
		const pos = ev.pos!;
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.transform.grabbing = false;
		this.ctx.renderLayers();
	}
	private onPointerLeave(ev: InputEvent) {
		const pos = ev.pos!;
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.canvasReady = false;
		this.ctx.cursorRenderer.cursorIn = false;
		this.ctx.line.endLine();
		this.ctx.renderPipeline.renderAll();
	}
	private onPointerEnter(ev: InputEvent) {
		const pos = ev.pos!;
		this.ctx.cursorRenderer.pointerPos = pos;
		this.ctx.containerEl.focus();
		this.ctx.cursorRenderer.cursorIn = true;
		this.ctx.renderLayers();
	}
	private onWheel(ev: InputEvent) {
		const pos = ev.pos!;
		this.ctx.cursorRenderer.pointerPos = pos;
		(ev.e as WheelEvent).deltaY < 0
			? this.ctx.zoomIn({
					zoomMode: "wheel",
					center: { x: pos.x, y: pos.y },
					smooth: true,
				})
			: this.ctx.zoomOut({
					zoomMode: "wheel",
					center: { x: pos.x, y: pos.y },
					smooth: true,
				});
	}
}
