import type { Vec2D } from "../Types";
import type { context2D } from "../Types/canvas";
import { Clamp } from "../Utils";

/**
 * 笔刷基类
 * 
 * 笔刷能根据鼠标轨迹绘制点
 */
export abstract class BaseBrush {
	public readonly name: string;
    protected getBrushCtx: () => context2D;
    protected get brushCtx() {
        return this.getBrushCtx();
    }

	protected _size: number;
	protected _thickness: number;
	protected _color: string;

	protected readonly sizeMin: number = 0.1;
	protected readonly sizeMax: number = 128;

	constructor(getCtx: () => context2D, name: string, size: number, thickness: number, color: string = "transparent") {
        this.getBrushCtx = getCtx;
		this._size = Clamp(size, this.sizeMin, this.sizeMax);
		this._thickness = Clamp(thickness, 0.1, 1);
		this._color = color;
		this.name = name;
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

	protected onColorChange(_value: string): void {}

	abstract drawDot(point: Vec2D): void;
}
