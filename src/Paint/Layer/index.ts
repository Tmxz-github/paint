import { createCanvasContext } from "../Utils/canvas";

interface LayerOption {
	width: number;
	height: number;
}

export class Layer {
	public readonly preCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	public visiable: boolean = true;
	public readonly vCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	constructor(option: LayerOption) {
		const { width, height } = option;
		this.vCtx = createCanvasContext(width, height);

		this.preCtx = createCanvasContext(width, height);
	}
}
