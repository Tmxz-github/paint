import { Vec2D } from "../Types/vec2d";
import { CircleClamp, Clamp } from "../Utils";
import type { ZoomOptions } from "../Types";

/**
 * TransformManager - Canvas 变换管理
 *
 * 纯数据+计算类
 * 负责缩放、旋转、平移的状态管理和矩阵计算
 *
 * 缩放采用步数驱动：预计算两个等比数列（wheel 小步进 / keyboard 大步进），
 * 每次缩放按 delta 步进到数列中固定的缩放比例，确保可逆性和一致性
 */
export class TransformManager {
	/** 缩放比例 */
	scale: number = 1;
	/** 旋转角度（度） */
	rotation: number = 0;
	/** 画布偏移量 */
	offset: Vec2D = Vec2D.Zero;
	/** 最小缩放 */
	minScale: number = 0.1;
	/** 最大缩放 */
	maxScale: number = 20;
	/** 拖动开始坐标（屏幕坐标） */
	grabStartPos: Vec2D = Vec2D.Zero;

	/** 键盘缩放等级（大步进 ×1.5） */
	readonly keyboardZoomLevels: number[];
	/** 滚轮缩放等级（小步进 ×1.1） */
	readonly wheelZoomLevels: number[];

	/** 上一帧的缩放值（用于 offset 补偿计算） */
	private preScale: number = 1;
	private readonly _canvasWidth: number;
	private readonly _canvasHeight: number;
	private readonly _canvasElement: HTMLCanvasElement;
	/** 画布准备拖动 */
	private _grabReady: boolean = false;
	/** 画布拖动中 */
	private _grabbing: boolean = false;

	get grabReady(): boolean {
		return this._grabReady;
	}
	set grabReady(value: boolean) {
		if (value) {
			if (!this._grabbing) {
				this._canvasElement.style.cursor = "grab";
			}
		} else {
			this._canvasElement.style.cursor = "none";
		}
		this._grabReady = value;
	}

	get grabbing(): boolean {
		return this._grabbing;
	}
	set grabbing(value: boolean) {
		if (value) {
			this._canvasElement.style.cursor = "grabbing";
		} else {
			if (this._grabReady) {
				this._canvasElement.style.cursor = "grab";
			} else {
				this._canvasElement.style.cursor = "crosshair";
			}
		}
		this._grabbing = value;
	}

	/** 画布宽度 */
	get width(): number {
		return this._canvasWidth;
	}
	/** 画布高度 */
	get height(): number {
		return this._canvasHeight;
	}

	constructor(canvasWidth: number, canvasHeight: number, canvasElement: HTMLCanvasElement) {
		this._canvasWidth = canvasWidth;
		this._canvasHeight = canvasHeight;
		this._canvasElement = canvasElement;
		this.keyboardZoomLevels = this.buildZoomLevels(1.5);
		this.wheelZoomLevels = this.buildZoomLevels(1.1);
	}

	/**
	 * 生成等比缩放数列 [minScale ... 1 ... maxScale]
	 * @param multiplier 相邻等级间的倍数（>1）
	 */
	private buildZoomLevels(multiplier: number): number[] {
		const steps: number[] = [this.minScale];
		const startN = Math.ceil(Math.log(this.minScale) / Math.log(multiplier));
		const endN = Math.floor(Math.log(this.maxScale) / Math.log(multiplier));

		for (let n = startN; n <= endN; n++) {
			const v = Math.pow(multiplier, n);
			// 四舍五入到 6 位小数消除浮点噪声
			const rounded = Math.round(v * 1e6) / 1e6;
			if (rounded >= this.minScale && rounded <= this.maxScale) {
				steps.push(rounded);
			}
		}
		steps.push(this.maxScale);
		return steps;
	}

	/**
	 * 在有序数列中二分查找最接近 target 的索引
	 */
	private findClosestIndex(levels: number[], target: number): number {
		let lo = 0;
		let hi = levels.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (levels[mid] < target) lo = mid + 1;
			else hi = mid;
		}
		if (lo === 0) return 0;
		if (lo >= levels.length) return levels.length - 1;
		return target - levels[lo - 1] < levels[lo] - target ? lo - 1 : lo;
	}

	/**
	 * 应用变换到 canvas 上下文
	 */
	applyTo(ctx: CanvasRenderingContext2D): void {
		const center = {
			x: this._canvasWidth / 2,
			y: this._canvasHeight / 2,
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
	 * 以指定点为中心缩放到指定值
	 * @param scale 目标缩放值
	 * @param center 缩放中心点
	 * @returns 返回 true 表示成功缩放，false 表示已在边界无法继续
	 */
	zoom(scale: number, center?: Vec2D): boolean {
		const oldScale = this.scale;
		this.scale = Clamp(scale, this.minScale, this.maxScale);
		if (this.scale === oldScale) return false;

		const actualStep = Math.abs(this.scale - oldScale);

		if (!center) {
			center = {
				x: this._canvasWidth / 2,
				y: this._canvasHeight / 2,
			};
		}

		const cursorOffset: Vec2D = {
			x: center.x - this.offset.x,
			y: center.y - this.offset.y,
		};

		const deltaX = (cursorOffset.x / this.preScale) * actualStep;
		const deltaY = (cursorOffset.y / this.preScale) * actualStep;

		this.offset.x += this.scale > oldScale ? -deltaX : deltaX;
		this.offset.y += this.scale > oldScale ? -deltaY : deltaY;

		this.preScale = this.scale;
		return true;
	}

	/**
	 * 缩放步进
	 * @param delta 方向 (+1 放大, -1 缩小)
	 * @param options 缩放选项
	 * @param onUpdate 每帧更新后的回调（用于 applyTo + 渲染）
	 *
	 * 在预计算的缩放等级数列中按 delta 步进，确保放大再缩小能精确回到初始值。
	 */
	stepScale(delta: number, options: ZoomOptions = {}, onUpdate?: () => void): void {
		if (this.scale === this.minScale && delta < 0) return;
		if (this.scale === this.maxScale && delta > 0) return;
		const center = options.center ?? {
			x: this._canvasWidth / 2,
			y: this._canvasHeight / 2,
		};
		const smooth = options.smooth ?? false;
		const levels = options.zoomMode === "keyboard" ? this.keyboardZoomLevels : this.wheelZoomLevels;

		const currentIndex = this.findClosestIndex(levels, this.scale);
		const newIndex = Clamp(currentIndex + delta, 0, levels.length - 1);
		const targetScale = levels[newIndex];

		if (!smooth) {
			this.zoom(targetScale, center);
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
			if (!this.zoom(partial, center)) {
				return;
			}
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
	 * @param degree 角度
	 */
	rotateTo(degree: number): void {
		this.rotation = CircleClamp(degree, -360, 360);
	}

	/**
	 * 平移
	 * @param screenPos 当前屏幕坐标
	 */
	pan(screenPos: Vec2D): void {
		const offsetX = screenPos.x - this.grabStartPos.x;
		const offsetY = screenPos.y - this.grabStartPos.y;

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
	 * @param ctx Canvas 上下文
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
