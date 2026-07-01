import type { BaseBrush, BrushStyle } from "../Brushes";

/**
 * BrushManager - 笔刷管理器
 *
 * 持有笔刷注册表和当前笔刷引用，提供笔刷的增删查改操作。
 */
export class BrushManager {
	/** 笔刷注册表 */
	public readonly brushes: Map<string, BaseBrush> = new Map();
	/** 当前笔刷 */
	private _brush: BaseBrush;

	public get brush() {
		return this._brush;
	}

	constructor(initBursh: BaseBrush) {
		this.registerBrush(initBursh);
		this._brush = initBursh;
	}

	registerBrush(brush: BaseBrush) {
		this.brushes.set(brush.name, brush);
	}

	setBursh(type: string) {
		if (!this.brushes.has(type)) {
			console.error("no brush type");
			return;
		}
		this._brush = this.brushes.get(type)!;
	}

	/**
	 * 设置当前笔刷样式
	 */
	setStyle(options: Partial<BrushStyle>): void {
		if (options.color) this.brush.color = options.color;
		if (options.thickness) this.brush.thickness = options.thickness;
		if (options.size) this.brush.size = options.size;
	}

	/**
	 * 获取当前笔刷样式
	 */
	getStyle(): BrushStyle {
		return {
			color: this.brush.color,
			thickness: this.brush.thickness,
			size: this.brush.size,
		};
	}
}
