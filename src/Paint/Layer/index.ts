interface LayerOption {
	width: number;
	height: number;
}

export class Layer {
	private preCanvas: HTMLCanvasElement;
	public preCtx: CanvasRenderingContext2D;
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

		this.preCanvas = document.createElement("canvas");
		this.preCanvas.width = this.vCanvas.width;
		this.preCanvas.height = this.vCanvas.height;
		if (!this.preCanvas) {
			throw new Error("bad");
		}
		this.preCtx = this.preCanvas.getContext("2d")!;
	}
}
