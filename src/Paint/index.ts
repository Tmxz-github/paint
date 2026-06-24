import { Cursor } from "./Cursor";
import { Layer } from "./Layer";
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
import { Pen } from "./Brushes";
import { PointerListener } from "./Input/pointer-listener";
import type { BaseBrush, BrushStyle, BrushTypes } from "./Brushes";
import { Clamp, createMirror } from "./Utils";
import { CanvasHistory } from "./CanvasHistory";
import { createCanvasContext } from "./Utils/canvas";
import { BaseMode, type PaintMode } from "./Mode";
import { DrawMode } from "./Mode/drawMode";
import type { PaintPlugin } from "./DefaultPlugins";
import { TransformManager } from "./Transform";
import type { RenderLayerEntry } from "./RenderLayer";

export interface PaintOption {
	containerEl: HTMLElement;
	width?: number;
	height?: number;
	use?: PaintPlugin[];
}

export class Paint {
	public get scaleValue(): number {
		return this.transform.scale;
	}
	public set scaleValue(value: number) {
		this.transform.scale = Clamp(value, this.transform.minScale, this.transform.maxScale);
	}

	public get grabReady(): boolean {
		return this._grabReady;
	}
	public set grabReady(value: boolean) {
		if (value) {
			if (!this.grabbing) {
				this.canvasElement.style.cursor = "grab";
			}
		} else {
			this.canvasElement.style.cursor = "none";
		}
		this._grabReady = value;
	}

	public get grabbing(): boolean {
		return this._grabbing;
	}
	public set grabbing(value: boolean) {
		if (value) {
			this.canvasElement.style.cursor = "grabbing";
		} else {
			if (this.grabReady) {
				this.canvasElement.style.cursor = "grab";
			} else {
				this.canvasElement.style.cursor = "crosshair";
			}
		}
		this._grabbing = value;
	}

	public get rotateDegree() {
		return this.transform.rotation;
	}
	public get canDraw() {
		return this.canvasReady && this.currentLayer.visible && !this.grabbing;
	}

	public plugins: PaintPlugin[] = [];
	public paintPointerEvents!: [Partial<PaintPointerEvent>, Partial<PaintPointerEvent>];

	public containerEl: HTMLElement;
	/** canvas html 元素 */
	public canvasElement: HTMLCanvasElement;
	/** 视窗绘制上下文，只负责最终渲染，所有绘制应先在其余离线 canvas 上绘制后再合并绘制到 viewCtx 上 */
	public viewCtx: CanvasRenderingContext2D;
	/** 同步 currentLayer  */
	public mirrorCtx: CanvasRenderingContext2D;
	/** 绘制历史，只记录笔的绘制 */
	public canvasHistory: CanvasHistory;
	/** 每一笔绘制后的包围盒 */
	public lineBBox: BoundBox = BoundBox.Empty;
	/** 变换管理器 */
	public transform: TransformManager;
	/** 光标 */
	public cursor: Cursor;
	/** 画布已经点击 */
	public canvasReady: boolean = false;
	/** 放置画布的画板背景色 */
	public backgroundColor: string = "#f0f0f0";
	/** 画布背景色 */
	public canvacBackgroundColor: string = "#ffffff";
	/**
	 * todo
	 * 页面加载时如果光标在元素内则需要动一下 cursor 才能渲染
	 */
	public cursorIn: boolean = false;
	/** 光标在 canvas 元素上的坐标 */
	public pointerPos: Vec2D = { x: 0, y: 0 };
	/** 画布准备拖动 */
	public _grabReady: boolean = false;
	/** 画布拖动种 */
	public _grabbing: boolean = false;
	/** 画布拖动开始坐标，每次拖动时都会变化 */
	public grabStartPos: Vec2D = { x: 0, y: 0 };
	/** 剪切内容拖动开始坐标，每次拖动时都会变化 */
	public clipGrabStartPos: Vec2D = { x: 0, y: 0 };
	/** 笔刷，类似套索等工具也是笔刷 */
	public brush: BaseBrush;
	/** 同步笔刷 */
	public mirrorBrush: BaseBrush;
	/** 鼠标移动时划过的线，本质是点集合 */
	public readonly line: Line;
	/** 笔刷表 */
	public readonly brushes: Map<BrushTypes, BaseBrush> = new Map();
	public readonly pointerListener: PointerListener;
	public state: PaintState = "DRAW";
	/** 开始修改剪切内容 */
	public clipStarted: boolean = false;
	/** 确认修改的剪切内容 */
	public clipped: boolean = false;
	/** 画板是否处于光标按下状态 && 当前图层是否可见 && 非拖拽模式 */
	public _canDraw: boolean = true;
	/** 剪切框内容以及范围 */
	public readonly clipedArea: ClipedArea = ClipedArea.Empty;
	public renderLayersRegistry: RenderLayerEntry[] = [];
	public drawMode: DrawMode = new DrawMode(this);
	public mode: PaintMode = this.drawMode;
	public baseMode: BaseMode = new BaseMode(this);

