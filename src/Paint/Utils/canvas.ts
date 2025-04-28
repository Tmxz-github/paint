type Canvas = OffscreenCanvas | HTMLCanvasElement;
type context2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function createCanvasContext(imagedata: ImageData): context2D;
export function createCanvasContext(width: number, height: number): context2D;
export function createCanvasContext(widthOrImageData: number | ImageData, height?: number): context2D {
	let canvas: Canvas;
	let ctx: context2D | null;
	let width = 0;
	if (widthOrImageData instanceof ImageData) {
		width = widthOrImageData.width;
		height = widthOrImageData.height;
	} else if (typeof widthOrImageData === "number" && typeof height === "number") {
		width = widthOrImageData;
	} else {
		throw new Error("wrong args");
	}

	canvas =
		typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : document.createElement("canvas");

	canvas.width = width;
	canvas.height = height;
	ctx = canvas.getContext("2d");

	if (!ctx) {
		throw new Error("cant get ctx");
	}
	if (widthOrImageData instanceof ImageData) {
		ctx.putImageData(widthOrImageData, 0, 0);
	}
	return ctx;
}
