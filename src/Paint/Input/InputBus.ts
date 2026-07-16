/** 输入事件 */
export interface InputEvent {
	type: string;
	pos?: { x: number; y: number };
	pressure?: number;
	e: Event;
}

type Callback = (e: InputEvent) => void;

/** 控制键类型 */
class ModState {
	control: boolean = false;
	alt: boolean = false;
	shift: boolean = false;
}

interface onAPI {
	on: (key: string, cb: Callback, args?: any[], env?: object) => void;
}

interface afterControl extends onAPI {
	alt: () => afterControlAlt & onAPI;
	shift: () => afterControlShift & onAPI;
}
interface afterAlt extends onAPI {
	control: () => afterControlAlt & onAPI;
	shift: () => afterAltShift & onAPI;
}
interface afterShift extends onAPI {
	control: () => afterControlShift & onAPI;
	alt: () => afterAltShift & onAPI;
}
interface afterControlAlt extends onAPI {
	shift: () => onAPI;
}
interface afterControlShift extends onAPI {
	alt: () => onAPI;
}
interface afterAltShift extends onAPI {
	control: () => onAPI;
}

/**
 * InputBus — 输入事件总线
 *
 * 所有事件以 `key:direction` 格式注册，支持修饰键链式调用。
 *
 * 键盘事件示例：
 *   input.on("z:down", cb)              	// Z 键按下
 *   input.control().on("z:up", cb)      	// Ctrl+Z 释放
 *   input.control().alt().on("z:down")    	// Ctrl+Alt+Z 按下
 *   input.on("space:down", cb)           	// 空格键按下
 *
 * 指针事件示例：
 *   input.on("pointer:move", cb)         	// 鼠标移动
 *   input.control().on("pointer:down", cb) // Ctrl+鼠标点击
 *   input.on("wheel:up", cb)             	// 滚轮向上
 */
export class InputBus {
	constructor(private element: HTMLElement) {
		this._bindKeyboard();
		this._bindPointer();
	}

	private _evs: Map<string, Callback[]> = new Map();
	private _boundCbs: Map<Callback, Callback> = new Map();

	private _emit(mod: Partial<ModState>, key: string, body: InputEvent) {
		const modKey = this._genEvKey(mod, key);
		const cbs = this._evs.get(modKey);
		if (!cbs) return;
		for (const cb of cbs) cb(body);
	}

	/** ctrl 等控制键生成对应 key */
	private _genEvKey(state: Partial<ModState>, key?: string): string {
		const parts: string[] = [];
		if (state.control) parts.push("control");
		if (state.alt) parts.push("alt");
		if (state.shift) parts.push("shift");
		if (key) parts.push(key);
		return parts.join("+");
	}

	private _curMod: ModState = new ModState();

	private _fnKeyHandler(key: keyof ModState) {
		this._curMod[key] = true;
	}

	private _on(key: string, cb: Callback) {
		const evKey = this._genEvKey(this._curMod, key);
		let cbs = this._evs.get(evKey);
		if (!cbs) {
			cbs = [];
			this._evs.set(evKey, cbs);
		}
		cbs.push(cb);
		this._curMod = new ModState();
	}

	public on(key: string, cb: Callback, args?: any[], env?: object): void {
		const bound = env ? (cb.bind(env, ...(args || [])) as Callback) : (e: InputEvent) => cb(e);
		this._boundCbs.set(cb, bound);
		this._on(key, bound);
	}

	public off(key: string, cb: Callback): void {
		const bound = this._boundCbs.get(cb);
		if (!bound) return;
		const cbs = this._evs.get(key);
		if (!cbs) return;
		const i = cbs.findIndex((f) => f === bound);
		if (i < 0) return;
		cbs.splice(i, 1);
		this._boundCbs.delete(cb);
	}

	public offAll(key?: string): void {
		if (key) this._evs.delete(key);
		else this._evs.clear();
	}

	public control(): afterControl {
		this._fnKeyHandler("control");
		const self = this;
		function alt(): afterControlAlt & onAPI {
			self._fnKeyHandler("alt");
			function shift(): onAPI {
				self._fnKeyHandler("shift");
				return { on: self.on.bind(self) };
			}
			return { on: self.on.bind(self), shift };
		}
		function shift(): afterControlShift & onAPI {
			self._fnKeyHandler("shift");
			function alt(): onAPI {
				self._fnKeyHandler("alt");
				return { on: self.on.bind(self) };
			}
			return { on: self.on.bind(self), alt };
		}
		return { on: self.on.bind(self), alt, shift };
	}

