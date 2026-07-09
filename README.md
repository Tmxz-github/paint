# Paint — 基于 Canvas 的绘图引擎

一个使用 Vue 3 + TypeScript + Vite 构建的浏览器端画板应用，核心绘图引擎完全自研，不依赖第三方绘图库。

---

## 功能清单

### 绘制核心
- **贝塞尔曲线插值绘制** — 基于 cubic Bézier 曲线在点之间插值，实现平滑的笔触效果，而非简单的点间连线
- **多笔刷系统** — 支持笔刷类型注册与切换，内置 Pen（画笔）与 EraserBrush（橡皮擦）
- **笔刷属性调节** — 大小（0.1~128）与浓度/透明度（0.1~1.0）独立控制
- **压力感应** — 读取 PointerEvent 的 pressure 值影响笔触

### 图层系统
- **多层管理** — 支持动态新增、删除图层
- **图层显隐切换** — 每层独立可见性控制
- **当前图层切换** — 绘制操作仅作用于当前激活图层
- **脏矩形追踪** — 每层记录变更区域，支持增量渲染

### 视图变换
- **缩放** — 步进等比数列驱动（范围 0.1x~20x），支持滚轮（1.1x 步进）与键盘（W/S，1.5x 步进）
- **平移/拖拽** — 按住空格键拖拽画布
- **旋转** — 支持画布旋转（循环角度夹紧）
- **平滑动画** — 变换过渡使用 10 帧插值动画，非跳变

### 撤销/重做
- **像素级 diff** — 绘制前后逐像素对比（Uint32Array 优化），仅存储变化的像素
- **多层区域** — 支持单一区域与双区域 diff（如裁剪/拖拽操作）
- **最多 64 步** 撤销历史

### 选择与裁剪
- **矩形选区** — Lasso 插件提供矩形选择工具
- **自动裁剪选区** — 选区可自动收缩到非透明内容边界
- **选区内容操作** — 确认后支持拖拽移动、剪切、复制
- **选区内容预览** — 半透明浮层显示被选中/被裁剪的内容

### 橡皮擦
- **destination-out 合成模式** — 直接擦除像素而非覆盖白色
- **独立笔刷** — 与 Pen 共享大小/浓度参数体系，作为插件注册到 BrushManager

### 光标系统
- **实时光标渲染** — 在画布上层绘制圆形 + 十字准星，显示当前位置
- **边界自动夹紧** — 光标随缩放自适应半径与线宽

### 输入抽象
- **PointerListener** — 统一封装 pointerdown / move / up / enter / leave / wheel / contextmenu 事件
- **KeyListener** — 链式修饰键 API（`.control().shift().on("z:up", cb)`），支持 Ctrl/Alt/Shift + 任意按键

### 渲染管线
- **多层合成** — 将所有图层 + 插件注册的附加渲染层按 zIndex 合成到单一视口 canvas
- **脏矩形渲染** — 仅重绘发生变化的区域，提升性能
- **回调注入** — 通过回调函数而非直接引用解决循环依赖

### 插件系统
- **PaintPlugin 基类** — 提供完整的生命周期钩子：`apply`、`onInstalled`、`onUninstall`、`onRenderBefore/After`、`onBrushCommit`、`onLayerChange`、`getRenderLayers`
- **内置插件** — Eraser（橡皮擦）、Lasso（套索选择与裁剪）
- **自定义渲染层** — 插件可注册自己的渲染层到管线中

### 辅助功能
- **鼠标轨迹记录** — MouseTrajectory 记录原始点与平滑点序列，可供外部工具使用
- **背景色** — 画布背景色可配置（默认 `#f0f0f0` + 辅助网格色 `#66ccff`）

---

## 架构设计

### 分层架构

```
App.vue (UI 层 — 挂载 canvas、提供工具栏 UI)
  │
  └─ Paint (编排器 — 串联所有子系统)
       ├─ 模式系统          BaseMode / DrawMode / ClipMode
       ├─ 变换管理          TransformManager
       ├─ 渲染管线          RenderPipeline
       ├─ 图层管理          LayerManager → Layer[]
       ├─ 笔刷管理          BrushManager → BaseBrush (Pen / EraserBrush)
       ├─ 描边引擎          Line → PointsLine
       ├─ 撤销历史          CanvasHistory (像素级 diff)
       ├─ 光标系统          Cursor + CursorRenderer
       ├─ 输入抽象          PointerListener + KeyListener
       ├─ 轨迹记录          MouseTrajectory
       └─ 插件系统          PaintPlugin → Eraser / Lasso
```

