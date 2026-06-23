import type { Paint } from "..";
import type { AnyObject, PaintEvents } from "../types";

export class PaintPlugin {
	name: string = "default";
	readonly events: Map<PaintEvents, Function[]> = new Map();

	public apply(_: Paint) {}

	public acceptEvent(name: PaintEvents, data: AnyObject) {
		if (!this.events.get(name)) return;
		const cbs = this.events.get(name) || [];
		for (const cb of cbs) {
			cb.call(this, data);
		}
	}

	public on(name: PaintEvents, cb: (data: AnyObject) => void) {
		if (!this.events.get(name)) {
			this.events.set(name, []);
		}
		this.events.get(name)?.push(cb);
	}
}