	/** 处理键盘绑定 */
	public readonly keyListener: KeyListener;
	public readonly width: number = 512;
	public readonly height: number = 512;
	public readonly layers: Layer[] = [];
	public currentLayer: Layer;

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
		this.canvasElement.style.backgroundColor = this.canvacBackgroundColor;
		this.canvasElement.width = this.width;
		this.canvasElement.height = this.height;

		this.transform = new TransformManager(this.canvasElement.width, this.canvasElement.height);

		this.pointerListener = new PointerListener(this.containerEl);
		this.keyListener = new KeyListener(this.containerEl);

		this.viewCtx = this.canvasElement.getContext("2d")!;
		if (!this.viewCtx) {
			throw new Error("bad");
		}
		this.viewCtx.imageSmoothingEnabled = false;

		const initLayer = new Layer({
			width: this.canvasElement.width,
			height: this.canvasElement.height,
		});
		this.currentLayer = initLayer;
		this.layers.push(this.currentLayer);

		this.mirrorCtx = createMirror<typeof this, CanvasRenderingContext2D>(this, ["currentLayer", "vCtx"]);

		this.canvasHistory = new CanvasHistory();

		this.initBrushes();
		this.brush = this.brushes.get("PEN")!;

		this.mirrorBrush = createMirror<typeof this, BaseBrush>(this, ["brush"]);

		this.line = new Line(this.mirrorCtx, this.mirrorBrush);

		this.cursor = new Cursor(this.viewCtx);

		this.eventBind();

		this.transform.applyTo(this.viewCtx);

