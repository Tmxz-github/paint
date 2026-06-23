import { PaintPlugin } from "..";
import type { Paint } from "../..";
import { LASSO_LAYER_INDEX, LASSO_RECT_INDEX } from "../../constants";
import type { AnyObject } from "../../types";
import { ClipMode } from "./ClipMode";
import { LassoBrush } from "./LassoBrush";

export class Lasso extends PaintPlugin {
	constructor() {
		super();
		this.name = "lasso";
	}

	/** 剪切状态 */
	private state: "CLIPPING" | "CLIP" | "" = "";
	/** 已经确认修改的剪切内容 */
	private clipped: boolean = false;

	apply(instance: Paint) {
		this.on("SWITCH_BURSH", (data: AnyObject) => {
			const type = data.type;
			if (!type || typeof type !== "string") return;
			if (type === "LASSO") {
				instance.state = "CLIP";
				this.clipped = false;
				instance.mode = new ClipMode(instance, this);
			} else {
				this.offClip(instance);
			}
		});

		const lasso = new LassoBrush(instance.backLayers[LASSO_RECT_INDEX].vCtx as CanvasRenderingContext2D);
		instance.brushes.set("LASSO", lasso);

		instance.keyListener.on("Enter:up", this.handlerEnterDown, [instance], this);
	}

	private handlerEnterDown(instance: Paint) {
		if (instance.state === "CLIP") {
			instance.state = "CLIPPING";
			instance.clipStarted = true;
			const boundBox = (instance.brush as LassoBrush).boundBox;
			instance.clipedArea.boundBox = boundBox;
			instance.clipedArea.imageData = instance.currentLayer.vCtx.getImageData(
				boundBox.left,
				boundBox.top,
				boundBox.right - boundBox.left,
				boundBox.bottom - boundBox.top
			);
			(instance.brush as LassoBrush).setMinBoundBox(instance.clipedArea.imageData);
			instance.clipedArea.imageData = instance.currentLayer.vCtx.getImageData(
				boundBox.left,
				boundBox.top,
				boundBox.right - boundBox.left,
				boundBox.bottom - boundBox.top
			);
		} else if (instance.state === "CLIPPING") {
			(instance.brush as LassoBrush).drawDot(undefined, false);
			instance.putContent((instance.brush as LassoBrush).boundBox);
			instance.canvasHistory.commitChange(
				instance.clipedArea.boundBox,
				instance.currentLayer,
				(instance.brush as LassoBrush).boundBox
			);
			instance.currentLayer.preCtx.putImageData(instance.getImageData(), 0, 0);
			this.clipped = true;
			instance.state = "CLIP";
		}
	}

	private offClip(instance: Paint) {
		instance.state = "DRAW";
		instance.backLayers[LASSO_RECT_INDEX].vCtx.clearRect(0, 0, instance.width, instance.height);
		instance.backLayers[LASSO_LAYER_INDEX].vCtx.clearRect(0, 0, instance.width, instance.height);
		if (!this.clipped) {
			instance.putContent(instance.clipedArea.boundBox);
		}
		instance.keyListener.off("Enter:up", this.handlerEnterDown);
		instance.mode = instance.drawMode;
	}
}
