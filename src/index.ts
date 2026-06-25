// ============================================================
// Paint - Canvas 绘图应用统一导出入口 - 测试用
// ============================================================

// --- 核心 Paint 类 ---
export { Paint, type PaintOption } from "./Paint";

// --- 类型系统 ---
export {
	Vec2D,
	BoundBox,
	ClipedArea,
	type ZoomOptions,
	type PaintState,
	type DirPoint,
	type AnyObject,
	type PaintEvents,
	type PointerTypes,
	type MyPointerEvent,
	type PaintPointerEvent,
} from "./Types";

// --- 常量 ---
export { TRANSPARENT } from "./Paint/constants";

// --- 渲染层 ---
export type { RenderLayerEntry } from "./Paint/RenderLayer";

// --- 变换管理 ---
export { TransformManager } from "./Paint/Transform";

// --- 撤销历史 ---
export { CanvasHistory } from "./Paint/CanvasHistory";

// --- 光标 ---
export { Cursor } from "./Paint/Cursor";
export { CursorRenderer } from "./Paint/CursorRenderer";

// --- 图层 ---
export { Layer } from "./Paint/Layer";

// --- 描边系统 ---
export { Line } from "./Paint/Line";

// --- 笔刷系统 ---
export { Pen, BaseBrush, type BrushStyle, type BrushTypes } from "./Paint/Brushes";

// --- 模式系统 ---
export { DrawMode } from "./Paint/Mode/drawMode";
export { BaseMode, type PaintMode } from "./Paint/Mode";

// --- 输入事件 ---
export { KeyListener } from "./Paint/Input/key-listener";
export { PointerListener } from "./Paint/Input/pointer-listener";
export { InputManager } from "./Paint/InputManager";
export type { InputCallbacks } from "./Paint/InputManager";

// --- 插件基类与内置插件 ---
export { PaintPlugin, type BrushCommitData, type RenderContext } from "./Paint/DefaultPlugins";
export { Eraser } from "./Paint/DefaultPlugins/Eraser";
export { Lasso } from "./Paint/DefaultPlugins/Lasso";

// --- 工具函数 ---
export { Mix, Clamp, CircleClamp, easeOutDecay, createMirror, deepClone } from "./Paint/Utils";
export { createCanvasContext } from "./Paint/Utils/canvas";
export { genBezierPoints } from "./Paint/Utils/line";
