import { PointerListener } from "../Input/pointer-listener";
import { KeyListener } from "../Input/key-listener";
import type { MyPointerEvent } from "../Input/pointer-listener";

/**
 * InputCallbacks - 输入事件回调接口
 *
 * InputManager 监听到输入事件后，通过回调接口分发给 Paint 的业务逻辑。
 * 不持有 Paint 引用，通过回调函数实现松耦合。
 */
export interface InputCallbacks {
	onModePointerMove: (ev: MyPointerEvent) => void;
	onModePointerDown: (ev: MyPointerEvent) => void;
	onModePointerUp: (ev: MyPointerEvent) => void;
	onModePointerLeave: (ev: MyPointerEvent) => void;
	onModePointerEnter: (ev: MyPointerEvent) => void;
	onModePointerWheel: (ev: MyPointerEvent) => void;
	onBasePointerMove: (ev: MyPointerEvent) => void;
	onBasePointerDown: (ev: MyPointerEvent) => void;
	onBasePointerUp: (ev: MyPointerEvent) => void;
	onBasePointerLeave: (ev: MyPointerEvent) => void;
	onBasePointerEnter: (ev: MyPointerEvent) => void;
	onBasePointerWheel: (ev: MyPointerEvent) => void;
	onGrabReady: (active: boolean) => void;
	onGrabbingEnd: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
}

/**
 * InputManager - 输入管理器
 *
 * 负责绑定 pointer 和 keyboard 事件，并将事件分发给 Paint 的业务逻辑。
 * 通过 InputCallbacks 回调接口与 Paint 解耦。
 * 不依赖 Paint 类。
 */
export class InputManager {
	constructor(
		private pointerListener: PointerListener,
		private keyListener: KeyListener,
		private callbacks: InputCallbacks,
	) {
		this.bindEvents();
	}

	private bindEvents(): void {
		const cbs = this.callbacks;

		// Pointer 事件
		this.pointerListener.on("MOVE", (ev) => {
			if (ev.e.movementX === 0 && ev.e.movementY === 0) return;
			cbs.onModePointerMove(ev);
			cbs.onBasePointerMove(ev);
		});
		this.pointerListener.on("DOWN", (ev) => {
			cbs.onModePointerDown(ev);
			cbs.onBasePointerDown(ev);
		});
		this.pointerListener.on("UP", (ev) => {
			cbs.onModePointerUp(ev);
			cbs.onBasePointerUp(ev);
		});
		this.pointerListener.on("LEAVE", (ev) => {
			cbs.onModePointerLeave(ev);
			cbs.onBasePointerLeave(ev);
		});
		this.pointerListener.on("ENTER", (ev) => {
			cbs.onModePointerEnter(ev);
			cbs.onBasePointerEnter(ev);
		});
		this.pointerListener.on("WHEEL", (ev) => {
			cbs.onModePointerWheel(ev);
			cbs.onBasePointerWheel(ev);
		});

		// Keyboard 事件
		this.keyListener.on(" :down", () => cbs.onGrabReady(true));
		this.keyListener.on(" :up", () => {
			cbs.onGrabReady(false);
			cbs.onGrabbingEnd();
		});
		this.keyListener.control().on("z:up", () => {
			cbs.onUndo();
		});
		this.keyListener.control().on("r:up", () => {
			cbs.onRedo();
		});
		this.keyListener.on("w:down", () => cbs.onZoomIn());
		this.keyListener.on("s:down", () => cbs.onZoomOut());
	}
}
