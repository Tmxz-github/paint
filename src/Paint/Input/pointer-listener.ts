import type { MyPointerEvent, PointerTypes } from "../Types";

export type { MyPointerEvent };

type EventCallBack = (e: MyPointerEvent) => void;

export class PointerListener {
	private evs: Map<PointerTypes, EventCallBack[]> = new Map();
	private _boundCbs: WeakMap<Function, EventCallBack> = new Map();

	constructor(private element: HTMLElement) {
		this.element.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			this.emit({
				type: "DOWN",
				pressure: e.pressure | 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
		this.element.addEventListener("pointerleave", (e) => {
			e.preventDefault();
			this.emit({
				type: "LEAVE",
				pressure: e.pressure | 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
		this.element.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			this.emit({
				type: "CONTEXT",
				pressure: 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
		this.element.addEventListener("pointerenter", (e) => {
			e.preventDefault();
			this.emit({
				type: "ENTER",
				pressure: 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
		this.element.addEventListener("pointermove", (e) => {
			e.preventDefault();
			this.emit({
				type: "MOVE",
				pressure: e.pressure | 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
		this.element.addEventListener("pointerup", (e) => {
			e.preventDefault();
			this.emit({
				type: "UP",
				pressure: 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
		this.element.addEventListener("pointercancel", (e) => {
			e.preventDefault();
			this.emit({
				type: "UP",
				pressure: e.pressure | 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
		this.element.addEventListener("wheel", (e) => {
			e.preventDefault();
			this.emit({
				type: "WHEEL",
				pressure: 1,
				pos: {
					x: e.offsetX,
					y: e.offsetY,
				},
				e,
			});
		});
	}

	on(evType: PointerTypes, cb: EventCallBack, env?: object) {
		const bound = cb.bind(env);
		this._boundCbs.set(cb, bound);
		cb = cb.bind(env);
		let cbs = this.evs.get(evType);
		if (!cbs) {
			cbs = [];
			this.evs.set(evType, cbs);
		}
		cbs.push(bound);
	}

	offAll(evType: PointerTypes) {
		this.evs.delete(evType);
	}

	off(evType: PointerTypes, cb: Function) {
		const bound = this._boundCbs.get(cb);
		if (!bound) return;
		const cbs = this.evs.get(evType);
		if (!cbs) return;
		let i = cbs.findIndex((f) => f === cb);
		if (i < 0) return;
		cbs.splice(i, 1);
		this._boundCbs.delete(cb);
	}

	emit(e: MyPointerEvent) {
		const cbs = this.evs.get(e.type) || [];
		for (const cb of cbs) {
			cb(e);
		}
	}
}
