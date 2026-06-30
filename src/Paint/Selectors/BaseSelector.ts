import type { BoundBox, Vec2D } from "../Types";

/**
 * BaseSelector - 选择器抽象基类
 *
 * 与 BaseBrush 平级的概念，代表画板上的选区/选择工具。
 * 子类需要实现绘制选区区域的方法。
 */
export abstract class BaseSelector {
	protected readonly selectorCtx: CanvasRenderingContext2D;

	constructor(selectorCtx: CanvasRenderingContext2D) {
		this.selectorCtx = selectorCtx;
	}

	/** 绘制选区（点、矩形或多边形） */
	abstract drawSelection(point?: Vec2D, clear?: boolean): void;

	/** 获取当前选区的包围盒 */
	abstract getBoundBox(): BoundBox;

	/** 获取选区起始点 */
	abstract getStartPoint(): Vec2D;

	/** 设置选区起始点 */
	abstract setStartPoint(point: Vec2D): void;
}
