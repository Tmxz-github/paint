interface LayerOption {
	width: number;
	height: number;
}

export class Layer {
	public visiable: boolean = true;
	public readonly vCanvas: HTMLCanvasElement;
	public readonly vCtx: CanvasRenderingContext2D;
	constructor(option: LayerOption) {
		const { width, height } = option;
		this.vCanvas = document.createElement("canvas");
		this.vCanvas.width = width;
		this.vCanvas.height = height;
		const ctx = this.vCanvas.getContext("2d");
		if (!ctx) {
			throw new Error("CanvasRenderingContext2D 生成失败");
		}
		this.vCtx = ctx;
	}
}
