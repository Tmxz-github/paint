import { BoundBox, ClipedArea, type ZoomOptions, type PaintState, type PaintEvents, type AnyObject } from "./Types";
import { Vec2D } from "./Types/vec2d";
import { KeyListener } from "./Input/key-listener";
import { Line } from "./Line";
import { BrushManager } from "./BrushManager";
import { CursorRenderer } from "./CursorRenderer";
import { PointerListener } from "./Input/pointer-listener";
import { Pen, type BrushStyle, type BrushTypes } from "./Brushes";
import { CanvasHistory } from "./CanvasHistory";
import { BaseMode, type PaintMode } from "./Mode";
import { DrawMode } from "./Mode/drawMode";
import type { PaintPlugin } from "./DefaultPlugins";
import { TransformManager } from "./Transform";
import { LayerManager } from "./LayerManager";
import { RenderPipeline } from "./RenderPipeline";
import { Layer } from "./Layer";
import type { RenderLayerEntry } from "./Types";
import { MouseTrajectory } from "./MouseTrajectory";
import type { context2D } from "./Types/canvas";

export interface PaintOption {
	containerEl: HTMLElement;
	width?: number;
	height?: number;
	use?: PaintPlugin[];
}

export class Paint {
	/** 光标渲染器 */
	public readonly cursorRenderer: CursorRenderer;
	/** 变换管理器 */
	public readonly transform: TransformManager;
	/** 绘制历史，只记录笔的绘制 */
	public readonly canvasHistory: CanvasHistory;
	/** 笔刷管理器 */
	public readonly brushManager: BrushManager;
	/** 鼠标移动时划过的线，本质是点集合 */
	public readonly line: Line;
	/** 鼠标事件监听 */
	public readonly pointerListener: PointerListener;
	/** 处理键盘绑定 */
	public readonly keyListener: KeyListener;
	/** 剪切框内容以及范围 */
	public readonly clipedArea: ClipedArea;
	/** 图层管理器 */
	public readonly layerManager: LayerManager;
	/** 渲染管线 */
	public readonly renderPipeline: RenderPipeline;
	/** 光标离屏渲染层，通过 renderPipeline 合成到 viewCtx */
	public readonly cursorLayer: Layer;
	/** 鼠标轨迹数据（原始点 + 插值后的平滑点），供外部工具读取 */
	public readonly mouseTrajectory: MouseTrajectory;

	public readonly width: number = 512;
	public readonly height: number = 512;

	public get canDraw() {
		return this.canvasReady && this.layerManager.currentLayer.visible && !this.transform.grabbing;
	}
	public plugins: PaintPlugin[] = [];
	public containerEl: HTMLElement;
	/** canvas html 元素 */
	public canvasElement: HTMLCanvasElement;
	/** 视窗绘制上下文，只负责最终渲染，所有绘制应先在其余离线 canvas 上绘制后再合并绘制到 viewCtx 中 */
	public viewCtx: context2D;
	/** 画布已经点击 */
	public canvasReady: boolean = false;
	/** 放置画布的画板背景色 */
	public backgroundColor: string = "#f0f0f0";
	/** 画布背景色 */
	public canvasBackgroundColor: string = "#66ccff";
	public backgroundLayer: Layer;
	public state: PaintState = "DRAW";
	private drawMode: DrawMode = new DrawMode(this);
	private _mode!: PaintMode;
	get mode() {
		return this._mode;
	}
	set mode(newMode) {
		if (newMode === this._mode) {
			return;
		}
		newMode.onEnterMode(undefined);
		this._mode?.onLeaveMode(undefined);
		this._mode = newMode;
	}
	public baseMode: BaseMode;

	constructor(option: PaintOption) {
		let { containerEl, width, height } = option;
		if (option.use) {
			this.plugins = option.use;
		}
		this.containerEl = containerEl;
		this.containerEl.tabIndex = -1;
		this.containerEl.focus();

		if (width) this.width = width;
		if (height) this.height = height;

		this.canvasElement = document.createElement("canvas");
		if (!this.canvasElement) {
			throw new Error("bad");
		}
		containerEl.appendChild(this.canvasElement);
		this.canvasElement.style.cursor = "none";
		this.canvasElement.style.touchAction = "none";
		this.canvasElement.style.backgroundColor = this.backgroundColor;
		this.canvasElement.width = this.width;
		this.canvasElement.height = this.height;
		this.viewCtx = this.canvasElement.getContext("2d")!;
		if (!this.viewCtx) {
			throw new Error("bad");
		}
		this.viewCtx.imageSmoothingEnabled = false;

		this.clipedArea = ClipedArea.Empty;

		this.transform = new TransformManager(this.canvasElement.width, this.canvasElement.height, this.canvasElement);
		this.pointerListener = new PointerListener(this.containerEl);
		this.keyListener = new KeyListener(this.containerEl);
		this.layerManager = new LayerManager(this.canvasElement.width, this.canvasElement.height);
		this.brushManager = new BrushManager(new Pen(this.getCurrentCtx.bind(this), "PEN"));
		this.renderPipeline = new RenderPipeline(
			this.viewCtx,
			this.canvasElement,
			() => this.canvasBackgroundColor,
			() => this.backgroundColor,
			() => this.layerManager.layers,
		);
		this.canvasHistory = new CanvasHistory();
		this.mouseTrajectory = new MouseTrajectory();
		this.line = new Line(
			() => {
				return this.brushManager.brush;
			},
			(rect: BoundBox) => {
				this.layerManager.currentLayer.markDirty(rect);
			},
			this.mouseTrajectory,
		);
		this.backgroundLayer = new Layer({
			width: this.width,
			height: this.height,
		});
		this.backgroundLayer.vCtx.fillStyle = this.canvasBackgroundColor;
		this.backgroundLayer.vCtx.fillRect(0, 0, this.width, this.height);
		const backgroundEntry: RenderLayerEntry = {
			id: "background-layer",
			zIndex: -1,
			layer: this.backgroundLayer,
		};
		this.renderPipeline.registerRenderLayer(backgroundEntry);
		this.cursorLayer = new Layer({
			width: this.width,
			height: this.height,
		});
		this.cursorRenderer = new CursorRenderer(this.viewCtx, this.cursorLayer, this.transform);
		const cursorEntry: RenderLayerEntry = {
			id: "cursor-layer",
			zIndex: 10000,
			layer: this.cursorLayer,
			isUIOverlay: true,
		};
		this.renderPipeline.registerRenderLayer(cursorEntry);
		this.transform.applyTo(this.viewCtx);

		this.baseMode = new BaseMode(this);
		this.baseMode.onEnterMode(undefined);
		this.mode = new DrawMode(this);

		for (const plugin of this.plugins) {
			plugin.apply(this);
			plugin.onInstalled?.();
		}

		this.renderPipeline.renderAll();
	}

