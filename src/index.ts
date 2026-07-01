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
} from "./Paint/Types";

// --- 常量 ---
export { TRANSPARENT } from "./Paint/constants";

// --- 渲染层 ---
export type { RenderLayerEntry } from "./Paint/Types";

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

// --- 鼠标轨迹 ---
export { MouseTrajectory } from "./Paint/MouseTrajectory";

// --- 笔刷系统 ---
export { Pen, BaseBrush, type BrushStyle, type BrushTypes } from "./Paint/Brushes";

// --- 模式系统 ---
export { DrawMode } from "./Paint/Mode/drawMode";
export { BaseMode, type PaintMode } from "./Paint/Mode";

// --- 输入事件 ---
export { KeyListener } from "./Paint/Input/key-listener";
export { PointerListener } from "./Paint/Input/pointer-listener";

// --- 插件基类与内置插件 ---
export { PaintPlugin, type BrushCommitData } from "./Paint/DefaultPlugins";
export { Eraser } from "./Paint/DefaultPlugins/Eraser";
export { Lasso } from "./Paint/DefaultPlugins/Lasso";

// --- 选择器 ---
export { BaseSelector } from "./Paint/Selectors";
export { LassoSelector } from "./Paint/DefaultPlugins/Lasso/LassoSelector";

// --- 工具函数 ---
export { Mix, Clamp, CircleClamp, easeOutDecay, createMirror, deepClone, extendToBoundBox } from "./Paint/Utils";
export { createCanvasContext } from "./Paint/Utils/canvas";
export { screenToCanvas, canvasToScreen } from "./Paint/Utils/canvas";
export { genBezierPoints } from "./Paint/Utils/line";
