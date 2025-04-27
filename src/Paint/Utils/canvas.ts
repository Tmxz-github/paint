export const createCanvasContext = (
	width: number,
	height: number
): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D => {
	if (OffscreenCanvas) {
		const c = new OffscreenCanvas(width, height);
		const ctx = c.getContext("2d");
		if (!ctx) {
			return createCanvasContext2(width, height);
		} else {
			return ctx;
		}
	} else {
		return createCanvasContext2(width, height);
	}
};

const createCanvasContext2 = (width: number, height: number): CanvasRenderingContext2D => {
	const c = document.createElement("canvas");
	c.width = width;
	c.height = height;
	const ctx = c.getContext("2d");
	if (!ctx) {
		throw new Error("cant get ctx");
	}
	return ctx;
};
