type Canvas = OffscreenCanvas | HTMLCanvasElement;
type context2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

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

import type { Vec2D } from "../Types/vec2d";
import type { TransformManager } from "../Transform";

/**
 * 将 screenPos（canvas 实例上的鼠标坐标，不受缩放/旋转/平移影响）
 * 转换为画布坐标（经过 transform 变换后的坐标）。
 */
export function screenToCanvas(pos: Vec2D, transform: TransformManager): Vec2D {
	const rad = (transform.rotation * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	const a = transform.scale * cos;
	const b = transform.scale * sin;
	const c = -transform.scale * sin;
	const d = transform.scale * cos;

	const det = a * d - b * c;
	const invA = d / det;
	const invB = -b / det;
	const invC = -c / det;
	const invD = a / det;

	// 计算 e, f（与 TransformManager.applyTo 逻辑一致）
	const centerX = transform.width / 2;
	const centerY = transform.height / 2;
	const dx = (transform.offset.x - centerX) / transform.scale;
	const dy = (transform.offset.y - centerY) / transform.scale;
	const e = centerX + dx * a + dy * c;
	const f = centerY + dx * b + dy * d;

	// 逆变换：canvas = M^(-1) * screen
	const canvasX = invA * (pos.x - e) + invC * (pos.y - f);
	const canvasY = invB * (pos.x - e) + invD * (pos.y - f);

	return { x: canvasX, y: canvasY };
}

/**
 * 将画布坐标转换为 screenPos（canvas 实例上的鼠标坐标）。
 */
export function canvasToScreen(pos: Vec2D, transform: TransformManager): Vec2D {
	const rad = (transform.rotation * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	const a = transform.scale * cos;
	const b = transform.scale * sin;
	const c = -transform.scale * sin;
	const d = transform.scale * cos;

	// 计算 e, f
	const centerX = transform.width / 2;
	const centerY = transform.height / 2;
	const dx = (transform.offset.x - centerX) / transform.scale;
	const dy = (transform.offset.y - centerY) / transform.scale;
	const e = centerX + dx * a + dy * c;
	const f = centerY + dx * b + dy * d;

	// 正变换：screen = M * canvas
	const screenX = a * pos.x + c * pos.y + e;
	const screenY = b * pos.x + d * pos.y + f;

	return { x: screenX, y: screenY };
}
