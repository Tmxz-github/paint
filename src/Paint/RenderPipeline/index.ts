import { Layer } from "../Layer";
import type { RenderLayerEntry } from "../Types";
import { BoundBox } from "../Types";
import type { context2D } from "../Types/canvas";

/**
 * RenderPipeline - 渲染管线
 *
 * 两层渲染架构：
 *   Phase 1 — 画布层 content layers（用户图层 + content overlay），受 viewCtx transform 影响
 *   Phase 2 — UI 覆盖层 UI overlays（cursor、lasso 选框等），在 identity transform 下绘制
 *
 * UI overlays 的 dirty rect 使用**屏幕坐标**（像素），与画布 transform 无关。
 *
 * Phase 2 在合成 overlay 之前会先恢复该区域的 content 层（通过 renderCanvasRange），
 * 避免 overlay 的 dirty 清除操作破坏 content 层像素。
 */
export class RenderPipeline {
	renderLayersRegistry: RenderLayerEntry[] = [];

	constructor(
		private readonly viewCtx: context2D,
		private readonly canvasElement: HTMLCanvasElement,
		private readonly getBackgroundColor: () => string,
		private readonly getBoardColor: () => string,
		private readonly getLayers: () => Layer[],
	) {}

	// ─── 辅助 ──────────────────────────────────────────

	/** 获取所有已排序的图层条目 */
	private getEntries() {
		return [...this.renderLayersRegistry].sort((a, b) => a.zIndex - b.zIndex);
	}

	/** 获取 content 层（用户图层 + content overlays） */
	private getContentLayers(): Layer[] {
		const userLayers = this.getLayers();
		const contentOverlays = this.getEntries()
			.filter((e) => !e.isUIOverlay)
			.map((e) => e.layer);
		return [...contentOverlays, ...userLayers];
	}

	/** 获取 UI overlay 条目 */
	private getUIOverlayEntries() {
		return this.getEntries().filter((e) => e.isUIOverlay);
	}

	// ─── 画板背景 ─────────────────────────────────────

	renderBackground(): void {
		this.viewCtx.save();
		this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
		this.viewCtx.fillStyle = this.getBoardColor();
		this.viewCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
		this.viewCtx.restore();
	}

	clearView(): void {
		this.viewCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}

	// ─── 脏区合成 ─────────────────────────────────────

	renderLayers(): void {
		// Phase 1：合并 content 层的 dirty rect（画布坐标），批量渲染
		const contentLayers = this.getContentLayers();
		let mergedDirty: BoundBox | null = null;
		for (const layer of contentLayers) {
			const dirty = layer.dirtyRect;
			if (dirty !== null) {
				mergedDirty = mergedDirty
					? {
							top: Math.min(mergedDirty.top, dirty.top),
							left: Math.min(mergedDirty.left, dirty.left),
							bottom: Math.max(mergedDirty.bottom, dirty.bottom),
							right: Math.max(mergedDirty.right, dirty.right),
						}
					: { ...dirty };
			}
		}
		if (mergedDirty) {
			this.renderCanvasRange(mergedDirty);
			for (const layer of contentLayers) {
				if (layer.dirtyRect !== null) layer.clearDirty();
			}
		}

		// Phase 2：合并所有 UI overlay 的 dirty rect → 一次性恢复 content → 批量绘制 overlay
		const uiEntries = this.getUIOverlayEntries();
		let mergedUI: BoundBox | null = null;
		for (const entry of uiEntries) {
			const dirty = entry.layer.dirtyRect;
			if (dirty !== null) {
				mergedUI = mergedUI
					? {
							top: Math.min(mergedUI.top, dirty.top),
							left: Math.min(mergedUI.left, dirty.left),
							bottom: Math.max(mergedUI.bottom, dirty.bottom),
							right: Math.max(mergedUI.right, dirty.right),
						}
					: { ...dirty };
			}
		}
		if (mergedUI) {
			// 将屏幕 dirty rect 四角逆变换到画布坐标 → 恢复 content
			const t = this.viewCtx.getTransform();
			const inv = t.inverse();
			const corners = [
				{ x: mergedUI.left, y: mergedUI.top },
				{ x: mergedUI.right, y: mergedUI.top },
				{ x: mergedUI.left, y: mergedUI.bottom },
				{ x: mergedUI.right, y: mergedUI.bottom },
			];
			let canvasBox: BoundBox | null = null;
			for (const p of corners) {
				const cx = inv.a * p.x + inv.c * p.y + inv.e;
				const cy = inv.b * p.x + inv.d * p.y + inv.f;
				if (!canvasBox) canvasBox = { top: cy, left: cx, bottom: cy, right: cx };
				else {
					if (cx < canvasBox.left) canvasBox.left = cx;
					if (cx > canvasBox.right) canvasBox.right = cx;
					if (cy < canvasBox.top) canvasBox.top = cy;
					if (cy > canvasBox.bottom) canvasBox.bottom = cy;
				}
			}
			this.renderCanvasRange(canvasBox!);

			// identity clip → 按 z-order 绘制所有 visible UI overlay
			const sw = mergedUI.right - mergedUI.left;
			const sh = mergedUI.bottom - mergedUI.top;
			if (sw > 0 && sh > 0) {
				this.viewCtx.save();
				this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
				this.viewCtx.beginPath();
				this.viewCtx.rect(mergedUI.left, mergedUI.top, sw, sh);
				this.viewCtx.clip();
				for (const entry of uiEntries) {
					if (entry.layer.visible) {
						this.viewCtx.drawImage(entry.layer.vCtx.canvas, 0, 0);
					}
				}
				this.viewCtx.restore();
			}

			for (const entry of uiEntries) {
				if (entry.layer.dirtyRect !== null) entry.layer.clearDirty();
			}
		}
	}