	public alt(): afterAlt {
		this._fnKeyHandler("alt");
		const self = this;
		function control(): afterControlAlt & onAPI {
			self._fnKeyHandler("control");
			function shift(): onAPI {
				self._fnKeyHandler("shift");
				return { on: self.on.bind(self) };
			}
			return { on: self.on.bind(self), shift };
		}
		function shift(): afterAltShift & onAPI {
			self._fnKeyHandler("shift");
			function control(): onAPI {
				self._fnKeyHandler("control");
				return { on: self.on.bind(self) };
			}
			return { on: self.on.bind(self), control };
		}
		return { on: self.on.bind(self), control, shift };
	}

	public shift(): afterShift {
		this._fnKeyHandler("shift");
		const self = this;
		function control(): afterControlShift & onAPI {
			self._fnKeyHandler("control");
			function alt(): onAPI {
				self._fnKeyHandler("alt");
				return { on: self.on.bind(self) };
			}
			return { on: self.on.bind(self), alt };
		}
		function alt(): afterAltShift & onAPI {
			self._fnKeyHandler("alt");
			function control(): onAPI {
				self._fnKeyHandler("control");
				return { on: self.on.bind(self) };
			}
			return { on: self.on.bind(self), control };
		}
		return { on: self.on.bind(self), control, alt };
	}

	/** 从 dom 事件名切换到内部事件名 */
	private _domKeyName(key: string): string {
		const map: Record<string, string> = { " ": "space", Enter: "enter" };
		return map[key] || key;
	}

	private _bindKeyboard() {
		this.element.addEventListener("keydown", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, `${this._domKeyName(e.key)}:down`, {
				type: "keyboard",
				e,
			});
		});
		this.element.addEventListener("keyup", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, `${this._domKeyName(e.key)}:up`, {
				type: "keyboard",
				e,
			});
		});
	}

	private _bindPointer() {
		this.element.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, "pointer:down", {
				type: "pointer:down",
				pos: { x: e.offsetX, y: e.offsetY },
				pressure: e.pressure || 1,
				e,
			});
		});
		this.element.addEventListener("pointermove", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, "pointer:move", {
				type: "pointer:move",
				pos: { x: e.offsetX, y: e.offsetY },
				pressure: e.pressure || 1,
				e,
			});
		});
		this.element.addEventListener("pointerup", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, "pointer:up", {
				type: "pointer:up",
				pos: { x: e.offsetX, y: e.offsetY },
				pressure: 1,
				e,
			});
		});
		this.element.addEventListener("pointercancel", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, "pointer:up", {
				type: "pointer:up",
				pos: { x: e.offsetX, y: e.offsetY },
				pressure: e.pressure || 1,
				e,
			});
		});
		this.element.addEventListener("pointerenter", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, "pointer:enter", {
				type: "pointer:enter",
				pos: { x: e.offsetX, y: e.offsetY },
				pressure: 1,
				e,
			});
		});
		this.element.addEventListener("pointerleave", (e) => {
			e.preventDefault();
			this._emit({ control: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }, "pointer:leave", {
				type: "pointer:leave",
				pos: { x: e.offsetX, y: e.offsetY },
				pressure: 1,
				e,
			});
		});
		this.element.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			this._emit({ control: false, alt: false, shift: false }, "pointer:context", {
				type: "pointer:context",
				pos: { x: (e as MouseEvent).offsetX, y: (e as MouseEvent).offsetY },
				pressure: 1,
				e,
			});
		});
		this.element.addEventListener("wheel", (e) => {
			e.preventDefault();
			const we = e as WheelEvent;
			const dir = we.deltaY < 0 ? "up" : "down";
			this._emit({ control: we.ctrlKey, alt: we.altKey, shift: we.shiftKey }, `wheel:${dir}`, {
				type: `wheel:${dir}`,
				pos: { x: we.offsetX, y: we.offsetY },
				pressure: 1,
				e: we,
			});
		});
	}
}
