import type { Vec2D } from "../Types/vec2d";
import type { Canvas, context2D } from "../Types/canvas";
import type { BoundBox } from "../Types/boundbox";

/** 传入高宽或者imageData获取canvasContext */
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

/**
 * 将屏幕坐标转换为画布坐标（经过 transform 变换后的坐标）。
 */
export function screenToCanvas(pos: Vec2D, src: DOMMatrix): Vec2D {
	const inv = src.inverse();
	return {
		x: inv.a * pos.x + inv.c * pos.y + inv.e,
		y: inv.b * pos.x + inv.d * pos.y + inv.f,
	};
}

/**
 * 将画布坐标（经过 transform 变换后的坐标）转换为屏幕。
 */
export function canvasToScreen(pos: Vec2D, src: DOMMatrix): Vec2D {
	return {
		x: src.a * pos.x + src.c * pos.y + src.e,
		y: src.b * pos.x + src.d * pos.y + src.f,
	};
}

/**
 * 将画布坐标包围盒转换为屏幕坐标包围盒。
 */
export function canvasBoxToScreen(box: BoundBox, t: DOMMatrix): BoundBox {
	const corners = [
		{ x: box.left, y: box.top },
		{ x: box.right, y: box.top },
		{ x: box.left, y: box.bottom },
		{ x: box.right, y: box.bottom },
	];
	let r: { top: number; left: number; bottom: number; right: number } | null = null;
	for (const p of corners) {
		const sp = canvasToScreen(p, t);
		if (!r) {
			r = { top: sp.y, left: sp.x, bottom: sp.y, right: sp.x };
		} else {
			if (sp.x < r.left) r.left = sp.x;
			if (sp.x > r.right) r.right = sp.x;
			if (sp.y < r.top) r.top = sp.y;
			if (sp.y > r.bottom) r.bottom = sp.y;
		}
	}
	return r!;
}