		for (const plugin of this.plugins) {
			plugin.apply(this);
		}
	}

	public initBrushes() {
		const pen = new Pen(this.mirrorCtx, 2, 2, "black");
		this.brushes.set("PEN", pen);
	}

	/** 注册渲染层 */
	public registerRenderLayer(entry: RenderLayerEntry): void {
		this.unregisterRenderLayer(entry.id);
		this.renderLayersRegistry.push(entry);
		this.renderLayersRegistry.sort((a, b) => a.zIndex - b.zIndex);
	}

	/** 按 id 注销渲染层 */
	public unregisterRenderLayer(id: string): void {
		this.renderLayersRegistry = this.renderLayersRegistry.filter((e) => e.id !== id);
	}

	/** 按插件 ID 清理所有渲染层 */
	public unregisterPluginRenderLayers(pluginId: string): void {
		this.renderLayersRegistry = this.renderLayersRegistry.filter((e) => e.pluginId !== pluginId);
	}

	public eventBind() {
		this.pointerListener.on("MOVE", (ev) => {
			if (ev.e.movementX === 0 && ev.e.movementY === 0) return;
			this.mode.onPointerMove(ev);
			this.baseMode.onPointerMove(ev);
		});
		this.pointerListener.on("DOWN", (ev) => {
			this.mode.onPointerDown(ev);
			this.baseMode.onPointerDown(ev);
		});
		this.pointerListener.on("UP", (ev) => {
			this.mode.onPointerUp(ev);
			this.baseMode.onPointerUp(ev);
		});
		this.pointerListener.on("LEAVE", (ev) => {
			this.mode.onPointerLeave(ev);
			this.baseMode.onPointerLeave(ev);
		});
		this.pointerListener.on("ENTER", (ev) => {
			this.mode.onPointerEnter(ev);
			this.baseMode.onPointerEnter(ev);
		});
		this.pointerListener.on("WHEEL", (ev) => {
			this.mode.onWheel(ev);
			this.baseMode.onWheel(ev);
		});

		this.keyListener.on(" :down", () => {
			this.grabReady = true;
		});
		this.keyListener.on(" :up", () => {
			this.grabReady = false;
			this.grabbing = false;
		});
		this.keyListener.control().on("z:up", () => {
			this.canvasHistory.undo();
			this.renderLayers();
		});
		this.keyListener.control().on("r:up", () => {
			this.canvasHistory.redo();
			this.renderLayers();
		});
		this.keyListener.on("w:down", () => this.zoomIn());
		this.keyListener.on("s:down", () => this.zoomOut());
	}

	/** 渲染放置画布的画板 */
	public renderBackground() {
		this.viewCtx.save();
		this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
		this.viewCtx.fillStyle = this.backgroundColor;
		this.viewCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
		this.viewCtx.restore();
	}

	/** 光标是否移出画布 */
	public outCanvas(pos: Vec2D) {
		return pos.x > this.canvasElement.width || pos.x < 0 || pos.y > this.canvasElement.height || pos.y < 0;
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

	/**
	 * 将剪切内容放置（清除指定的 lassoCtx）
	 */
	public putContent(boundBox: BoundBox, lassoCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
		const targetPos = { x: boundBox.left, y: boundBox.top };
		const tmpContext = createCanvasContext(this.clipedArea.imageData);
		lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
		this.currentLayer.vCtx.drawImage(tmpContext.canvas, targetPos.x - 0.5, targetPos.y - 0.5);
	}

	/**
	 * 给定坐标是否在给定包围盒内
	 */
	public inBBox(pos: Vec2D, boundBox: BoundBox) {
		return pos.x > boundBox.left && pos.x < boundBox.right && pos.y > boundBox.top && pos.y < boundBox.bottom;
	}

	/**
	 * 获取canvas的imagedata
	 */
	public getImageData(sx?: number, sy?: number, sw?: number, sh?: number, settings?: ImageDataSettings) {
		if (sx === undefined) sx = 0;
		if (sy === undefined) sy = 0;
		if (sw === undefined) sw = this.canvasElement.width;
		if (sh === undefined) sh = this.canvasElement.height;
		if (settings === undefined) settings = {};
		return this.mirrorCtx.getImageData(sx, sy, sw, sh, settings);
	}

	/**
	 * @param pos 光标在 canvas 元素上的坐标
	 */
	public cursorRender(pos: Vec2D) {
		if (!this.grabReady && !this.grabbing) {
			const t = this.viewCtx.getTransform();
			const inverse = t.inverse();

			const canvasX = inverse.a * pos.x + inverse.c * pos.y + inverse.e;
			const canvasY = inverse.b * pos.x + inverse.d * pos.y + inverse.f;

			this.cursor.render({
				x: canvasX,
				y: canvasY,
			});
		}
	}

	public swtichBrush(type: BrushTypes) {
		this.emitEvent("SWITCH_BURSH", { type });
		if (type === "PEN") {
			this.state = "DRAW";
			this.renderLayers();
			this.mode = this.drawMode;
		}
		this.brush = this.brushes.get(type) || this.brushes.get("PEN")!;
	}

	public setBrushStyle(options: Partial<BrushStyle>) {
		this.brush.color = options.color || this.brush.color;
		this.brush.thickness = options.thickness || this.brush.thickness;
		this.brush.size = options.size || this.brush.size;
		this.cursor.ridus = this.brush.size;
	}

	public getBrushStyle(): BrushStyle {
		return {
			color: this.brush.color,
			thickness: this.brush.thickness,
			size: this.brush.size,
		};
	}

	public clearView() {
		this.viewCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}

	public clearCurLayer() {
		this.currentLayer.vCtx.clearRect(0, 0, this.currentLayer.vCtx.canvas.width, this.currentLayer.vCtx.canvas.height);
		this.renderLayers();
	}

	public clearLayer(i: number) {
		const layer = this.layers[i];
		if (!layer) return;
		layer.vCtx.clearRect(0, 0, layer.vCtx.canvas.width, layer.vCtx.canvas.height);
		this.renderLayers();
	}

	public clearAll() {
		for (const layer of this.layers) {
			layer.vCtx.clearRect(0, 0, layer.vCtx.canvas.width, layer.vCtx.canvas.height);
		}
		this.clearView();
	}

	public addNewLayer() {
		const newLayer = new Layer({
			width: this.canvasElement.width,
			height: this.canvasElement.height,
		});
		this.layers.push(newLayer);

		this.currentLayer = newLayer;
		this.renderLayers();
	}

	public renderLayers() {
		// todo 局部刷新
		this.renderBackground();
		this.clearView();
		for (const layer of this.layers) {
			if (layer.visible) {
				this.viewCtx.drawImage(layer.vCtx.canvas, 0, 0);
			}
		}
		// 渲染所有已注册的插件渲染层（按 zIndex 排序）
		for (const entry of this.renderLayersRegistry) {
			this.viewCtx.drawImage(entry.layer.vCtx.canvas, 0, 0);
		}
	}

	/** 设置图层信息，目前只设置是否可见 */
	public setLayerInfo(v: boolean, i: number) {
		const layer = this.layers[i];
		if (!layer) return;
		layer.visible = v;
		this.renderLayers();
	}

	/**
	 * @param pos 光标在 canvas 元素上的坐标
	 */
	public grabTo(pos: Vec2D) {
		this.renderLayers();
		this.transform.pan(pos, this.grabStartPos);
		this.grabStartPos = pos;
		this.transform.applyTo(this.viewCtx);
		this.renderLayers();
	}

	public rotateTo(degree: number) {
		this.transform.rotateTo(degree);
		this.transform.applyTo(this.viewCtx);
		this.renderLayers();
	}

	/**
	 * @param pos 光标在画布上的坐标，由计算得到
	 */
	public draw(pos: Vec2D): void {
		this.line.lineTo(pos);
	}

	public zoomIn(options: ZoomOptions = {}) {
		this.transform.zoomIn(options, () => {
			this.transform.applyTo(this.viewCtx);
			this.renderLayers();
			if (!this.cursorIn) return;
			this.cursorRender(this.pointerPos);
		});
	}

	public zoomOut(options: ZoomOptions = {}) {
		this.transform.zoomOut(options, () => {
			this.transform.applyTo(this.viewCtx);
			this.renderLayers();
			if (!this.cursorIn) return;
			this.cursorRender(this.pointerPos);
		});
	}
}
