import { Vec2D } from "./vec2d";
import { BoundBox } from "./boundbox";
import { ClipedArea } from "./clipedarea";
import type { Layer } from "../Layer";

export { Vec2D, BoundBox, ClipedArea };

export interface ZoomOptions {
	center?: Vec2D;
	smooth?: boolean;
	/** 缩放模式：wheel=细致（小步进），keyboard=大致（大步进），默认 wheel */
	zoomMode?: "wheel" | "keyboard";
}

export type PaintState = "DRAW" | "DRAWWING" | "GRAB" | "GRABBING" | "CLIP" | "CLIPPING";

export interface DirPoint {
	x: number;
	y: number;
	dir: Vec2D;
}

export type AnyObject = Record<string, any>;

export type PaintEvents = "SWITCH_BRUSH" | "TRANSFORM_CHANGED";

export type PointerTypes = "UP" | "DOWN" | "LINE" | "ENTER" | "CONTEXT" | "WHEEL" | "MOVE" | "LEAVE";

export interface MyPointerEvent {
	type: PointerTypes;
	pressure: number;
	pos: Vec2D;
	e: PointerEvent | WheelEvent | MouseEvent;
}

/** 插件注册接口 */
export interface RenderLayerEntry {
	id: string;
	/** 渲染层级，数值越大越靠前（后绘制） */
	zIndex: number;
	layer: Layer;
	/** 是否 UI 覆盖层（不受 transform 影响，dirty rect 使用屏幕坐标） */
	isUIOverlay?: boolean;
}
