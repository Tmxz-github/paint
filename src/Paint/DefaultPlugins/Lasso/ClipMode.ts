import { PaintMode } from "../../Mode";
import type { Paint } from "../..";
import { LassoSelector } from "./LassoSelector";
import type { MyPointerEvent } from "../../Input/pointer-listener";
import { Vec2D } from "../../Types/vec2d";
import { deepClone, inBBox } from "../../Utils";
import { Layer } from "../../Layer";
import { BoundBox, ClipedArea } from "../../Types";

export class ClipMode extends PaintMode {
	/** 开始修改剪切内容 */
	private clipStarted: boolean = false;
	/** 剪切框内容以及范围 */
	private readonly clipedArea: ClipedArea = ClipedArea.Empty;
	/** 已经确认修改的剪切内容 */
	private clipped: boolean = false;
	/** 剪切内容拖动开始坐标，每次拖动时都会变化 */
	private clipGrabStartPos: Vec2D = Vec2D.Zero;

	constructor(
		private ctx: Paint,
		private lassoLayer: Layer,
		private lassoRectLayer: Layer,
		private selector: LassoSelector,
	) {
		super();
	}

	onEnterMode(_data: any): void {
		if (this.ctx.state === "CLIP") return;
		this.ctx.state = "CLIP";
		this.clipped = false;
		this.ctx.pointerListener.on("MOVE", this.onPointerMove, this);
		this.ctx.pointerListener.on("DOWN", this.onPointerDown, this);
		this.ctx.pointerListener.on("UP", this.onPointerUp, this);
		this.ctx.keyListener.on("Enter:down", this.onEnterDown, [this.ctx], this);
	}

	onLeaveMode(_data: any): void {
		this.offClip();
		this.ctx.pointerListener.off("MOVE", this.onPointerMove);
		this.ctx.pointerListener.off("DOWN", this.onPointerDown);
		this.ctx.pointerListener.off("UP", this.onPointerUp);
		this.ctx.keyListener.off("Enter:down", this.onEnterDown);
	}

	private onPointerMove({ pos }: MyPointerEvent) {
		if (this.ctx.canDraw && this.ctx.state === "CLIP") {
			const oldBox = this.selector.boundBox;

			this.selector.drawSelection(this.ctx.cursorRenderer.canvasPos);

			const mergedBox = BoundBox.inflate(
				BoundBox.merge(
					oldBox,
					this.selector.boundBox
				),
				2,
			);
			this.lassoRectLayer.markDirty(mergedBox);
			return;
		}
		if (this.ctx.state !== "CLIPPING" || !this.ctx.canDraw) {
			return;
		}

		const currentBox = this.selector.boundBox;
		const inBox = inBBox(this.ctx.cursorRenderer.canvasPos, currentBox);
		if (!inBox) {
			return;
		}

		if (this.clipStarted) {
			// 清除当前图层上原剪切区域的内容
			this.ctx.layerManager.currentLayer.vCtx.clearRect(
				currentBox.left,
				currentBox.top,
				currentBox.right - currentBox.left,
				currentBox.bottom - currentBox.top,
			);
			this.ctx.layerManager.currentLayer.markDirty(currentBox);
		}

		// 计算拖拽偏移量
		const t = this.ctx.viewCtx.getTransform();
		const inverse = t.inverse();
		const rawOffset = Vec2D.Sub(pos, this.clipGrabStartPos);
		// 通过逆变换将屏幕像素偏移转换为画布坐标偏移
		const offset: Vec2D = {
			x: inverse.a * rawOffset.x + inverse.c * rawOffset.y,
			y: inverse.b * rawOffset.x + inverse.d * rawOffset.y,
		};

		// 保存偏移前的包围盒用于脏区合并
		const oldBox = currentBox;

		this.selector.startPoint = Vec2D.Add(this.selector.startPoint, offset);

		// 清除 lassoLayer 上旧位置的内容
		const lassoCtx = this.lassoLayer.vCtx;
		lassoCtx.clearRect(oldBox.left, oldBox.top, oldBox.right - oldBox.left, oldBox.bottom - oldBox.top);

		// 在新的偏移位置绘制选区（clear=true 清空 lassoRectLayer 全画布）
		this.selector.drawSelection(Vec2D.Add(this.selector.preEndpoint, offset));

		// 将剪切内容放置到新的位置
		this.grabContent(this.selector.boundBox);

		const mergedRectBox = BoundBox.inflate(
			BoundBox.merge(
				oldBox,
				{
					top: this.selector.boundBox.top,
					left: this.selector.boundBox.left,
					bottom: this.selector.boundBox.bottom,
					right: this.selector.boundBox.right,
				},
			),
			2,
		);
		this.lassoRectLayer.markDirty(mergedRectBox);

		const mergedContentBox = BoundBox.inflate(
			BoundBox.merge(
				{ top: oldBox.top, left: oldBox.left, bottom: oldBox.bottom, right: oldBox.right },
				{
					top: this.selector.boundBox.top,
					left: this.selector.boundBox.left,
					bottom: this.selector.boundBox.bottom,
					right: this.selector.boundBox.right,
				},
			),
			2,
		);
		this.lassoLayer.markDirty(mergedContentBox);

		this.clipGrabStartPos = pos;
		this.clipStarted = false;

		// 立即触发渲染，消除一帧延迟导致的残影
		this.ctx.renderLayers();
	}

