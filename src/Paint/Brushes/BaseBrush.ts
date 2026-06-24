import type { Vec2D } from "../../Types";
import { Clamp } from "../Utils";

/**
 * 笔刷抽象基类，提供 size/thickness/color 的共享 getter/setter 实现。
 * 子类只需实现 drawDot 和差异化配置。
 */
export abstract class BaseBrush {
	protected readonly brushCtx: CanvasRenderingContext2D;

	protected _size: number;
	protected _thickness: number;
	protected _color: string;

	protected readonly sizeMin: number = 0.1;
	protected readonly sizeMax: number = 128;

	constructor(brushCtx: CanvasRenderingContext2D, size: number, thickness: number, color: string = "transparent") {
		this.brushCtx = brushCtx;
		this._size = Clamp(size, this.sizeMin, this.sizeMax);
		this._thickness = Clamp(thickness, 0.1, 1);
		this._color = color;
	}

	get size(): number {
		return this._size;
	}

	set size(value: number) {
		value = Clamp(value, this.sizeMin, this.sizeMax);
		this.brushCtx.lineWidth = value;
		this._size = value;
	}

	get thickness(): number {
		return this._thickness;
	}

	/** 0 - 1 */
	set thickness(value: number) {
		value = Clamp(value, 0.1, 1);
		this._thickness = value;
	}

	get color(): string {
		return this._color;
	}

	set color(value: string) {
		this._color = value;
		this.onColorChange(value);
	}

	/** 颜色变更钩子，子类可覆盖以同步更新 canvas 上下文 */
	protected onColorChange(_value: string): void {}

	abstract drawDot(point: Vec2D): void;
}
