import { Cursor } from "./Cursor";
import { Layer } from "./Layer";
import { BoundBox, Vec2D, type ZoomOptions, type PaintState } from "./types";
import { KeyListener } from "./Input/key-listener";
import { Line } from "./Line";
import { Pen, Eraser } from "./Brushes";
import { PointerListener } from "./Input/pointer-listener";
import type { Brush, BrushStyle, BurshTypes } from "./Brushes";
import { CircleClamp, Clamp, createMirror, deepClone } from "./Utils";
import { CanvasHistory } from "./CanvasHistory";
import { Lasso } from "./Brushes/Lasso";
import { createCanvasContext } from "./Utils/canvas";

interface PaintOption {
	containerEl: HTMLElement;
	width?: number;
	height?: number;
}

const LASSO_LAYER_INDEX = 0;
const LASSO_RECT_INDEX = 1;

export class Paint {
	public get scaleValue(): number {
		return this._scaleValue;
	}
	public set scaleValue(value: number) {
		value = Clamp(value, this.minScaleValue, this.maxScaleValue);
		this._scaleValue = value;
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
		return this._rotateDegree;
	}
	public set rotateDegree(value) {
		this._rotateRadian = (value * Math.PI) / 180;
		this._rotateDegree = value;
	}

	private containerEl: HTMLElement;
	/** canvas html 元素 */
	private canvasElement: HTMLCanvasElement;
	/** 视窗绘制上下文，只负责最终渲染，所有绘制应先在其余离线 canvas 上绘制后再合并绘制到 viewCtx 上 */
	private viewCtx: CanvasRenderingContext2D;
	/** 同步 currentLayer  */
	private mirrorCtx: CanvasRenderingContext2D;
	/** 绘制历史，只记录笔的绘制 */
	private canvasHistory: CanvasHistory;
	/** 每一笔绘制后的包围盒 */
	private lineBBox: BoundBox = { top: Infinity, bottom: 0, left: Infinity, right: 0 };
	/** 缩放比例 */
	private _scaleValue: number = 1;
	/** 缩放步进 */
	private scaleStep: number = 0.2;
	/** 设置新的缩放比例前，存储的上次缩放比例 */
	private preScaleValue: number = 1;
	/** 光标 */
	private cursor: Cursor;
	/** 画布已经点击 */
	private canvasReady: boolean = false;
	/** 画布开始绘制 */
	private drawing: boolean = false;
	/** 放置画布的画板背景色 */
	private backgroundColor: string = "#f0f0f0";
	/** 画布背景色 */
	private canvacBackgroundColor: string = "#ffffff";
	/** 光标在 viewCtx 对应 canvas 上的坐标 */
	private cursorOffset: Vec2D = new Vec2D();
	/** viewCtx 对应 canvas 偏移量 */
	private canvasOffset: Vec2D = new Vec2D();
	private minScaleValue: number = 0.1;
	private maxScaleValue: number = 64;
	private _rotateDegree = 0;
	private _rotateRadian = 0;
	/**
	 * todo
	 * 页面加载时如果光标在元素内则需要动一下 cursor 才能渲染
	 */
	private cursorIn: boolean = false;
	/** 光标在 canvas 元素上的坐标 */
	private pointerPos: Vec2D = new Vec2D();
	/** 画布准备拖动 */
	private _grabReady: boolean = false;
	/** 画布拖动种 */
	private _grabbing: boolean = false;
	/** 画布拖动开始坐标，每次拖动时都会变化 */
	private grabStartPos: Vec2D = new Vec2D();
	/** 剪切内容拖动开始坐标，每次拖动时都会变化 */
	private clipGrabStartPos: Vec2D = new Vec2D();
	/** 笔刷，类似套索等工具也是笔刷 */
	private brush: Brush;
	/** 同步笔刷 */
	private mirrorBursh: Brush;
	/** 鼠标移动时划过的线，本质是点集合 */
	private readonly line: Line;
	/** 笔刷表 */
	private readonly brushes: Map<BurshTypes, Brush> = new Map();
	private readonly pointerListener: PointerListener;
	private state: PaintState = "DRAW";
	/** 开始修改剪切内容 */
	private clipStarted: boolean = false;
	/** 确认修改的剪切内容 */
	private clipped: boolean = false;
	/** 一些绘制内容不同的图层，例如剪切框、剪切框内容 */
	private backLayers: Layer[] = [];
	/** 剪切框内容以及范围 */
	private clipedArea: {
		boundBox: BoundBox;
		imageData: ImageData;
	} = {
		boundBox: new BoundBox(),
		imageData: new ImageData(1, 1),
	};