	renderAll() {
		// 画板背景（identity）
		this.renderBackground();

		// Phase 1：所有 content 层（带 transform）
		const contentLayers = this.getContentLayers();
		for (const layer of contentLayers) {
			if (layer.visible) {
				this.viewCtx.drawImage(layer.vCtx.canvas, 0, 0);
			}
		}

		// Phase 2：UI overlay 层（identity）
		for (const entry of this.getUIOverlayEntries()) {
			if (!entry.layer.visible) continue;
			this.viewCtx.save();
			this.viewCtx.setTransform(1, 0, 0, 1, 0, 0);
			this.viewCtx.drawImage(entry.layer.vCtx.canvas, 0, 0);
			this.viewCtx.restore();
		}
	}

	// ─── 局部渲染 ─────────────────────────────────────

	/** 渲染 content 层指定范围（带 viewCtx transform） */
	private renderCanvasRange(rect: BoundBox): void {
		rect = {
			top: Math.floor(rect.top),
			bottom: Math.ceil(rect.bottom),
			left: Math.floor(rect.left),
			right: Math.ceil(rect.right),
		};
		const w = rect.right - rect.left;
		const h = rect.bottom - rect.top;
		if (w <= 0 || h <= 0) return;

		this.viewCtx.save();
		this.viewCtx.beginPath();
		this.viewCtx.rect(rect.left, rect.top, w, h);
		this.viewCtx.clip();
		this.viewCtx.clearRect(rect.left, rect.top, w, h);

		const layers = this.getContentLayers();
		for (const layer of layers) {
			if (layer.visible) {
				this.viewCtx.drawImage(layer.vCtx.canvas, rect.left, rect.top, w, h, rect.left, rect.top, w, h);
			}
		}
		this.viewCtx.restore();
	}

	// ─── 图层管理 ─────────────────────────────────────

	registerRenderLayer(entry: RenderLayerEntry): void {
		this.unregisterRenderLayer(entry.id);
		this.renderLayersRegistry.push(entry);
	}

	unregisterRenderLayer(id: string): void {
		this.renderLayersRegistry = this.renderLayersRegistry.filter((e) => e.id !== id);
	}

	unregisterPluginRenderLayers(id: string): void {
		this.renderLayersRegistry = this.renderLayersRegistry.filter((e) => e.id !== id);
	}
}
