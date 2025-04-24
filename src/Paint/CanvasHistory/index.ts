import type { Layer } from "../Layer";
import type { BBox, Vec2D } from "../types";
import { deepClone } from "../Utils";

interface PixelDiff {
	pos: Vec2D;
	changedColor: Uint8ClampedArray;
	preColor: Uint8ClampedArray;
}

interface LayerDiff {
	layer: Layer;
	BBox: BBox;
	pixelDiff: PixelDiff[];
}

export class CanvasHistory {
	private readonly stackMaxLength = 64;
	private index: number = -1;
	private layerDiffs: LayerDiff[] = [];

	constructor() {}

	private changeTo(data: LayerDiff, undo: boolean) {
		const BBox = data.BBox;
		const curImageData = data.layer.vCtx.getImageData(BBox.left, BBox.top, BBox.right - BBox.left, BBox.bottom - BBox.top);
		const diff = data.pixelDiff;
		for (const d of diff) {
			const boxPos = {
				x: d.pos.x - BBox.left,
				y: d.pos.y - BBox.top,
			};
			const index = (boxPos.x + boxPos.y * curImageData.width) * 4;
			for (let i = 0; i < 4; i += 1) {
				curImageData.data[i + index] = undo ? d.preColor[i] : d.changedColor[i];
			}
		}
		data.layer.vCtx.putImageData(curImageData, BBox.left, BBox.top);
	}

	public commitChange(lineBBox: BBox, currentLayer: Layer) {
		const preData = currentLayer.preCtx.getImageData(
			lineBBox.left,
			lineBBox.top,
			lineBBox.right - lineBBox.left,
			lineBBox.bottom - lineBBox.top
		);
		const changedData = currentLayer.vCtx.getImageData(
			lineBBox.left,
			lineBBox.top,
			lineBBox.right - lineBBox.left,
			lineBBox.bottom - lineBBox.top
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

		this.index += 1;
		this.layerDiffs[this.index] = { layer: currentLayer, pixelDiff, BBox: deepClone(lineBBox) };
		if (this.layerDiffs.length - 1 > this.index) {
			this.layerDiffs.splice(this.index + 1);
		}
		if (this.layerDiffs.length > this.stackMaxLength) {
			this.layerDiffs.unshift();
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
