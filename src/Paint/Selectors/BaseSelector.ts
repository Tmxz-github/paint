import type { BoundBox, Vec2D } from "../Types";
import type { context2D } from "../Types/canvas";

/**
 * BaseSelector - 选择器抽象基类
 *
 * 选择一个区域
 */
export abstract class BaseSelector {
	protected readonly selectorCtx: context2D;

	constructor(selectorCtx: context2D) {
		this.selectorCtx = selectorCtx;
	}

	/** 绘制选区 */
	abstract drawSelection(points?: Vec2D[], clear?: boolean): void;

	/** 获取当前选区的包围盒 */
	abstract getBoundBox(): BoundBox;
}
