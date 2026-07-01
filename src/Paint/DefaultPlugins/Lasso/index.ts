import { PaintPlugin } from "..";
import type { Paint } from "../..";
import { Layer } from "../../Layer";
import type { AnyObject } from "../../Types";
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
		this._lassoLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});
		this._lassoRectLayer = new Layer({
			width: instance.width,
			height: instance.height,
		});
		this.selector = new LassoSelector(this._lassoRectLayer.vCtx as CanvasRenderingContext2D);
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
		});
		// LassoSelector 不注册到 brushes map（它不是笔刷）
		// ClipMode 直接持有 selector 引用
	}
}