### 模式系统 (Mode)

三种模式共同管理交互行为：

| 模式 | 职责 |
|------|------|
| **BaseMode**（常驻） | 滚轮缩放、空格拖拽平移、Ctrl+Z/R 撤销重做快捷键、光标绘制 |
| **DrawMode**（默认激活） | 捕获 pointer 事件驱动 Line 引擎绘制，提交到 CanvasHistory |
| **ClipMode**（套索激活） | 矩形选区交互、选区确认后拖拽/剪切内容 |

模式通过 `Paint.setMode()` 切换，每种模式实现 `onEnterMode` / `onLeaveMode` 生命周期。

### 插件系统

```typescript
abstract class PaintPlugin {
  abstract apply(paint: Paint): void;       // 初始化逻辑
  onInstalled?(paint: Paint): void;          // 安装后回调
  onUninstall?(): void;                      // 卸载时清理
  onRenderBefore?(ctx: CanvasRenderingContext2D): void;  // 渲染前钩子
  onRenderAfter?(ctx: CanvasRenderingContext2D): void;   // 渲染后钩子
  onBrushCommit?(data: BrushCommitData): void;           // 笔触提交回调
  onLayerChange?(layerManager: LayerManager): void;      // 图层变更回调
  getRenderLayers?(): RenderLayerEntry[];                 // 注册附加渲染层
}
```

### 关键设计决策

- **脏矩形渲染** — 每层 Layer 记录 dirtyRect，RenderPipeline 仅在 dirty 区域进行合成，避免全画布重绘
- **步进缩放** — 预计算两个等比数列（放大/缩小），保证缩放可逆且一致，不会因浮点累积产生偏移
- **像素级 diff** — CanvasHistory 使用 Uint32Array 视图一次性比较 4 字节（RGBA），仅存储变化像素，内存高效
- **createMirror Proxy** — 通过 Proxy 对象将属性读写镜像到目标对象（如 `mirrorCtx` → `currentLayer.vCtx`），解耦子系统间的直接引用
- **坐标变换** — `screenToCanvas` / `canvasToScreen` 考虑缩放、平移、旋转的复合变换，基于 Canvas 2D transform matrix 的逆矩阵

---

## 项目结构

