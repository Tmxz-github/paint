import { Layer } from "../Layer";
import type { RenderLayerEntry } from "../Types";
import type { PaintPlugin } from "../DefaultPlugins";
import { BoundBox } from "../Types";

/**
 * RenderPipeline - 渲染管线
 *
 * 负责将所有图层和插件渲染层绘制到 viewCtx。
 * 通过回调函数获取 Paint 的动态数据（plugins、layers、backgroundColor），
 * 避免持有 Paint 实例引用，保持模块独立。
 */
export class RenderPipeline {
	renderLayersRegistry: RenderLayerEntry[] = [];

	constructor(
		private readonly viewCtx: CanvasRenderingContext2D,
		private readonly canvasElement: HTMLCanvasElement,
		private readonly getBackgroundColor: () => string,
		private readonly getBoardColor: () => string,
		private readonly getLayers: () => Layer[],
		private readonly getPlugins: () => PaintPlugin[],
	) {}

	/** 渲染画板背景 */
	renderBackground(): void {
		this.viewCtx.save();
		this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
		this.viewCtx.fillStyle = this.getBoardColor();
		this.viewCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
		this.viewCtx.restore();
	}

	/** 清空视窗 */
	clearView(): void {
		this.viewCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}

	renderLayers(): void {
		const layers = [ ...this.renderLayersRegistry.map((x) => x.layer), ...this.getLayers()];
		let mergedDirty: BoundBox | null = null;
		for (const layer of layers) {
			const dirty = layer.dirtyRect;
			if (dirty !== null) {
				mergedDirty = mergedDirty
					? {
							top: Math.min(mergedDirty.top, dirty.top),
							left: Math.min(mergedDirty.left, dirty.left),
							bottom: Math.max(mergedDirty.bottom, dirty.bottom),
							right: Math.max(mergedDirty.right, dirty.right),
						}
					: { ...dirty };
			}
		}
		if (mergedDirty) {
			this.renderRange(mergedDirty);
			for (const layer of layers) {
				if (layer.dirtyRect !== null) {
					layer.clearDirty();
				}
			}
			return;
		}
		// 无脏区
		return;
	}

	renderAll() {
		const layers = [ ...this.renderLayersRegistry.map((x) => x.layer), ...this.getLayers()];
		this.renderBackground();
		this.viewCtx.fillStyle = this.getBackgroundColor();
		this.viewCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
		// 绘制所有可见图层
		for (const layer of layers) {
			if (layer.visible) {
				this.viewCtx.drawImage(layer.vCtx.canvas, 0, 0);
			}
		}
	}

	/** 渲染指定范围：只重绘指定矩形区域内的内容 */
	renderRange(rect: BoundBox): void {
		this.viewCtx.save();
		rect = {
			top: Math.floor(rect.top),
			bottom: Math.ceil(rect.bottom),
			left: Math.floor(rect.left),
			right: Math.ceil(rect.right),
		};
		const w = rect.right - rect.left;
		const h = rect.bottom - rect.top;
		if (w <= 0 || h <= 0) return;

		this.viewCtx.clearRect(rect.left, rect.top, w, h);

		const layers = [ ...this.renderLayersRegistry.map((x) => x.layer), ...this.getLayers()];
		for (const layer of layers) {
			if (layer.visible) {
				this.viewCtx.drawImage(layer.vCtx.canvas, rect.left, rect.top, w, h, rect.left, rect.top, w, h);
			}
		}
		this.viewCtx.restore();
	}

	/** 用指定变换矩阵绘制单个图层到 viewCtx */
	renderLayerWithTransform(layer: Layer, transform: DOMMatrix): void {
		this.viewCtx.save();
		this.viewCtx.setTransform(transform);
		this.viewCtx.drawImage(layer.vCtx.canvas, 0, 0);
		this.viewCtx.restore();
	}

	/** 注册渲染层（先注销同 id 再注册，按 zIndex 排序） */
	registerRenderLayer(entry: RenderLayerEntry): void {
		this.unregisterRenderLayer(entry.id);
		this.renderLayersRegistry.push(entry);
		this.renderLayersRegistry.sort((a, b) => a.zIndex - b.zIndex);
	}

	/** 按 id 注销渲染层 */
	unregisterRenderLayer(id: string): void {
		this.renderLayersRegistry = this.renderLayersRegistry.filter((e) => e.id !== id);
	}

	/** 按插件 ID 批量注销渲染层 */
	unregisterPluginRenderLayers(id: string): void {
		this.renderLayersRegistry = this.renderLayersRegistry.filter((e) => e.id !== id);
	}
}