	/** 处理键盘绑定 */
	public readonly keyListener: KeyListener;
	public readonly width: number = 512;
	public readonly height: number = 512;
	public readonly layers: Layer[] = [];
	public currentLayer: Layer;

	constructor(option: PaintOption) {
		let { containerEl, width, height } = option;
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

		this.pointerListener = new PointerListener(this.containerEl);
		this.keyListener = new KeyListener(this.containerEl);

		this.viewCtx = this.canvasElement.getContext("2d")!;
		if (!this.viewCtx) {
			throw new Error("bad");
		}
		this.viewCtx.imageSmoothingEnabled = false;

		this.initBackLayers();

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

		this.mirrorBursh = createMirror<typeof this, Brush>(this, ["brush"]);

		this.line = new Line(this.mirrorCtx, this.mirrorBursh);

		this.cursor = new Cursor(this.viewCtx, this.layers);

		this.eventBind();

		this.applyTransform(this._rotateDegree, this._scaleValue, this.canvasOffset);
	}

	private initBrushes() {
		const pen = new Pen(this.mirrorCtx, 2, 2, "black");
		this.brushes.set("PEN", pen);

		const eraser = new Eraser(this.mirrorCtx, 2, 0.5);
		this.brushes.set("ERASER", eraser);

		const lasso = new Lasso(this.backLayers[LASSO_RECT_INDEX].vCtx as CanvasRenderingContext2D);
		this.brushes.set("LASSO", lasso);
	}

	private initBackLayers() {
		const lassoLayer = new Layer({ width: this.width, height: this.height });
		const lassoRectLayer = new Layer({ width: this.width, height: this.height });

		this.backLayers[LASSO_LAYER_INDEX] = lassoLayer;
		this.backLayers[LASSO_RECT_INDEX] = lassoRectLayer;
	}