```
paint/
├── index.html                  # HTML 入口
├── package.json                # 依赖管理
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
│
├── public/
│   └── vite.svg                # favicon
│
└── src/
    ├── main.ts                 # Vue 应用入口
    ├── App.vue                 # 根组件（UI + Paint 实例化）
    ├── style.css               # 全局样式
    ├── index.ts                # 公共 API 导出入口
    │
    └── Paint/
        ├── index.ts            # Paint 核心编排器 + PaintOption 接口
        ├── constants.ts        # 全局常量（TRANSPARENT = 0）
        │
        ├── BrushManager/       # 笔刷管理器（注册/获取/切换）
        │   └── index.ts
        ├── Brushes/            # 笔刷层级体系
        │   ├── BaseBrush.ts    #   抽象基类
        │   ├── Pen.ts          #   画笔（圆形填充 + 透明度控制）
        │   └── index.ts        #   导出 BrushStyle / BrushTypes
        │
        ├── CanvasHistory/      # 撤销/重做系统（像素级 diff）
        │   └── index.ts
        │
        ├── Cursor/             # 光标数据模型
        │   └── index.ts
        ├── CursorRenderer/     # 光标渲染（圆 + 十字线）
        │   └── index.ts
        │
        ├── DefaultPlugins/     # 插件系统
        │   ├── index.ts        #   PaintPlugin 基类
        │   ├── Eraser/         #   橡皮擦插件
        │   │   ├── index.ts
        │   │   └── EraserBrush.ts
        │   └── Lasso/          #   套索选择插件
        │       ├── index.ts
        │       ├── LassoSelector.ts    # 矩形选区
        │       └── ClipMode.ts         # 裁剪/拖拽模式
        │
        ├── Input/              # 输入事件抽象
        │   ├── key-listener.ts       # 键盘监听（链式修饰键 API）
        │   └── pointer-listener.ts   # 指针事件监听
        │
        ├── Layer/              # 单层模型（canvas + 脏矩形）
        │   └── index.ts
        ├── LayerManager/       # 多层 CRUD 管理
        │   └── index.ts
        │
        ├── Line/               # 描边引擎
        │   ├── index.ts        #   Line — 点累积 + Bézier 插值
        │   └── PointsLine.ts   #   参数化点路径
        │
        ├── Mode/               # 模式系统
        │   ├── index.ts        #   PaintMode 抽象类 + BaseMode
        │   └── drawMode.ts     #   DrawMode 绘制模式
        │
        ├── MouseTrajectory/    # 鼠标轨迹记录器
        │   └── index.ts
        │
        ├── RenderPipeline/     # 渲染管线（多层合成 + 脏矩形）
        │   └── index.ts
        │
        ├── Selectors/          # 选区基类
        │   ├── index.ts
        │   └── BaseSelector.ts
        │
        ├── Transform/          # 视图变换（缩放/旋转/平移）
        │   └── index.ts
        │
        ├── Types/              # 核心类型定义
        │   ├── index.ts        #   导出汇总
        │   ├── vec2d.ts        #   Vec2D 接口 + 静态数学方法
        │   ├── boundbox.ts     #   BoundBox 包围盒
        │   └── clipedarea.ts   #   ClipedArea 裁剪区
        │
        └── Utils/              # 工具函数
            ├── index.ts        #   Mix / Clamp / deepClone 等
            ├── canvas.ts       #   createCanvasContext / 坐标变换
            └── line.ts         #   genBezierPoints 贝塞尔点生成
```

---

## API 概览

### Paint 构造

```typescript
import { Paint } from "paint";
// 或从 src/index.ts 导入（开发/测试用）

const app = new Paint({
  containerEl: document.getElementById("canvas")!,  // 必需：挂载 canvas 的 DOM 元素
  width: 1024,          // 可选，默认 512
  height: 768,          // 可选，默认 512
  use: [new Eraser(), new Lasso()],  // 可选：安装插件
});
```

### 公共导出（src/index.ts）

| 分类 | 导出内容 |
|------|----------|
| **核心** | `Paint`, `PaintOption` |
| **类型** | `Vec2D`, `BoundBox`, `ClipedArea`, `ZoomOptions`, `PaintState`, `DirPoint`, `PaintEvents`, `PointerTypes`, `MyPointerEvent`, `RenderLayerEntry` |
| **常量** | `TRANSPARENT` |
| **变换** | `TransformManager` |
| **撤销** | `CanvasHistory` |
| **光标** | `Cursor`, `CursorRenderer` |
| **图层** | `Layer` |
| **描边** | `Line` |
| **轨迹** | `MouseTrajectory` |
| **笔刷** | `Pen`, `BaseBrush`, `BrushStyle`, `BrushTypes` |
| **模式** | `BaseMode`, `DrawMode`, `PaintMode` |
| **输入** | `KeyListener`, `PointerListener` |
| **插件** | `PaintPlugin`, `BrushCommitData`, `Eraser`, `Lasso` |
| **选区** | `BaseSelector`, `LassoSelector` |
| **工具** | `Mix`, `Clamp`, `CircleClamp`, `easeOutDecay`, `createMirror`, `deepClone`, `extendToBoundBox`, `createCanvasContext`, `screenToCanvas`, `canvasToScreen`, `genBezierPoints` |

### 核心类型定义

```typescript
// 二维向量
interface Vec2D { x: number; y: number; }

// 包围盒
interface BoundBox { top: number; bottom: number; left: number; right: number; }

// 裁剪区（选区 + 像素数据）
interface ClipedArea { boundBox: BoundBox; imageData: ImageData; }

// 笔刷样式
interface BrushStyle { size: number; color: string; thickness: number; }

// 插件渲染层注册
interface RenderLayerEntry { id: string; zIndex: number; layer: Layer; }
```
