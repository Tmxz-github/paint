import { PaintPlugin } from "..";
import { Paint } from "../..";
import type { AnyObject } from "../../Types";
import { EraserBrush } from "./EraserBrush";

export class Eraser extends PaintPlugin {
	constructor() {
		super();
		this.name = "eraser";
	}

	apply(instance: Paint) {
		this.on("SWITCH_BRUSH", (data: AnyObject) => {
			const type = data.type;
			if (!type || typeof type !== "string") return;
			if (type === "ERASER") {
				instance.brushManager.setBursh("ERASER");
			}
		});
		const eraser = new EraserBrush(instance.getCurrentCtx.bind(instance), "EREASER", 2, 0.5);
		instance.brushManager.brushes.set("ERASER", eraser);
	}
}
