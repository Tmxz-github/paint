import { Pen } from "../Brushes";
import type { BaseBrush, BrushStyle, BrushTypes } from "../Brushes";

/**
 * BrushManager - 笔刷管理器
 *
 * 持有笔刷注册表和当前笔刷引用，提供笔刷的增删查改操作。
 * 不依赖 Paint 类，通过构造函数注入最小依赖。
 */
export class BrushManager {
	/** 笔刷注册表 */
	public readonly brushes: Map<BrushTypes, BaseBrush> = new Map();
	/** 当前笔刷 */
	public brush: BaseBrush;

	constructor(mirrorCtx: CanvasRenderingContext2D) {
		const pen = new Pen(mirrorCtx, 2, 2, "black");
		this.brushes.set("PEN", pen);
		this.brush = pen;
	}

	/**
	 * 按类型获取笔刷，不存在时返回默认 PEN
	 */
	getBrush(type: BrushTypes): BaseBrush {
		return this.brushes.get(type) || this.brushes.get("PEN")!;
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