	private eventBind() {
		this.pointerListener.on("MOVE", ({ e, pos }) => {
			this.pointerPos = pos;
			if (e.movementX === 0 && e.movementY === 0) return;

			this.renderLayers();

			this.cursorRender(this.pointerPos);

			const div = document.querySelector("#pos")!;
			div.innerHTML = `${this.cursor.curPos.x}:::${this.cursor.curPos.y}`;

			if (this.grabbing) {
				this.grabTo(this.pointerPos);
			}
			if (this.canvasReady && this.currentLayer.visiable && !this.grabbing && this.state === "CLIP") {
				this.brush.drawDot(this.cursor.curPos);
				return;
			}
			if (this.canvasReady && this.currentLayer.visiable && !this.grabbing && this.state === "CLIPPING") {
				if (this.inBBox(this.cursor.curPos, (this.brush as Lasso).boundBox)) {
					const boundBox = (this.brush as Lasso).boundBox;
					if (this.clipStarted) {
						this.currentLayer.vCtx.clearRect(
							boundBox.left,
							boundBox.top,
							boundBox.right - boundBox.left,
							boundBox.bottom - boundBox.top
						);
					}
					const offset = Vec2D.Sub(pos, this.clipGrabStartPos);

					offset.x /= this._scaleValue;
					offset.y /= this._scaleValue;

					(this.brush as Lasso).startPoint = Vec2D.Add((this.brush as Lasso).startPoint, offset);

					const lassoCtx = this.backLayers[LASSO_LAYER_INDEX].vCtx;
					lassoCtx.clearRect(
						boundBox.left,
						boundBox.top,
						boundBox.right - boundBox.left,
						boundBox.bottom - boundBox.top
					);
					this.brush.drawDot(Vec2D.Add((this.brush as Lasso).preEndpoint, offset));
					this.grabContent((this.brush as Lasso).boundBox);

					this.clipGrabStartPos = pos;

					this.clipStarted = false;
				}
				return;
			}
			if (this.canvasReady && this.currentLayer.visiable && !this.grabbing) {
				this.lineBBox.left = Math.floor(Math.min(this.lineBBox.left, this.cursor.curPos.x - this.brush.size));
				this.lineBBox.right = Math.ceil(Math.max(this.lineBBox.right, this.cursor.curPos.x + this.brush.size));
				this.lineBBox.top = Math.floor(Math.min(this.lineBBox.top, this.cursor.curPos.y - this.brush.size));
				this.lineBBox.bottom = Math.ceil(Math.max(this.lineBBox.bottom, this.cursor.curPos.y + this.brush.size));
				this.draw(this.cursor.curPos);
				this.drawing = true;
			}
		});
		this.pointerListener.on("DOWN", ({ pos }) => {
			this.canvasReady = true;
			if (this.grabReady) {
				this.grabbing = true;
			}
			this.grabStartPos = pos;
			if (this.state === "CLIP") {
				(this.brush as Lasso).startPoint = deepClone(this.cursor.curPos);
			}
			if (this.state === "CLIPPING") {
				this.clipGrabStartPos = pos;
			}
		});
		this.pointerListener.on("UP", ({ pos }) => {
			this.pointerPos = pos;
			if (this.state === "CLIP") {
				(this.brush as Lasso).drawDot(this.cursor.curPos);
			}
			if (this.state === "CLIPPING") {
				(this.brush as Lasso).drawDot(undefined, false);
			}
			if (this.canvasReady && this.drawing) {
				this.line.endLine();

				this.canvasHistory.commitChange(this.lineBBox, this.currentLayer);

				this.currentLayer.preCtx.putImageData(this.getImageData(), 0, 0);
				/** 每一笔绘制完后重制包围盒 */
				this.lineBBox = {
					top: Infinity,
					left: Infinity,
					bottom: 0,
					right: 0,
				};
			}
			this.canvasReady = false;
			this.drawing = false;
			this.grabbing = false;
			this.renderLayers();
		});
		this.pointerListener.on("LEAVE", ({ pos }) => {
			this.pointerPos = pos;
			this.canvasReady = false;
			this.cursorIn = false;
			this.line.endLine();
			this.renderLayers();
		});
		this.pointerListener.on("ENTER", ({ pos }) => {
			this.pointerPos = pos;
			this.containerEl.focus();
			this.cursorIn = true;
			this.renderLayers();
		});
		this.pointerListener.on("WHEEL", ({ e, pos }) => {
			this.pointerPos = pos;
			(e as WheelEvent).deltaY < 0
				? this.zoomIn({
						scaleStep: this.scaleStep * this._scaleValue,
						center: { x: e.offsetX, y: e.offsetY },
						smooth: true,
				  })
				: this.zoomOut({
						scaleStep: this.scaleStep * this._scaleValue,
						center: { x: e.offsetX, y: e.offsetY },
						smooth: true,
				  });
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
			this.currentLayer.preCtx.putImageData(this.getImageData(), 0, 0);
		});
		this.keyListener.control().on("r:up", () => {
			this.canvasHistory.redo();
			this.renderLayers();
			this.currentLayer.preCtx.putImageData(this.getImageData(), 0, 0);
		});
		this.keyListener.on("w:down", this.zoomIn, this);
		this.keyListener.on("s:down", this.zoomOut, this);
		this.keyListener.on("Enter:up", () => {
			if (this.state === "CLIP") {
				this.state = "CLIPPING";
				this.clipStarted = true;
				const boundBox = (this.brush as Lasso).boundBox;
				this.clipedArea.boundBox = boundBox;
				this.clipedArea.imageData = this.currentLayer.vCtx.getImageData(
					boundBox.left,
					boundBox.top,
					boundBox.right - boundBox.left,
					boundBox.bottom - boundBox.top
				);
				(this.brush as Lasso).setMinBoundBox(this.clipedArea.imageData);
				this.clipedArea.imageData = this.currentLayer.vCtx.getImageData(
					boundBox.left,
					boundBox.top,
					boundBox.right - boundBox.left,
					boundBox.bottom - boundBox.top
				);
			} else if (this.state === "CLIPPING") {
				(this.brush as Lasso).drawDot(undefined, false);
				this.putContent((this.brush as Lasso).boundBox);
				this.canvasHistory.commitChange(this.clipedArea.boundBox, this.currentLayer, (this.brush as Lasso).boundBox);
				this.clipped = true;
				this.state = "CLIP";
			}
		});
	}

