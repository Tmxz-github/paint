import { Layer } from "../Layer";
import type { BoundBox, Vec2D } from "../Types";
import { deepClone } from "../Utils";

/** 单个像素色彩差异 */
interface PixelDiff {
	pos: Vec2D;
	changedColor: Uint8ClampedArray;
	preColor: Uint8ClampedArray;
}

/** 包围盒差异 */
interface Diff {
	boundBox: BoundBox;
	pixelDiff: PixelDiff[];
}

/** 
 * 图层差异
 * 
 * diff2 存在时说明有两块（两个包围盒）发生了变化，例如剪切后拖动放置
 */
interface LayerDiff {
	layer: Layer;
	diff1: Diff;
	diff2?: Diff;
}

export class CanvasHistory {
	private readonly stackMaxLength = 64;
	private index: number = -1;
	private layerDiffs: LayerDiff[] = [];

	constructor() {}

	private changeTo(data: LayerDiff, undo: boolean) {
		const BoundBox = data.diff1.boundBox;
		const curImageData = data.layer.vCtx.getImageData(
			BoundBox.left,
			BoundBox.top,
			BoundBox.right - BoundBox.left,
			BoundBox.bottom - BoundBox.top,
		);
		const diff = data.diff1.pixelDiff;
		for (const d of diff) {
			const boxPos = {
				x: d.pos.x - BoundBox.left,
				y: d.pos.y - BoundBox.top,
			};
			const index = (boxPos.x + boxPos.y * curImageData.width) * 4;
			for (let i = 0; i < 4; i += 1) {
				curImageData.data[i + index] = undo ? d.preColor[i] : d.changedColor[i];
			}
		}
		data.layer.vCtx.putImageData(curImageData, BoundBox.left, BoundBox.top);
		if (data.diff2) {
			this.changeTo(
				{
					layer: data.layer,
					diff1: data.diff2,
					diff2: undefined,
				},
				undo,
			);
		}

		data.layer.markDirty(data.diff1.boundBox);
		data.layer.snapshot();
	}

	private findPixelDiff(lineBBox: BoundBox, currentLayer: Layer) {
		const preData = currentLayer.preCtx.getImageData(
			lineBBox.left,
			lineBBox.top,
			lineBBox.right - lineBBox.left,
			lineBBox.bottom - lineBBox.top,
		);
		const changedData = currentLayer.vCtx.getImageData(
			lineBBox.left,
			lineBBox.top,
			lineBBox.right - lineBBox.left,
			lineBBox.bottom - lineBBox.top,
		);

		const pixelDiff: PixelDiff[] = [];

		let x = 0;
		let y = 0;
		for (let i = 0; i < changedData.data.length; i += 4) {
			const pre = preData.data.slice(i, i + 4);
			const cur = changedData.data.slice(i, i + 4);
			for (let j = 0; j < 4; j += 1) {
				if (pre[j] !== cur[j]) {
					pixelDiff.push({
						pos: {
							x: x + lineBBox.left,
							y: y + lineBBox.top,
						},
						changedColor: cur,
						preColor: pre,
					});
					break;
				}
			}
			x += 1;
			if (x >= changedData.width) {
				x = 0;
				y += 1;
			}
		}
		return pixelDiff;
	}

	public commitChange(lineBBox1: BoundBox, currentLayer: Layer, lineBBox2?: BoundBox) {
		const pixelDiff = this.findPixelDiff(lineBBox1, currentLayer);
		this.index += 1;
		const diff1 = { pixelDiff, boundBox: deepClone(lineBBox1) };
		let diff2 = undefined;
		if (lineBBox2) {
			const pixelDiff2 = this.findPixelDiff(lineBBox2, currentLayer);
			diff2 = { pixelDiff: pixelDiff2, boundBox: deepClone(lineBBox2) };
		}

		this.layerDiffs[this.index] = { layer: currentLayer, diff1, diff2 };
		if (this.layerDiffs.length - 1 > this.index) {
			this.layerDiffs.splice(this.index + 1);
		}
		if (this.layerDiffs.length > this.stackMaxLength) {
			this.layerDiffs.shift();
		}
	}

	public undo() {
		const data = this.layerDiffs[this.index];
		if (!data) return;
		this.index -= 1;
		this.changeTo(data, true);
	}

	public redo() {
		const data = this.layerDiffs[this.index + 1];
		if (!data) return;
		this.index += 1;
		this.changeTo(data, false);
	}
}
