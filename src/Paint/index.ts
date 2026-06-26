import { BoundBox, ClipedArea, type ZoomOptions, type PaintState, type PaintEvents, type AnyObject } from "./Types";
import { Vec2D } from "./Types/vec2d";
import { KeyListener } from "./Input/key-listener";
import { Line } from "./Line";
import { BrushManager } from "./BrushManager";
import { CursorRenderer } from "./CursorRenderer";
import { InputManager } from "./InputManager";
import { PointerListener } from "./Input/pointer-listener";
import type { BaseBrush, BrushStyle, BrushTypes } from "./Brushes";
import { createMirror } from "./Utils";
import { CanvasHistory } from "./CanvasHistory";
import { createCanvasContext } from "./Utils/canvas";
import { BaseMode, type PaintMode } from "./Mode";
import { DrawMode } from "./Mode/drawMode";
import type { PaintPlugin } from "./DefaultPlugins";
import { TransformManager } from "./Transform";
import { LayerManager } from "./LayerManager";
import { RenderPipeline } from "./RenderPipeline";

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
	public readonly layerManager!: LayerManager;
	/** 渲染管线 */
	public readonly renderPipeline: RenderPipeline;
	/** 同步笔刷 */
	public readonly mirrorBrush: BaseBrush;
	/** 同步 currentLayer */
	public readonly mirrorCtx: CanvasRenderingContext2D;

	public readonly width: number = 512;
	public readonly height: number = 512;

	public get canDraw() {
		return this.canvasReady && this.layerManager.currentLayer.visible && !this.cursorRenderer.grabbing;
	}
	public plugins: PaintPlugin[] = [];
	public containerEl: HTMLElement;
	/** canvas html 元素 */
	public canvasElement: HTMLCanvasElement;
	/** 视窗绘制上下文，只负责最终渲染，所有绘制应先在其余离线 canvas 上绘制后再合并绘制到 viewCtx 中 */
	public viewCtx: CanvasRenderingContext2D;
	/** 画布已经点击 */
	public canvasReady: boolean = false;
	/** 放置画布的画板背景色 */
	public backgroundColor: string = "#f0f0f0";
	/** 画布背景色 */
	public canvasBackgroundColor: string = "#66ccff";
	public state: PaintState = "DRAW";
	private drawMode: DrawMode = new DrawMode(this);
	private _mode: PaintMode = this.drawMode;
	get mode() {
		return this._mode;
	}
	set mode(newMode) {
		newMode.onEnterMode(undefined);
		this._mode.onLeaveMode(undefined);
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
		this.canvasElement.style.backgroundColor = this.canvasBackgroundColor;
		this.canvasElement.width = this.width;
		this.canvasElement.height = this.height;
		this.viewCtx = this.canvasElement.getContext("2d")!;
		if (!this.viewCtx) {
			throw new Error("bad");
		}
		this.viewCtx.imageSmoothingEnabled = false;

		this.clipedArea = ClipedArea.Empty;

		this.transform = new TransformManager(this.canvasElement.width, this.canvasElement.height);
		this.pointerListener = new PointerListener(this.containerEl);
		this.keyListener = new KeyListener(this.containerEl);
		this.layerManager = new LayerManager(this.canvasElement.width, this.canvasElement.height);
		this.mirrorCtx = createMirror<typeof this, CanvasRenderingContext2D>(this, [
			"layerManager",
			"currentLayer",
			"vCtx",
		]);
		this.brushManager = new BrushManager(this.mirrorCtx);
		this.renderPipeline = new RenderPipeline(
			this.viewCtx,
			this.canvasElement,
			() => this.backgroundColor,
			() => this.layerManager.layers,
			() => this.plugins,
		);
		this.canvasHistory = new CanvasHistory();
		this.mirrorBrush = createMirror<typeof this, BaseBrush>(this, ["brushManager", "brush"]);
		this.line = new Line(this.mirrorCtx, this.mirrorBrush);
		this.cursorRenderer = new CursorRenderer(this.viewCtx, this.canvasElement);
		this.transform.applyTo(this.viewCtx);

		this.baseMode = new BaseMode(this);
		this.baseMode.onEnterMode(undefined);
		this.mode = new DrawMode(this);

		for (const plugin of this.plugins) {
			plugin.apply(this);
			plugin.onInstalled?.();
		}
	}

	/** 触发画板事件 */
	public emitEvent(name: PaintEvents, data: AnyObject = {}) {
		for (const plugin of this.plugins) {
			plugin.acceptEvent(name, data);
		}
	}

	/** 拖动剪切区域（渲染到指定的 lassoCtx） */
	public grabContent(boundBox: BoundBox, lassoCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
		const targetPos = { x: boundBox.left, y: boundBox.top };
		lassoCtx.putImageData(this.clipedArea.imageData, targetPos.x, targetPos.y);
	}

	/** 将剪切内容放置（清除指定的 lassoCtx） */
	public putContent(boundBox: BoundBox, lassoCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
		const targetPos = { x: boundBox.left, y: boundBox.top };
		const tmpContext = createCanvasContext(this.clipedArea.imageData);
		lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
		this.layerManager.currentLayer.vCtx.drawImage(tmpContext.canvas, targetPos.x - 0.5, targetPos.y - 0.5);
	}

	/** 获取 canvas 的 imageData */
	public getImageData(sx?: number, sy?: number, sw?: number, sh?: number, settings?: ImageDataSettings) {
		if (sx === undefined) sx = 0;
		if (sy === undefined) sy = 0;
		if (sw === undefined) sw = this.canvasElement.width;
		if (sh === undefined) sh = this.canvasElement.height;
		if (settings === undefined) settings = {};
		return this.mirrorCtx.getImageData(sx, sy, sw, sh, settings);
	}

	public switchBrush(type: BrushTypes) {
		this.emitEvent("SWITCH_BRUSH", { type });
		if (type === "PEN") {
			this.state = "DRAW";
			this.renderLayers();
			this.mode = this.drawMode;
		}
		this.brushManager.brush = this.brushManager.getBrush(type);
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
		this.renderLayers();
	}

	public clearLayer(i: number) {
		const layer = this.layerManager.getLayer(i);
		if (!layer) return;
		layer.vCtx.clearRect(0, 0, layer.vCtx.canvas.width, layer.vCtx.canvas.height);
		this.renderLayers();
	}

	public clearAll() {
		this.layerManager.clearAll();
		this.renderPipeline.clearView();
	}

	public addNewLayer() {
		const newLayer = this.layerManager.addNewLayer(this.canvasElement.width, this.canvasElement.height);
		// 图层变更钩子
		for (const plugin of this.plugins) {
			plugin.onLayerChange?.(newLayer);
		}
		this.renderLayers();
	}

	public renderLayers() {
		this.renderPipeline.renderLayers();
	}

	/** 设置图层信息，目前只设置是否可见 */
	public setLayerInfo(v: boolean, i: number) {
		this.layerManager.setLayerInfo(v, i);
		this.renderLayers();
	}

	/** @param pos 光标在 canvas 元素上的坐标 */
	public grabTo(pos: Vec2D) {
		this.renderLayers();
		this.transform.pan(pos, this.cursorRenderer.grabStartPos);
		this.cursorRenderer.grabStartPos = pos;
		this.transform.applyTo(this.viewCtx);
		this.renderLayers();
	}

	public rotateTo(degree: number) {
		this.transform.rotateTo(degree);
		this.transform.applyTo(this.viewCtx);
		this.renderLayers();
	}

	/** @param pos 光标在画布上的坐标，由计算得到 */
	public draw(pos: Vec2D): void {
		this.line.lineTo(pos);
	}

	public zoomIn(options: ZoomOptions = {}) {
		this.transform.zoomIn(options, () => {
			this.transform.applyTo(this.viewCtx);
			this.renderLayers();
			if (!this.cursorRenderer.cursorIn) return;
			this.cursorRenderer.render(this.cursorRenderer.pointerPos);
		});
	}

	public zoomOut(options: ZoomOptions = {}) {
		this.transform.zoomOut(options, () => {
			this.transform.applyTo(this.viewCtx);
			this.renderLayers();
			if (!this.cursorRenderer.cursorIn) return;
			this.cursorRenderer.render(this.cursorRenderer.pointerPos);
		});
	}
}