	private onPointerDown({ pos }: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			this.selector.startPoint = deepClone(this.ctx.cursorRenderer.canvasPos);
		}
		if (this.ctx.state === "CLIPPING") {
			this.clipGrabStartPos = pos;
		}
	}

	private onPointerUp(_ev: MyPointerEvent) {
		if (this.ctx.state === "CLIP") {
			this.selector.drawSelection(this.ctx.cursorRenderer.canvasPos);
		}
		if (this.ctx.state === "CLIPPING") {
			this.selector.drawSelection(undefined, false);
		}
	}

	private onEnterDown() {
		if (this.ctx.state === "CLIP") {
			this.ctx.state = "CLIPPING";
			this.clipStarted = true;
			// 保存原始 boundBox（setMinBoundBox 会修改 selector.boundBox 的引用值）
			const origLeft = this.selector.boundBox.left;
			const origTop = this.selector.boundBox.top;
			const origRight = this.selector.boundBox.right;
			const origBottom = this.selector.boundBox.bottom;

			this.clipedArea.imageData = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				origLeft,
				origTop,
				origRight - origLeft,
				origBottom - origTop,
			);
			this.clipedArea.boundBox = this.selector.boundBox;
			this.clipedArea.imageData = this.ctx.layerManager.currentLayer.vCtx.getImageData(
				this.selector.boundBox.left,
				this.selector.boundBox.top,
				this.selector.boundBox.right - this.selector.boundBox.left,
				this.selector.boundBox.bottom - this.selector.boundBox.top,
			);

			// 清除选框层（用户已确认选区，选框不应继续显示）
			this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
			this.selector.setMinBoundBox(this.clipedArea.imageData);
			this.lassoRectLayer.markDirty({
				top: 0,
				left: 0,
				bottom: this.ctx.height,
				right: this.ctx.width,
			});
		} else if (this.ctx.state === "CLIPPING") {
			this.clipStarted = false;

			// 清除选框层
			this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
			this.lassoRectLayer.markDirty({
				top: 0,
				left: 0,
				bottom: this.ctx.height,
				right: this.ctx.width,
			});

			// 清除内容预览层
			const boundBox = this.selector.boundBox;
			const lassoCtx = this.lassoLayer.vCtx;
			lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
			this.lassoLayer.markDirty(boundBox);

			this.putContent(boundBox);
			this.ctx.canvasHistory.commitChange(
				this.clipedArea.boundBox,
				this.ctx.layerManager.currentLayer,
				this.selector.boundBox,
			);
			this.clipped = true;
			this.ctx.state = "CLIP";
		}
	}

	private offClip() {
		const fullDirty = { top: 0, left: 0, bottom: this.ctx.height, right: this.ctx.width };
		this.lassoRectLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoRectLayer.markDirty(fullDirty);
		this.lassoLayer.vCtx.clearRect(0, 0, this.ctx.width, this.ctx.height);
		this.lassoLayer.markDirty(fullDirty);
		if (!this.clipped) {
			this.putContent(this.clipedArea.boundBox);
		}
	}

	/** 拖动剪切区域 */
	private grabContent(boundBox: BoundBox) {
		const targetPos = { x: Math.round(boundBox.left), y: Math.round(boundBox.top) };
		this.lassoLayer.vCtx.putImageData(this.clipedArea.imageData, targetPos.x, targetPos.y);
	}

	/** 将剪切内容放置到目标图层的指定位置 */
	private putContent(boundBox: BoundBox) {
		const targetPos = { x: Math.round(boundBox.left), y: Math.round(boundBox.top) };
		this.ctx.layerManager.currentLayer.vCtx.putImageData(this.clipedArea.imageData, targetPos.x, targetPos.y);
	}
}
