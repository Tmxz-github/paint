import { PaintPlugin } from "..";
import type { Paint } from "../..";
import { Layer } from "../../Layer";
import type { AnyObject } from "../../Types";
import { ClipMode } from "./ClipMode";
import { LassoBrush } from "./LassoBrush";

export class Lasso extends PaintPlugin {
	/** Lasso 内容渲染层 */
	private _lassoLayer!: Layer;
	/** Lasso 矩形框渲染层 */
	private _lassoRectLayer!: Layer;
	private mode!: ClipMode;

	constructor() {
		super();
		this.name = "lasso";
	}

	apply(instance: Paint) {
		this.on("SWITCH_BRUSH", (data: AnyObject) => {
			const type = data.type;
			if (!type || typeof type !== "string") return;
			if (type === "LASSO") {
				instance.mode = this.mode;
			}
		});
		this._lassoLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});
		this._lassoRectLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});
		this.mode = new ClipMode(instance, this._lassoLayer, this._lassoRectLayer);
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
	}
}