	/** 渲染放置画布的画板 */
	private renderBackground() {
		this.viewCtx.save();
		this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
		this.viewCtx.fillStyle = this.backgroundColor;
		this.viewCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
		this.viewCtx.restore();
	}

	/** 光标是否移出画布 */
	private outCanvas(pos: Vec2D) {
		return pos.x > this.canvasElement.width || pos.x < 0 || pos.y > this.canvasElement.height || pos.y < 0;
	}

	private grabContent(boundBox: BoundBox) {
		const lassoCtx = this.backLayers[LASSO_LAYER_INDEX].vCtx;
		const targetPos = { x: boundBox.left, y: boundBox.top };
		lassoCtx.putImageData(this.clipedArea.imageData, targetPos.x, targetPos.y);
	}

	private putContent(boundBox: BoundBox) {
		const targetPos = { x: boundBox.left, y: boundBox.top };
		const tmpContext = createCanvasContext(this.clipedArea.imageData);
		const lassoCtx = this.backLayers[LASSO_LAYER_INDEX].vCtx;
		lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
		this.currentLayer.vCtx.drawImage(tmpContext.canvas, targetPos.x - 0.5, targetPos.y - 0.5);
	}

	private inBBox(pos: Vec2D, boundBox: BoundBox) {
		return pos.x > boundBox.left && pos.x < boundBox.right && pos.y > boundBox.top && pos.y < boundBox.bottom;
	}

