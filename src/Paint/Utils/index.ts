import { Vec2D, type BoundBox } from "../Types";
import type { DirPoint } from "../Types";

/** a * (1 - f) + b * f  */
export const Mix = (a: number, b: number, f: number): number => {
	return a * (1 - f) + b * f;
};

/** 将数字限制在 [min, max] 中 */
export const Clamp = (num: number, min: number, max: number): number => {
	return num < min ? min : num > max ? max : num;
};

export const CircleClamp = (num: number, min: number, max: number): number => {
	const range = max - min;
	return ((((num - min) % range) + range) % range) + min;
};

export const easeOutDecay = (x: number): number => {
	const startY = 32;
	const endY = 4;
	const k = 0.03; // 控制下降快慢的系数，值越小越慢
	return endY + (startY - endY) * Math.exp(-k * x);
};

/**
 * 获取一个镜像，镜像上的操作会作用与 env[...mirrorProps]
 *
 * 例如 this.mirrorCtx = createMirror<typeof this, CanvasRenderingContext2D>(this, ["currentLayer", "vCtx"]);
 *
 * mirrorCtx 上的每一次操作都会找到当前的 this.currentLayer.vCtx，然后作用于上面
 *
 * @param env 环境
 * @param mirrorProps 属性名数组
 * @returns 最终获得的属性类型
 */
export const createMirror = <ENV extends Record<string, any>, R extends object>(env: ENV, mirrorProps: string[]): R => {
	return new Proxy({} as R, {
		get(_, prop: string) {
			let middleValue = env;
			for (const prop of mirrorProps) {
				middleValue = middleValue[prop];
			}
			const mirror = middleValue as Record<string, any>;
			const value = mirror[prop];
			if (typeof value === "function") {
				return (...args: any[]) => {
					return (value as Function).apply(mirror, args);
				};
			} else {
				return value;
			}
		},
		set(_, prop: string, value: any) {
			let middleValue = env;
			for (const prop of mirrorProps) {
				middleValue = middleValue[prop];
			}
			const mirror = middleValue as Record<string, any>;
			mirror[prop] = value;
			return true;
		},
	});
};

export const deepClone = <T>(obj: T): T => {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime()) as T;
	}

	if (obj instanceof RegExp) {
		return new RegExp(obj.source, obj.flags) as T;
	}

	if (Array.isArray(obj)) {
		return obj.map(deepClone) as unknown as T;
	}

	const cloned: any = {};
	for (const key of Object.keys(obj)) {
		cloned[key] = deepClone((obj as any)[key]);
	}

	const symbols = Object.getOwnPropertySymbols(obj);
	for (const sym of symbols) {
		cloned[sym] = deepClone((obj as any)[sym]);
	}

	return cloned;
};

/** 给定坐标是否在给定包围盒内 */
export const inBBox = (pos: Vec2D, boundBox: BoundBox): boolean => {
	return pos.x > boundBox.left && pos.x < boundBox.right && pos.y > boundBox.top && pos.y < boundBox.bottom;
};

/**
 * 计算 DirPoint 沿 direction 方向延长后与 BoundBox 的相交点。
 * 从原点 (point.x, point.y) 沿 (point.dir.x, point.dir.y) 方向发射射线，
 * 返回与 BoundBox 四条边中最早相交的那个交点。
 *
 * 若没有有效交点，返回Zero
 */
export const extendToBoundBox = (point: DirPoint, boundBox: BoundBox): Vec2D => {
	const { x: ox, y: oy } = point;
	const dx = point.dir.x;
	const dy = point.dir.y;

	// 方向零向量 → 无法延申，返回原点
	if (Vec2D.IsZero(point.dir)) {
		return Vec2D.Zero;
	}

	let bestT = Infinity;
	let bestX = ox;
	let bestY = oy;

	// 检查与左右边界的交点
	if (dx !== 0) {
		// 左边界 x = left
		const tLeft = (boundBox.left - ox) / dx;
		if (tLeft > 0) {
			const yAtLeft = oy + tLeft * dy;
			if (yAtLeft >= boundBox.top && yAtLeft <= boundBox.bottom && tLeft < bestT) {
				bestT = tLeft;
				bestX = boundBox.left;
				bestY = yAtLeft;
			}
		}
		// 右边界 x = right
		const tRight = (boundBox.right - ox) / dx;
		if (tRight > 0) {
			const yAtRight = oy + tRight * dy;
			if (yAtRight >= boundBox.top && yAtRight <= boundBox.bottom && tRight < bestT) {
				bestT = tRight;
				bestX = boundBox.right;
				bestY = yAtRight;
			}
		}
	}

	// 检查与上下边界的交点
	if (dy !== 0) {
		// 上边界 y = top
		const tTop = (boundBox.top - oy) / dy;
		if (tTop > 0) {
			const xAtTop = ox + tTop * dx;
			if (xAtTop >= boundBox.left && xAtTop <= boundBox.right && tTop < bestT) {
				bestT = tTop;
				bestX = xAtTop;
				bestY = boundBox.top;
			}
		}
		// 下边界 y = bottom
		const tBottom = (boundBox.bottom - oy) / dy;
		if (tBottom > 0) {
			const xAtBottom = ox + tBottom * dx;
			if (xAtBottom >= boundBox.left && xAtBottom <= boundBox.right && tBottom < bestT) {
				bestT = tBottom;
				bestX = xAtBottom;
				bestY = boundBox.bottom;
			}
		}
	}

	if (bestT === Infinity) {
		// 未找到有效交点, 返回 Zero
		return Vec2D.Zero;
	}

	return { x: bestX, y: bestY };
};
