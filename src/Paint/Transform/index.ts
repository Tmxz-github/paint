import { Vec2D } from "../../Types/vec2d";
import { CircleClamp, Clamp } from "../Utils";
import type { ZoomOptions } from "../../Types";

/**
 * TransformManager - Canvas 变换管理
 *
 * 纯数据+计算类，不依赖 Paint 或 CanvasRenderingContext2D 引用。
 * 负责缩放、旋转、平移的状态管理和矩阵计算。
 */
export class TransformManager {
	/** 缩放比例 */
	scale: number = 1;
	/** 旋转角度（度） */
	rotation: number = 0;
	/** 画布偏移量 */
	offset: Vec2D = { x: 0, y: 0 };

	/** 最小缩放 */
	minScale: number = 0.1;
	/** 最大缩放 */
	maxScale: number = 64;
	/** 缩放步进 */
	scaleStep: number = 0.2;

	/** 上一帧的缩放值（用于 offset 补偿计算） */
	private preScale: number = 1;
	private readonly canvasWidth: number;
	private readonly canvasHeight: number;

	constructor(canvasWidth: number, canvasHeight: number) {
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
	}

	/**
	 * 应用变换到 canvas 上下文
	 */
	applyTo(ctx: CanvasRenderingContext2D): void {
		const center = {
			x: this.canvasWidth / 2,
			y: this.canvasHeight / 2,
		};
		const rad = (this.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);

		const a = this.scale * cos;
		const b = this.scale * sin;
		const c = -this.scale * sin;
		const d = this.scale * cos;
		const dx = (this.offset.x - center.x) / this.scale;
		const dy = (this.offset.y - center.y) / this.scale;
		const e = center.x + dx * a + dy * c;
		const f = center.y + dx * b + dy * d;

		ctx.setTransform(a, b, c, d, e, f);
	}

	/**
	 * 以指定点为中心缩放（仅更新状态，不涉及渲染）
	 * @param scale 目标缩放值
	 * @param scaleStep 缩放步进（用于 offset 补偿计算）
	 * @param center 缩放中心点（屏幕坐标）
	 */
	zoom(scale: number, scaleStep: number = 0.1, center?: Vec2D): void {
		if (!center) {
			center = {
				x: this.canvasWidth / 2,
				y: this.canvasHeight / 2,
			};
		}

		const cursorOffset: Vec2D = {
			x: center.x - this.offset.x,
			y: center.y - this.offset.y,
		};

		const deltaX = (cursorOffset.x / this.preScale) * scaleStep;
		const deltaY = (cursorOffset.y / this.preScale) * scaleStep;

		this.offset.x += scale > this.preScale ? -deltaX : deltaX;
		this.offset.y += scale > this.preScale ? -deltaY : deltaY;

		this.scale = scale;
		this.preScale = scale;
	}

	/**
	 * 缩放步进（支持平滑动画）
	 * @param delta 方向 (+1 放大, -1 缩小)
	 * @param options 缩放选项
	 * @param onUpdate 每帧更新后的回调（用于 applyTo + 渲染）
	 */
	stepScale(delta: number, options: ZoomOptions = {}, onUpdate?: () => void): void {
		const center = options.center ?? {
			x: this.canvasWidth / 2,
			y: this.canvasHeight / 2,
		};
		const stepSize = options.scaleStep ?? 0.1;
		const smooth = options.smooth ?? false;

		const targetScale = Clamp(this.scale + delta * stepSize, this.minScale, this.maxScale);
		if (targetScale === this.preScale) return;

		if (!smooth) {
			this.zoom(targetScale, Math.abs(targetScale - this.preScale), center);
			onUpdate?.();
			return;
		}

		// 平滑动画：统一 10 帧
		const totalFrames = 10;
		const step = (targetScale - this.scale) / totalFrames;
		let frame = 0;

		const animate = () => {
			if (frame >= totalFrames) return;
			const partial = this.scale + step;
			this.zoom(partial, Math.abs(partial - this.preScale), center);
			onUpdate?.();
			frame += 1;
			requestAnimationFrame(animate);
		};
		requestAnimationFrame(animate);
	}

	/** 放大一步 */
	zoomIn(options: ZoomOptions = {}, onUpdate?: () => void): void {
		this.stepScale(1, options, onUpdate);
	}

	/** 缩小一步 */
	zoomOut(options: ZoomOptions = {}, onUpdate?: () => void): void {
		this.stepScale(-1, options, onUpdate);
	}

	/**
	 * 旋转到指定角度
	 * @param degree 角度，使用 CircleClamp 保持在 [-360, 360] 范围
	 */
	rotateTo(degree: number): void {
		this.rotation = CircleClamp(degree, -360, 360);
	}

	/**
	 * 平移（考虑旋转补偿）
	 * @param screenPos 当前屏幕坐标
	 * @param grabStartPos 拖动开始坐标
	 */
	pan(screenPos: Vec2D, grabStartPos: Vec2D): void {
		const offsetX = screenPos.x - grabStartPos.x;
		const offsetY = screenPos.y - grabStartPos.y;

		const rad = (this.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);

		const rotatedOffsetX = offsetX * cos + offsetY * sin;
		const rotatedOffsetY = -offsetX * sin + offsetY * cos;

		this.offset.x += rotatedOffsetX;
		this.offset.y += rotatedOffsetY;
	}

	/**
	 * 屏幕坐标转画布坐标
	 * @param screenPos 屏幕坐标
	 * @param ctx Canvas 上下文（用于获取当前变换矩阵）
	 */
	screenToCanvas(screenPos: Vec2D, ctx: CanvasRenderingContext2D): Vec2D {
		const t = ctx.getTransform();
		const inverse = t.inverse();
		return {
			x: inverse.a * screenPos.x + inverse.c * screenPos.y + inverse.e,
			y: inverse.b * screenPos.x + inverse.d * screenPos.y + inverse.f,
		};
	}
}