	private getImageData(sx?: number, sy?: number, sw?: number, sh?: number, settings?: ImageDataSettings) {
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
	private cursorRender(pos: Vec2D) {
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

	public swtichBursh(type: BurshTypes) {
		if (type === "LASSO") {
			this.state = "CLIP";
			this.clipped = false;
		} else {
			this.backLayers[LASSO_RECT_INDEX].vCtx.clearRect(0, 0, this.width, this.height);
			this.backLayers[LASSO_LAYER_INDEX].vCtx.clearRect(0, 0, this.width, this.height);
			if (!this.clipped) {
				this.putContent(this.clipedArea.boundBox);
			}
			this.state = "DRAW";
			this.renderLayers();
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
			if (layer.visiable) {
				this.viewCtx.drawImage(layer.vCtx.canvas, 0, 0);
			}
		}
		this.viewCtx.drawImage(this.backLayers[LASSO_LAYER_INDEX].vCtx.canvas, 0, 0);
		this.viewCtx.drawImage(this.backLayers[LASSO_RECT_INDEX].vCtx.canvas, 0, 0);
	}

	/** 设置图层信息，目前只设置是否可见 */
	public setLayerInfo(v: boolean, i: number) {
		const layer = this.layers[i];
		if (!layer) return;
		layer.visiable = v;
		this.renderLayers();
	}

	/**
	 * @param pos 光标在 canvas 元素上的坐标
	 */
	public grabTo(pos: Vec2D) {
		const offsetX = pos.x - this.grabStartPos.x;
		const offsetY = pos.y - this.grabStartPos.y;

		const cos = Math.cos(this._rotateRadian);
		const sin = Math.sin(this._rotateRadian);

		const rotatedOffsetX = offsetX * cos - offsetY * sin;
		const rotatedOffsetY = offsetX * sin + offsetY * cos;

		this.canvasOffset.x += rotatedOffsetX;
		this.canvasOffset.y += rotatedOffsetY;

		this.applyTransform(this._rotateDegree, this._scaleValue, this.canvasOffset);
		this.renderLayers();
		this.grabStartPos = pos;
	}

	public rotateTo(degree: number) {
		degree = CircleClamp(degree, -360, 360);
		this._rotateDegree = degree;
		this.applyTransform(this._rotateDegree, this._scaleValue, this.canvasOffset);
		this.renderLayers();
	}

	/**
	 * @param pos 光标在画布上的坐标，由计算得到
	 */
	public draw(pos: Vec2D): void {
		this.line.lineTo(pos);
	}

	public zoomIn(options: ZoomOptions = {}) {
		let { center, scaleStep, smooth } = options;
		if (!center) {
			center = {
				x: this.canvasElement.width / 2,
				y: this.canvasElement.height / 2,
			};
		}
		if (!scaleStep) {
			// === 0
			scaleStep = 0.1;
		}
		if (!smooth) {
			this._scaleValue += scaleStep;
			if (this._scaleValue === this.preScaleValue) {
				return;
			}

			this.zoom(this._scaleValue, Math.abs(this._scaleValue - this.preScaleValue), center);
			return;
		}
		let i = 0;
		const frame = () => {
			if (i >= 10) return;
			this._scaleValue += scaleStep! / 5;
			if (this._scaleValue === this.preScaleValue) {
				return;
			}

			this.zoom(this._scaleValue, Math.abs(this._scaleValue - this.preScaleValue), center);
			i += 1;
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}

	public zoomOut(options: ZoomOptions = {}) {
		let { center, scaleStep, smooth } = options;
		if (!center) {
			center = {
				x: this.canvasElement.width / 2,
				y: this.canvasElement.height / 2,
			};
		}
		if (!scaleStep) {
			// === 0
			scaleStep = 0.1;
		}
		if (!smooth) {
			this._scaleValue -= scaleStep;
			if (this._scaleValue === this.preScaleValue) {
				return;
			}

			this.zoom(this._scaleValue, Math.abs(this._scaleValue - this.preScaleValue), center);
			return;
		}
		let i = 0;
		const frame = () => {
			if (i >= 6) return;
			this._scaleValue -= scaleStep! / 10;
			if (this._scaleValue === this.preScaleValue) {
				return;
			}

			this.zoom(this._scaleValue, Math.abs(this._scaleValue - this.preScaleValue), center);
			i += 1;
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}

	public zoom(scale: number, scaleStep: number = 0.1, center?: Vec2D) {
		if (!center) {
			center = {
				x: this.canvasElement.width / 2,
				y: this.canvasElement.height / 2,
			};
		}
		this.cursorOffset = {
			x: center.x - this.canvasOffset.x,
			y: center.y - this.canvasOffset.y,
		};

		const deltaX = (this.cursorOffset.x / this.preScaleValue) * scaleStep;
		const deltaY = (this.cursorOffset.y / this.preScaleValue) * scaleStep;

		this.canvasOffset.x += scale > this.preScaleValue ? -deltaX : deltaX;
		this.canvasOffset.y += scale > this.preScaleValue ? -deltaY : deltaY;

		this.applyTransform(this._rotateDegree, scale, this.canvasOffset);
		this.preScaleValue = scale;
		this.renderLayers();
		if (!this.cursorIn) return;
		this.cursorRender(this.pointerPos);
	}

	/**
	 *
	 * @param rotate 角度
	 * @param scale 放缩倍率
	 * @param offset 偏移量
	 */
	applyTransform(rotate: number, scale: number, offset: Vec2D) {
		const center = {
			x: this.canvasElement.width / 2,
			y: this.canvasElement.height / 2,
		};
		const rad = (rotate * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);

		const a = scale * cos;
		const b = scale * sin;
		const c = -scale * sin;
		const d = scale * cos;
		const dx = (offset.x - center.x) / scale;
		const dy = (offset.y - center.y) / scale;
		const e = center.x + dx * a + dy * c;
		const f = center.y + dx * b + dy * d;

		this.viewCtx.setTransform(a, b, c, d, e, f);
	}
}
