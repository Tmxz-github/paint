import { createCanvasContext } from "../Utils/canvas";
import type { BoundBox } from "../Types";
import { BoundBox as BoundBoxUtil } from "../Types";

interface LayerOption {
	width: number;
	height: number;
}

export class Layer {
	public readonly preCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	public visible: boolean = true;
	public readonly vCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	public dirtyRect: BoundBox | null = null;
	constructor(option: LayerOption) {
		const { width, height } = option;
		this.vCtx = createCanvasContext(width, height);

		this.preCtx = createCanvasContext(width, height);
	}

	/** 将 vCtx 当前像素快照到 preCtx，用于下次 diff 计算 */
	public snapshot(): void {
		const imageData = this.vCtx.getImageData(0, 0, this.vCtx.canvas.width, this.vCtx.canvas.height);
		this.preCtx.putImageData(imageData, 0, 0);
	}

	/** 标记脏区域：如果已有脏区域则合并，否则直接赋值 */
	public markDirty(rect: BoundBox): void {
		if (this.dirtyRect !== null) {
			this.dirtyRect = BoundBoxUtil.merge(this.dirtyRect, rect);
		} else {
			this.dirtyRect = {
				top: rect.top,
				left: rect.left,
				bottom: rect.bottom,
				right: rect.right,
			};
		}
	}

	/** 清除脏区域标记 */
	public clearDirty(): void {
		this.dirtyRect = null;
	}
}
