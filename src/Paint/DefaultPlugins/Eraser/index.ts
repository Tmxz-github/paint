import { PaintPlugin } from "..";
import { Paint } from "../..";
import { EraserBrush } from "./EraserBrush";

export class Eraser extends PaintPlugin {
	constructor() {
        super();
        this.name = "eraser";
    }

    apply (instance: Paint) {
		const eraser = new EraserBrush(instance.mirrorCtx, 2, 0.5);
		instance.brushes.set("ERASER", eraser);
	}
}
