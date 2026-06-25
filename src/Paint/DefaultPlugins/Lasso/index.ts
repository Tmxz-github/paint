import { PaintPlugin } from "..";
import type { Paint } from "../..";
import { Layer } from "../../Layer";
import type { AnyObject } from "../../../Types";
import { ClipMode } from "./ClipMode";
import { LassoBrush } from "./LassoBrush";

export class Lasso extends PaintPlugin {
	/** Lasso 内容渲染层 */
	private _lassoLayer!: Layer;
	/** Lasso 矩形框渲染层 */
	private _lassoRectLayer!: Layer;

	constructor() {
		super();
		this.name = "lasso";
	}

	/** 已经确认修改的剪切内容 */
	private clipped: boolean = false;

	apply(instance: Paint) {
		this.on("SWITCH_BURSH", (data: AnyObject) => {
			const type = data.type;
			if (!type || typeof type !== "string") return;
			if (type === "LASSO") {
				instance.state = "CLIP";
				this.clipped = false;
				instance.mode = new ClipMode(instance, this, this._lassoLayer);
			} else {
				this.offClip(instance);
			}
		});

		// 创建渲染层并注册到 Paint
		this._lassoLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});
		this._lassoRectLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});

		instance.renderPipeline.registerRenderLayer({
			id: "lasso-content",
			zIndex: 100,
			layer: this._lassoLayer,
			pluginId: this.name,
		});
		instance.renderPipeline.registerRenderLayer({
			id: "lasso-rect",
			zIndex: 200,
			layer: this._lassoRectLayer,
			pluginId: this.name,
		});

		const lasso = new LassoBrush(this._lassoRectLayer.vCtx as CanvasRenderingContext2D);
		instance.brushManager.brushes.set("LASSO", lasso);

		instance.keyListener.on("Enter:up", this.handlerEnterDown, [instance], this);
	}

	private handlerEnterDown(instance: Paint) {
		if (instance.state === "CLIP") {
			instance.state = "CLIPPING";
			instance.clipStarted = true;
			const lassoBrush = instance.brushManager.brush as LassoBrush;
			// 保存原始 boundBox(setMinBoundBox 会修改 LassoBrush.boundBox 的引用值
			const origLeft = lassoBrush.boundBox.left;
			const origTop = lassoBrush.boundBox.top;
			const origRight = lassoBrush.boundBox.right;
			const origBottom = lassoBrush.boundBox.bottom;

			instance.clipedArea.imageData = instance.layerManager.currentLayer.vCtx.getImageData(
				origLeft,
				origTop,
				origRight - origLeft,
				origBottom - origTop,
			);
			lassoBrush.setMinBoundBox(instance.clipedArea.imageData);
			instance.clipedArea.boundBox = lassoBrush.boundBox;
			instance.clipedArea.imageData = instance.layerManager.currentLayer.vCtx.getImageData(
				lassoBrush.boundBox.left,
				lassoBrush.boundBox.top,
				lassoBrush.boundBox.right - lassoBrush.boundBox.left,
				lassoBrush.boundBox.bottom - lassoBrush.boundBox.top,
			);
		} else if (instance.state === "CLIPPING") {
			(instance.brushManager.brush as LassoBrush).drawDot(undefined, false);
			instance.putContent((instance.brushManager.brush as LassoBrush).boundBox, this._lassoLayer.vCtx);
			instance.canvasHistory.commitChange(
				instance.clipedArea.boundBox,
				instance.layerManager.currentLayer,
				(instance.brushManager.brush as LassoBrush).boundBox,
			);
			instance.layerManager.currentLayer.preCtx.putImageData(instance.getImageData(), 0, 0);
			this.clipped = true;
			instance.state = "CLIP";
		}
	}

	private offClip(instance: Paint) {
		instance.state = "DRAW";
		this._lassoRectLayer.vCtx.clearRect(0, 0, instance.width, instance.height);
		this._lassoLayer.vCtx.clearRect(0, 0, instance.width, instance.height);
		if (!this.clipped) {
			instance.putContent(instance.clipedArea.boundBox, this._lassoLayer.vCtx);
		}
		instance.keyListener.off("Enter:up", this.handlerEnterDown);
		instance.mode = instance.drawMode;
	}
}
