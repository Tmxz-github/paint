import { createCanvasContext } from "../Utils/canvas";

interface LayerOption {
	width: number;
	height: number;
}

export class Layer {
	public readonly preCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	public visible: boolean = true;
	public readonly vCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
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
}
