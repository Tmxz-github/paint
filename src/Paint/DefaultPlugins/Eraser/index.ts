import { PaintPlugin } from "..";
import { Paint } from "../..";
import { EraserBrush } from "./EraserBrush";

export class Eraser extends PaintPlugin {
	constructor() {
		super();
		this.name = "eraser";
	}

	apply(instance: Paint) {
		const eraser = new EraserBrush(instance.mirrorCtx, "EREASER", 2, 0.5);
		instance.brushManager.brushes.set("ERASER", eraser);
	}
}
