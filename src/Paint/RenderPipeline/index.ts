import { Layer } from "../Layer";
import type { RenderLayerEntry } from "../RenderLayer";
import type { PaintPlugin, RenderContext } from "../DefaultPlugins";
import type { BoundBox } from "../Types";

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
		private readonly getLayers: () => Layer[],
		private readonly getPlugins: () => PaintPlugin[],
	) {}

	/** 渲染画板背景 */
	renderBackground(): void {
		this.viewCtx.save();
		this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
		this.viewCtx.fillStyle = this.getBackgroundColor();
		this.viewCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
		this.viewCtx.restore();
	}

	/** 清空视窗 */
	clearView(): void {
		this.viewCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}

	/** 完整渲染管线：渲染前钩子 → 背景 → 清空 → 图层 → 插件层 → 渲染后钩子 */
	renderLayers(): void {
		// 【脏区路径检测】检测所有图层的 dirtyRect，若存在脏区则走局部渲染路径
		const layers = this.getLayers();
		let hasDirty = false;
		let mergedDirty: BoundBox | null = null;
		for (const layer of layers) {
			const dirty = layer.dirtyRect;
			if (dirty !== null) {
				hasDirty = true;
				mergedDirty =
					mergedDirty !== null
						? {
								top: Math.min(mergedDirty.top, dirty.top),
								left: Math.min(mergedDirty.left, dirty.left),
								bottom: Math.max(mergedDirty.bottom, dirty.bottom),
								right: Math.max(mergedDirty.right, dirty.right),
							}
						: { ...dirty };
			}
		}
		if (hasDirty && mergedDirty !== null) {
			// 变换非单位矩阵时回退到全量渲染，避免脏区坐标与变换矩阵不一致
			const transform = this.viewCtx.getTransform();
			const isIdentity =
				transform.a === 1 &&
				transform.b === 0 &&
				transform.c === 0 &&
				transform.d === 1 &&
				transform.e === 0 &&
				transform.f === 0;
			if (!isIdentity) {
				// 非单位变换：清除脏区标记后走全量渲染路径
				for (const layer of layers) {
					if (layer.dirtyRect !== null) {
						layer.clearDirty();
					}
				}
			} else {
				this.renderRange(mergedDirty);
				for (const layer of layers) {
					if (layer.dirtyRect !== null) {
						layer.clearDirty();
					}
				}
				return;
			}
		}

		const renderCtx: RenderContext = {
			viewCtx: this.viewCtx,
			timestamp: Date.now(),
		};

		const plugins = this.getPlugins();
		// 渲染前钩子
		for (const plugin of plugins) {
			plugin.onRenderBefore?.(renderCtx);
		}

		this.renderBackground();
		this.clearView();

		// 绘制所有可见图层
		for (const layer of layers) {
			if (layer.visible) {
				this.viewCtx.drawImage(layer.vCtx.canvas, 0, 0);
			}
		}

		// 渲染所有已注册的插件渲染层（已按 zIndex 排序）
		for (const entry of this.renderLayersRegistry) {
			this.viewCtx.drawImage(entry.layer.vCtx.canvas, 0, 0);
		}

		// 渲染后钩子
		for (const plugin of plugins) {
			plugin.onRenderAfter?.(renderCtx);
		}
	}

	/** 渲染指定范围：只重绘指定矩形区域内的内容 */
	renderRange(rect: BoundBox): void {
		const w = rect.right - rect.left;
		const h = rect.bottom - rect.top;
		if (w <= 0 || h <= 0) return;

		const renderCtx: RenderContext = {
			viewCtx: this.viewCtx,
			timestamp: Date.now(),
		};

		const plugins = this.getPlugins();
		for (const plugin of plugins) {
			plugin.onRenderBefore?.(renderCtx);
		}

		const layers = this.getLayers();

		// 局部渲染：clip 到脏区矩形，填充背景后绘制所有可见图层
		this.viewCtx.save();
		this.viewCtx.beginPath();
		this.viewCtx.rect(rect.left, rect.top, w, h);
		this.viewCtx.clip();

		// 在裁剪区域内填充背景色（替代全量 renderBackground）
		this.viewCtx.fillStyle = this.getBackgroundColor();
		this.viewCtx.fillRect(rect.left, rect.top, w, h);

		for (const layer of layers) {
			if (layer.visible) {
				this.viewCtx.drawImage(layer.vCtx.canvas, rect.left, rect.top, w, h, rect.left, rect.top, w, h);
			}
		}
		for (const entry of this.renderLayersRegistry) {
			this.viewCtx.drawImage(entry.layer.vCtx.canvas, rect.left, rect.top, w, h, rect.left, rect.top, w, h);
		}
		this.viewCtx.restore();

		for (const plugin of plugins) {
			plugin.onRenderAfter?.(renderCtx);
		}
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
	unregisterPluginRenderLayers(pluginId: string): void {
		this.renderLayersRegistry = this.renderLayersRegistry.filter((e) => e.pluginId !== pluginId);
	}
}
