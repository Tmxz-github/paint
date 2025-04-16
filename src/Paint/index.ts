import { Cursor } from "./cursor";
import { Layer } from "./layer";
import { Path } from "./path";
import { Vec2d } from "./types";
import { KeyBindHandler } from "./keyBind";

interface PaintOption {
	containerEl: HTMLElement;
	width?: number;
	height?: number;
}

export class Paint {
	public get scaleValue(): number {
		return this._scaleValue;
	}
	public set scaleValue(value: number) {
		if (value <= this.minScaleValue) {
			this._scaleValue = this.minScaleValue;
			return;
		}
		if (value >= this.maxScaleValue) {
			this._scaleValue = this.maxScaleValue;
			return;
		}
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
				this.canvasElement.style.cursor = "none";
			}
		}
		this._grabbing = value;
	}

	private containerEl: HTMLElement;
	/** canvas html 元素 */
	private canvasElement: HTMLCanvasElement;
	/** 视窗绘制上下文 */
	private viewCtx: CanvasRenderingContext2D;
	/** 视窗以及当前图层的混合代理上下文  */
	private mirrorCtx: CanvasRenderingContext2D;
	private _scaleValue: number = 1;
	private scaleStep: number = 0.1;
	private preScaleValue: number = 1;
	private cursor: Cursor;
	/** 绘制路径 */
	private path: Path;
	private canvasReady: boolean = false;
	/** 放置画布的画板背景色 */
	private backgroundColor: string = "#f0f0f0";
	/** 画布背景色 */
	private canvacBackgroundColor: string = "#ffffff";
	/** 光标在 viewCtx 对应 canvas 上的坐标 */
	private cursorOffset: Vec2d = new Vec2d();
	/** viewCtx 对应 canvas 偏移量 */
	private canvasOffset: Vec2d = new Vec2d();
	private minScaleValue: number = 0.1;
	private maxScaleValue: number = 64;
	/**
	 * todo
	 * 页面加载时如果光标在元素内则需要动一下 cursor 才能渲染
	 */
	private cursorIn: boolean = false;
	private _grabReady: boolean = false;
	private _grabbing: boolean = false;
	private grabStartPos: Vec2d = new Vec2d();
	private preCursorPos: Vec2d = new Vec2d();
	/** 处理键盘绑定 */
	private keyBindHandler: KeyBindHandler = KeyBindHandler.Instance;

	public currentLayer: Layer;
	public readonly width: number = 512;
	public readonly height: number = 512;
	public readonly layers: Layer[] = [];

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

		this.mirrorCtx = this.createMirroredContext();

		this.path = new Path(this.mirrorCtx);

		this.cursor = new Cursor(this.viewCtx, this.layers);

		this.eventBind();
	}

	/** 在 mirrorCtx 上进行的操作会同时作用与 currentLaye.vCtx 和 viewCtx */
	private createMirroredContext(): CanvasRenderingContext2D {
		const env = this;
		return new Proxy({} as CanvasRenderingContext2D, {
			get(_, prop: keyof CanvasRenderingContext2D) {
				const ctxs = [env.viewCtx, env.currentLayer.vCtx];
				const value = ctxs[0]![prop];
				if (typeof value === "function") {
					return (...args: any[]) => {
						for (const ctx of ctxs) {
							const v = ctx[prop];
							(v as Function).apply(ctx, args);
						}
					};
				} else {
					return value;
				}
			},
			set(_, prop: keyof CanvasRenderingContext2D, value: any) {
				const ctxs = [env.viewCtx, env.currentLayer.vCtx];
				for (const ctx of ctxs) {
					(ctx as any)[prop] = value;
				}
				return true;
			},
		});
	}

	private eventBind() {
		this.canvasElement.addEventListener("pointerdown", this.pointerdownEvent.bind(this));
		this.canvasElement.addEventListener("contextmenu", this.contextmenuEvent.bind(this));
		this.canvasElement.addEventListener("pointerleave", this.pointerleaveEvent.bind(this));
		this.canvasElement.addEventListener("pointerenter", this.pointerenterEvent.bind(this));
		this.canvasElement.addEventListener("pointermove", this.pointermoveEvent.bind(this));
		this.canvasElement.addEventListener("pointerup", this.pointerupEvent.bind(this));
		this.canvasElement.addEventListener("pointercancel", this.pointercancelEvent.bind(this));
		this.canvasElement.addEventListener("wheel", this.wheelEvent.bind(this));
		this.containerEl.addEventListener("keydown", (e) => {
			e.preventDefault();
			this.keyBindHandler.emit(e.ctrlKey, e.altKey, e.shiftKey, e.key + ":down");
		});
		this.containerEl.addEventListener("keyup", (e) => {
			e.preventDefault();
			this.keyBindHandler.emit(e.ctrlKey, e.altKey, e.shiftKey, e.key + ":up");
		});

		this.keyBindHandler.on(" :down", () => {
			this.grabReady = true;
		});
		this.keyBindHandler.on(" :up", () => {
			this.grabReady = false;
			this.grabbing = false;
		});
	}

	private pointerdownEvent(e: HTMLElementEventMap["pointerdown"]) {
		e.preventDefault();
		this.canvasReady = true;
		if (this.grabReady) {
			this.grabbing = true;
		}
		this.grabStartPos = {
			x: e.offsetX,
			y: e.offsetY,
		};
	}
	private pointerupEvent(e: HTMLElementEventMap["pointerup"]) {
		e.preventDefault();
		this.canvasReady = false;
		this.grabbing = false;
		this.path.clear();
	}
	private pointerleaveEvent(e: HTMLElementEventMap["pointerleave"]) {
		e.preventDefault();
		this.canvasReady = false;
		this.cursorIn = false;
		this.path.clear();
		// todo
		this.renderLayers();
	}
	private pointerenterEvent(e: HTMLElementEventMap["pointerenter"]) {
		e.preventDefault();
		this.containerEl.focus();
		this.cursorIn = true;
	}
	private pointermoveEvent(e: HTMLElementEventMap["pointermove"]) {
		e.preventDefault();
		const pointerOffsetPos = {
			x: e.offsetX,
			y: e.offsetY,
		};
		// todo 每次移动都重新绘制图层太过消耗性能
		this.renderLayers();

		this.cursorRender(pointerOffsetPos);
		if (this.grabbing) {
			this.grabTo(pointerOffsetPos);
		}
		if (this.canvasReady && this.currentLayer.visiable && !this.grabbing) {
			this.draw(this.cursor.curPos);
		}
		this.preCursorPos = this.cursor.curPos;
	}
	private pointercancelEvent(e: HTMLElementEventMap["pointercancel"]) {
		e.preventDefault();
	}
	private contextmenuEvent(e: HTMLElementEventMap["contextmenu"]) {
		e.preventDefault();
	}
	private wheelEvent(e: WheelEvent) {
		e.preventDefault();
		e.deltaY < 0
			? this.zoomIn({ x: e.offsetX, y: e.offsetY }, this.scaleStep * this.scaleValue)
			: this.zoomOut({ x: e.offsetX, y: e.offsetY }, this.scaleStep * this.scaleValue);
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
	private outCanvas(pos: Vec2d) {
		return pos.x > this.canvasElement.width || pos.x < 0 || pos.y > this.canvasElement.height || pos.y < 0;
	}

	private getImageData(sx?: number, sy?: number, sw?: number, sh?: number, settings?: ImageDataSettings) {
		if (sx === undefined) sx = 0;
		if (sy === undefined) sy = 0;
		if (sw === undefined) sw = this.canvasElement.width;
		if (sh === undefined) sh = this.canvasElement.height;
		if (settings === undefined) settings = {};
		return this.viewCtx.getImageData(sx, sy, sw, sh, settings);
	}

	public clearView() {
		this.viewCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}

	public clearCurLayer() {
		this.currentLayer.vCtx.clearRect(0, 0, this.currentLayer.vCanvas.width, this.currentLayer.vCanvas.height);
		this.renderLayers();
	}

	public clearLayer(i: number) {
		const layer = this.layers[i];
		if (!layer) return;
		layer.vCtx.clearRect(0, 0, layer.vCanvas.width, layer.vCanvas.height);
		this.renderLayers();
	}

	public clearAll() {
		for (const layer of this.layers) {
			layer.vCtx.clearRect(0, 0, layer.vCanvas.width, layer.vCanvas.height);
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
		this.renderBackground();
		this.clearView();
		for (const layer of this.layers) {
			if (layer.visiable) {
				this.viewCtx.drawImage(layer.vCanvas, 0, 0);
			}
		}
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
	public cursorRender(pos: Vec2d) {
		if (!this.grabReady && !this.grabbing) {
			this.cursor.render({
				x: (pos.x - this.canvasOffset.x) / this.scaleValue,
				y: (pos.y - this.canvasOffset.y) / this.scaleValue,
			});
		} else {
			// todo
			this.renderLayers();
		}
	}

	/**
	 * @param pos 光标在 canvas 元素上的坐标
	 */
	public grabTo(pos: Vec2d) {
		const offsetX = pos.x - this.grabStartPos.x;
		const offsetY = pos.y - this.grabStartPos.y;
		this.canvasOffset.x += offsetX;
		this.canvasOffset.y += offsetY;
		this.viewCtx.setTransform(this.scaleValue, 0, 0, this.scaleValue, this.canvasOffset.x, this.canvasOffset.y);
		this.renderLayers();
		this.grabStartPos = pos;
	}

	/**
	 * @param pos 光标在画布上的坐标，由计算得到
	 */
	public draw(pos: Vec2d): void {
		if (this.outCanvas(this.preCursorPos) && this.outCanvas(pos)) {
			this.path.clear();
			return;
		}
		if (this.outCanvas(this.preCursorPos) && !this.outCanvas(pos)) {
			// 由外到里
			this.path.renderToEdge(this.preCursorPos, pos, true);
			return;
		} else if (!this.outCanvas(this.preCursorPos) && this.outCanvas(pos)) {
			// 由里到外
			this.path.renderToEdge(this.preCursorPos, pos, false);
			return;
		}
		this.path.render(pos);
	}

	public zoomIn(center?: Vec2d, scaleStep: number = 0.1) {
		if (!center) {
			center = {
				x: this.canvasElement.width / 2,
				y: this.canvasElement.height / 2,
			};
		}

		this.scaleValue += scaleStep;
		if (this.scaleValue === this.preScaleValue) return;

		this.zoom(this.scaleValue, scaleStep, center);
	}

	public zoomOut(center?: Vec2d, scaleStep: number = 0.1) {
		if (!center) {
			center = {
				x: this.canvasElement.width / 2,
				y: this.canvasElement.height / 2,
			};
		}

		this.scaleValue -= scaleStep;
		if (this.scaleValue === this.preScaleValue) return;

		this.zoom(this.scaleValue, scaleStep, center);
	}

	public zoom(scale: number, scaleStep: number = 0.1, center?: Vec2d) {
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

		this.viewCtx.setTransform(scale, 0, 0, scale, this.canvasOffset.x, this.canvasOffset.y);
		this.preScaleValue = scale;
		this.renderLayers();
		if (!this.cursorIn) return;
		this.cursor.render();
	}
}
