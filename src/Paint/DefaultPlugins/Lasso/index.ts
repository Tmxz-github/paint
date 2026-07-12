import { PaintPlugin } from "..";
import type { Paint } from "../..";
import { Layer } from "../../Layer";
import type { AnyObject } from "../../Types";
import type { context2D } from "../../Types/canvas";
import { ClipMode } from "./ClipMode";
import { LassoSelector } from "./LassoSelector";

export class Lasso extends PaintPlugin {
	/** Lasso 内容渲染层 */
	private _lassoLayer!: Layer;
	/** Lasso 矩形框渲染层 */
	private _lassoRectLayer!: Layer;
	private mode!: ClipMode;
	/** Lasso 选择器实例 */
	public selector!: LassoSelector;

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
		this.on("TRANSFORM_CHANGED", () => {
			this.mode.redrawSelectionRect();
		});
		this._lassoLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});
		this._lassoRectLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});
		this.selector = new LassoSelector(this._lassoRectLayer.vCtx as context2D);
		this.mode = new ClipMode(instance, this._lassoLayer, this._lassoRectLayer, this.selector);
		instance.renderPipeline.registerRenderLayer({
			id: "lasso-content",
			zIndex: 100,
			layer: this._lassoLayer,
		});
		instance.renderPipeline.registerRenderLayer({
			id: "lasso-rect",
			zIndex: 200,
			layer: this._lassoRectLayer,
			isUIOverlay: true,
		});
	}
}
