import type { Paint } from "..";
import type { AnyObject, PaintEvents } from "../../Types";
import type { Layer } from "../Layer";
import type { BaseBrush } from "../Brushes";
import type { BoundBox } from "../../Types";

/** 笔刷提交数据，一笔绘制完成后传递给插件 */
export interface BrushCommitData {
	brush: BaseBrush;
	boundBox: BoundBox;
	layer: Layer;
}

/** 渲染上下文，在渲染前后传递给插件 */
export interface RenderContext {
	viewCtx: CanvasRenderingContext2D;
	timestamp: number;
}

export class PaintPlugin {
	name: string = "default";
	readonly events: Map<PaintEvents, Function[]> = new Map();

	public apply(_: Paint) {}

	public acceptEvent(name: PaintEvents, data: AnyObject) {
		if (!this.events.get(name)) return;
		const cbs = this.events.get(name) || [];
		for (const cb of cbs) {
			cb.call(this, data);
		}
	}

	public on(name: PaintEvents, cb: (data: AnyObject) => void) {
		if (!this.events.get(name)) {
			this.events.set(name, []);
		}
		this.events.get(name)?.push(cb);
	}

	// --- 新增生命周期钩子（全部可选，向后兼容） ---

	/** 插件安装完成后调用 */
	public onInstalled?(): void;

	/** 插件卸载前调用 */
	public onUninstall?(): void;

	/** 渲染前调用 */
	public onRenderBefore?(ctx: RenderContext): void;

	/** 渲染后调用 */
	public onRenderAfter?(ctx: RenderContext): void;

	/** 笔刷提交后调用（一笔绘制完成） */
	public onBrushCommit?(data: BrushCommitData): void;

	/** 图层变更时调用 */
	public onLayerChange?(layer: Layer): void;

	/** 提供自定义渲染层（将在 renderLayers 中绘制） */
	public getRenderLayers?(): { id: string; layer: Layer; zIndex: number }[];
}
