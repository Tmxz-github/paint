import {
	BoundBox,
	ClipedArea,
	type ZoomOptions,
	type PaintState,
	type PaintEvents,
	type AnyObject,
	type PaintPointerEvent,
} from "../Types";
import { Vec2D } from "../Types/vec2d";
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
import type { RenderLayerEntry } from "./RenderLayer";
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
	/** 输入管理器 */
	public readonly inputManager: InputManager;
	public get canDraw() {
		return this.canvasReady && this.layerManager.currentLayer.visible && !this.cursorRenderer.grabbing;
	}
	public plugins: PaintPlugin[] = [];
	public paintPointerEvents!: [Partial<PaintPointerEvent>, Partial<PaintPointerEvent>];
	public containerEl: HTMLElement;
	/** canvas html 元素 */
	public canvasElement: HTMLCanvasElement;
	/** 视窗绘制上下文，只负责最终渲染，所有绘制应先在其余离线 canvas 上绘制后再合并绘制到 viewCtx 中 */
	public viewCtx: CanvasRenderingContext2D;
	/** 同步 currentLayer */
	public mirrorCtx: CanvasRenderingContext2D;
	/** 绘制历史，只记录笔的绘制 */
	public canvasHistory: CanvasHistory;
	/** 每一笔绘制后的包围盒 */
	public lineBBox: BoundBox = BoundBox.Empty;
	/** 变换管理器 */
	public transform: TransformManager;
	/** 画布已经点击 */
	public canvasReady: boolean = false;
	/** 放置画布的画板背景色 */
	public backgroundColor: string = "#f0f0f0";
	/** 画布背景色 */
	public canvasBackgroundColor: string = "#ffffff";
	/** 笔刷管理器 */
	public readonly brushManager: BrushManager;
	/** 同步笔刷 */
	public mirrorBrush: BaseBrush;
	/** 鼠标移动时划过的线，本质是点集合 */
	public readonly line: Line;
	public readonly pointerListener: PointerListener;
	public state: PaintState = "DRAW";
	/** 开始修改剪切内容 */
	public clipStarted: boolean = false;
	/** 确认修改的剪切内容 */
	public clipped: boolean = false;
	/** 剪切框内容以及范围 */
	public readonly clipedArea: ClipedArea = ClipedArea.Empty;
	public drawMode: DrawMode = new DrawMode(this);
	public mode: PaintMode = this.drawMode;
	public baseMode: BaseMode = new BaseMode(this);
	/** 处理键盘绑定 */
	public readonly keyListener: KeyListener;
	public readonly width: number = 512;
	public readonly height: number = 512;
	/** 图层管理器 */
	public layerManager!: LayerManager;
	/** 渲染管线 */
	public renderPipeline: RenderPipeline;

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
		this.inputManager = new InputManager(this.pointerListener, this.keyListener, {
			onModePointerMove: (ev) => this.mode.onPointerMove(ev),
			onModePointerDown: (ev) => this.mode.onPointerDown(ev),
			onModePointerUp: (ev) => this.mode.onPointerUp(ev),
			onModePointerLeave: (ev) => this.mode.onPointerLeave(ev),
			onModePointerEnter: (ev) => this.mode.onPointerEnter(ev),
			onModePointerWheel: (ev) => this.mode.onWheel(ev),
			onBasePointerMove: (ev) => this.baseMode.onPointerMove(ev),
			onBasePointerDown: (ev) => this.baseMode.onPointerDown(ev),
			onBasePointerUp: (ev) => this.baseMode.onPointerUp(ev),
			onBasePointerLeave: (ev) => this.baseMode.onPointerLeave(ev),
			onBasePointerEnter: (ev) => this.baseMode.onPointerEnter(ev),
			onBasePointerWheel: (ev) => this.baseMode.onWheel(ev),
			onGrabReady: (active) => {
				this.cursorRenderer.grabReady = active;
			},
			onGrabbingEnd: () => {
				this.cursorRenderer.grabbing = false;
			},
			onUndo: () => {
				this.canvasHistory.undo();
				this.renderLayers();
			},
			onRedo: () => {
				this.canvasHistory.redo();
				this.renderLayers();
			},
			onZoomIn: () => this.zoomIn({ zoomMode: "keyboard" }),
			onZoomOut: () => this.zoomOut({ zoomMode: "keyboard" }),
		});
		this.transform.applyTo(this.viewCtx);

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