	/** 触发画板事件 */
	public emitEvent(name: PaintEvents, data: AnyObject = {}) {
		for (const plugin of this.plugins) {
			plugin.acceptEvent(name, data);
		}
	}

	public switchBrush(type: BrushTypes) {
		this.emitEvent("SWITCH_BRUSH", { type });
		if (type === "PEN") {
			this.state = "DRAW";
			this.renderLayers();
			this.mode = this.drawMode;
		}
		// 笔刷切换后清理脏区，避免旧脏区影响
		this.layerManager.currentLayer.clearDirty();
	}

	public setBrushStyle(options: Partial<BrushStyle>) {
		this.brushManager.setStyle(options);
		this.cursorRenderer.cursor.ridus = this.brushManager.brush.size;
	}

	public getBrushStyle(): BrushStyle {
		return this.brushManager.getStyle();
	}

	public clearView() {
		this.renderPipeline.clearView();
	}

	public clearCurLayer() {
		this.layerManager.clearCurrentLayer();
		this.layerManager.currentLayer.markDirty({
			top: 0,
			left: 0,
			bottom: this.height,
			right: this.width,
		});
		this.renderLayers();
	}

	public clearLayer(i: number) {
		const layer = this.layerManager.getLayer(i);
		if (!layer) return;
		layer.vCtx.clearRect(0, 0, layer.vCtx.canvas.width, layer.vCtx.canvas.height);
		layer.markDirty({
			top: 0,
			left: 0,
			bottom: layer.vCtx.canvas.height,
			right: layer.vCtx.canvas.width,
		});
		this.renderLayers();
	}

	public clearAll() {
		this.layerManager.clearAll();
		this.renderPipeline.clearView();
	}

	public addNewLayer() {
		const newLayer = this.layerManager.addNewLayer(this.canvasElement.width, this.canvasElement.height);
		for (const plugin of this.plugins) {
			plugin.onLayerChange?.(newLayer);
		}
		this.renderLayers();
	}

	public renderLayers() {
		this.renderPipeline.renderLayers();
	}

	public getCurrentCtx(): context2D {
		return this.layerManager.currentLayer.vCtx;
	}

	/** 设置图层信息，目前只设置是否可见 */
	public setLayerInfo(v: boolean, i: number) {
		this.layerManager.setLayerInfo(v, i);
		const layer = this.layerManager.getLayer(i);
		if (layer) {
			layer.markDirty({
				top: 0,
				left: 0,
				bottom: layer.vCtx.canvas.height,
				right: layer.vCtx.canvas.width,
			});
		}
		this.renderLayers();
	}

	/** @param pos 光标在 canvas 元素上的坐标 */
	public grabTo(pos: Vec2D) {
		this.renderLayers();
		this.transform.pan(pos);
		this.transform.grabStartPos = pos;
		this.transform.applyTo(this.viewCtx);
		if (this.cursorRenderer.cursorIn) {
			this.cursorRenderer.render(this.cursorRenderer.pointerPos);
		}
		this.emitEvent("TRANSFORM_CHANGED", {});
		this.renderPipeline.renderAll();
	}

	/**
	 *
	 * @param degree 度数
	 */
	public rotateTo(degree: number) {
		this.transform.rotateTo(degree);
		this.transform.applyTo(this.viewCtx);
		if (this.cursorRenderer.cursorIn) {
			this.cursorRenderer.render(this.cursorRenderer.pointerPos);
		}
		this.emitEvent("TRANSFORM_CHANGED", {});
		this.renderPipeline.renderAll();
	}

	/** @param pos 光标在画布上的坐标，由计算得到 */
	public draw(pos: Vec2D): void {
		this.line.lineTo(pos);
	}

	public zoomIn(options: ZoomOptions = {}) {
		this.transform.zoomIn(options, () => {
			this.transform.applyTo(this.viewCtx);
			if (this.cursorRenderer.cursorIn) {
				this.cursorRenderer.render(this.cursorRenderer.pointerPos);
			}
			this.emitEvent("TRANSFORM_CHANGED", {});
			this.renderPipeline.renderAll();
		});
	}

	public zoomOut(options: ZoomOptions = {}) {
		this.transform.zoomOut(options, () => {
			this.transform.applyTo(this.viewCtx);
			if (this.cursorRenderer.cursorIn) {
				this.cursorRenderer.render(this.cursorRenderer.pointerPos);
			}
			this.emitEvent("TRANSFORM_CHANGED", {});
			this.renderPipeline.renderAll();
		});
	}
}
