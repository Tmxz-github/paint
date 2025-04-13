import { Cursor } from "./cursor";
import { Layer } from "./layer";
import { Path } from "./path";
import { Vec2d } from "./types";

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
		}
		if (value >= this.maxScaleValue) {
			this._scaleValue = this.maxScaleValue;
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
	private path: Path;
	private canvasReady: boolean = false;
	private backgroundColor: string = "#f0f0f0";
	/** 光标在 viewCtx 对应 canvas 上的坐标 */
	private cursorOffset: Vec2d = new Vec2d();
	/** viewCtx 对应 canvas 偏移量 */
	private canvasOffset: Vec2d = new Vec2d();
	private minScaleValue: number = 0.2;
	private maxScaleValue: number = 16;
	/**
	 * todo
	 * 页面加载时如果光标在元素内则需要动一下 cursor 才能渲染
	 */
	private cursorIn: boolean = false;
	private _grabReady: boolean = false;
	private _grabbing: boolean = false;
	private grabStartPos: Vec2d = new Vec2d();

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
		this.canvasElement.addEventListener(
			"pointerdown",
			this.pointerdownEvent.bind(this)
		);
		this.canvasElement.addEventListener(
			"contextmenu",
			this.contextmenuEvent.bind(this)
		);
		this.canvasElement.addEventListener(
			"pointerleave",
			this.pointerleaveEvent.bind(this)
		);
		this.canvasElement.addEventListener(
			"pointerenter",
			this.pointerenterEvent.bind(this)
		);
		this.canvasElement.addEventListener(
			"pointermove",
			this.pointermoveEvent.bind(this)
		);
		this.canvasElement.addEventListener(
			"pointerup",
			this.pointerupEvent.bind(this)
		);
		this.canvasElement.addEventListener(
			"pointercancel",
			this.pointercancelEvent.bind(this)
		);
		this.canvasElement.addEventListener("wheel", this.wheelEvent.bind(this));
		this.containerEl.addEventListener("keydown", (e) => {
			if (e.code === "Space") {
				this.grabReady = true;
			}
		});
		this.containerEl.addEventListener("keyup", (e) => {
			if (e.code === "Space") {
				this.grabReady = false;
				this.grabbing = false;
			}
		});
	}

	public clearView() {
		this.viewCtx.clearRect(0, 0, this.width, this.height);
	}

	public clearCurLayer() {
		this.currentLayer.vCtx.clearRect(
			0,
			0,
			this.currentLayer.vCanvas.width,
			this.currentLayer.vCanvas.height
		);
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
		this.mirrorCtx.strokeStyle = "black";
		this.mirrorCtx.lineWidth = 2;
		this.renderLayers();
	}

	public renderLayers() {
		this.clearView();
		for (const layer of this.layers) {
			if (layer.visiable) {
				this.viewCtx.drawImage(layer.vCanvas, 0, 0);
			}
		}
	}

	public setLayerInfo(v: boolean, i: number) {
		const layer = this.layers[i];
		if (!layer) return;
		layer.visiable = v;
		this.renderLayers();
	}

	private getImageData(
		sx?: number,
		sy?: number,
		sw?: number,
		sh?: number,
		settings?: ImageDataSettings
	) {
		if (sx === undefined) sx = 0;
		if (sy === undefined) sy = 0;
		if (sw === undefined) sw = this.canvasElement.width;
		if (sh === undefined) sh = this.canvasElement.height;
		if (settings === undefined) settings = {};
		return this.viewCtx.getImageData(sx, sy, sw, sh, settings);
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
		this.cursor.clear();
	}
	private pointerenterEvent(e: HTMLElementEventMap["pointerenter"]) {
		e.preventDefault();
		this.containerEl.focus();
		this.cursorIn = true;
	}
	private pointermoveEvent(e: HTMLElementEventMap["pointermove"]) {
		e.preventDefault();
		if (!this.grabReady && !this.grabbing) {
			this.cursor.render({
				x: (e.offsetX - this.canvasOffset.x) / this.scaleValue,
				y: (e.offsetY - this.canvasOffset.y) / this.scaleValue,
			});
		} else {
			this.cursor.clear();
		}
		// todo
		if (this.grabbing) {
			const offsetX = (e.offsetX - this.grabStartPos.x) / this.scaleValue;
			const offsetY = (e.offsetY - this.grabStartPos.y) / this.scaleValue;
			this.renderBackground();
			this.canvasOffset.x += offsetX;
			this.canvasOffset.y += offsetY;
			this.cursorOffset = {
				x: e.offsetX - this.canvasOffset.x,
				y: e.offsetY - this.canvasOffset.y,
			};
			this.viewCtx.transform(1, 0, 0, 1, offsetX, offsetY);
			this.renderLayers();
			this.grabStartPos = { x: e.offsetX, y: e.offsetY };
			return;
		}
		if (this.canvasReady && this.currentLayer.visiable) {
			if (
				this.cursor.curPos.x > this.width ||
				this.cursor.curPos.x < 0 ||
				this.cursor.curPos.y > this.height ||
				this.cursor.curPos.y < 0
			) {
				this.path.clear();
				return;
			}
			this.path.render(this.cursor.curPos);
		}
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
			? this.zoomIn({ x: e.offsetX, y: e.offsetY })
			: this.zoomOut({ x: e.offsetX, y: e.offsetY });
	}

	zoomIn(center?: Vec2d) {
		if (!center) {
			center = {
				x: this.canvasElement.width / 2,
				y: this.canvasElement.height / 2,
			};
		}

		this.scaleValue += this.scaleStep;
		if (this.scaleValue === this.preScaleValue) return;

		this.zoom(this.scaleValue, center);
	}

	zoomOut(center?: Vec2d) {
		if (!center) {
			center = {
				x: this.canvasElement.width / 2,
				y: this.canvasElement.height / 2,
			};
		}

		this.scaleValue -= this.scaleStep;
		if (this.scaleValue === this.preScaleValue) return;

		this.zoom(this.scaleValue, center);
	}

	zoom(scale: number, center?: Vec2d) {
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

		const deltaX = (this.cursorOffset.x / this.preScaleValue) * this.scaleStep;
		const deltaY = (this.cursorOffset.y / this.preScaleValue) * this.scaleStep;

		this.canvasOffset.x += scale > this.preScaleValue ? -deltaX : deltaX;
		this.canvasOffset.y += scale > this.preScaleValue ? -deltaY : deltaY;

		this.renderBackground();
		this.viewCtx.setTransform(
			scale,
			0,
			0,
			scale,
			this.canvasOffset.x,
			this.canvasOffset.y
		);
		this.preScaleValue = scale;
		this.renderLayers();
		if (!this.cursorIn) return;
		this.cursor.render();
	}

	private renderBackground() {
		this.viewCtx.save();
		this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
		this.viewCtx.fillStyle = this.backgroundColor;
		this.viewCtx.fillRect(0, 0, this.width, this.height);
		this.viewCtx.restore();
	}
}
