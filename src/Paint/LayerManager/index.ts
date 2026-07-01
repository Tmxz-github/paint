import { Layer } from "../Layer";

/**
 * LayerManager - 图层数据管理
 *
 * 负责图层的增删改查、可见性管理、内容清空。
 */
export class LayerManager {
	readonly layers: Layer[] = [];
	currentLayer: Layer;
	currentLayerIndex: number = 0;

	constructor(width: number, height: number) {
		const initLayer = new Layer({ width, height });
		this.layers.push(initLayer);
		this.currentLayer = initLayer;
		this.currentLayerIndex = 0;
	}

	/** 创建新图层并设为当前层 */
	addNewLayer(width: number, height: number): Layer {
		const newLayer = new Layer({ width, height });
		this.layers.push(newLayer);
		this.currentLayer = newLayer;
		this.currentLayerIndex = this.layers.length - 1;
		return newLayer;
	}

	/** 删除指定索引的图层（至少保留 1 层） */
	deleteLayer(index: number): boolean {
		if (this.layers.length <= 1) return false;
		if (index < 0 || index >= this.layers.length) return false;

		this.layers.splice(index, 1);

		if (this.currentLayerIndex >= this.layers.length) {
			this.currentLayerIndex = this.layers.length - 1;
		} else if (this.currentLayerIndex === index) {
			if (this.currentLayerIndex >= this.layers.length) {
				this.currentLayerIndex = this.layers.length - 1;
			}
		} else if (index < this.currentLayerIndex) {
			this.currentLayerIndex--;
		}

		this.currentLayer = this.layers[this.currentLayerIndex];
		return true;
	}

	/** 设置图层可见性 */
	setLayerInfo(visible: boolean, index: number): void {
		const layer = this.layers[index];
		if (!layer) return;
		layer.visible = visible;
	}

	/** 获取图层信息 */
	getLayerInfo(index: number): { visible: boolean } | null {
		const layer = this.layers[index];
		if (!layer) return null;
		return { visible: layer.visible };
	}

	/** 获取指定索引的图层 */
	getLayer(index: number): Layer | undefined {
		return this.layers[index];
	}

	/** 清空所有图层的画布内容 */
	clearAll(): void {
		for (const layer of this.layers) {
			layer.vCtx.clearRect(0, 0, layer.vCtx.canvas.width, layer.vCtx.canvas.height);
		}
	}

	/** 清空当前图层内容 */
	clearCurrentLayer(): void {
		this.currentLayer.vCtx.clearRect(0, 0, this.currentLayer.vCtx.canvas.width, this.currentLayer.vCtx.canvas.height);
	}

	/** 清空指定索引的图层内容 */
	clearLayer(index: number): void {
		const layer = this.layers[index];
		if (!layer) return;
		layer.vCtx.clearRect(0, 0, layer.vCtx.canvas.width, layer.vCtx.canvas.height);
	}

	/** 重置为初始状态（清空所有层，创建一个新层） */
	resetSettings(width: number, height: number): void {
		this.layers.length = 0;
		const initLayer = new Layer({ width, height });
		this.layers.push(initLayer);
		this.currentLayer = initLayer;
		this.currentLayerIndex = 0;
	}
}
