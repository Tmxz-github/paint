import type { Vec2D } from "./vec2d";

export interface BoundBox {
	top: number;
	bottom: number;
	left: number;
	right: number;
}
export class BoundBox {
	static readonly Empty: BoundBox = { top: Infinity, bottom: 0, left: Infinity, right: 0 };

	/** 判断 BoundBox 面积计算是否大于 0 */
	static IsEmpty(box: BoundBox): boolean {
		return box.top >= box.bottom && box.left >= box.right;
	}

	static GetCorners(box: BoundBox): [Vec2D, Vec2D, Vec2D, Vec2D] {
		return [
			{ x: box.left, y: box.top },
			{ x: box.right, y: box.top },
			{ x: box.left, y: box.bottom },
			{ x: box.right, y: box.bottom },
		];
	}

	/** 合并两个包围盒 */
	static Merge(a: BoundBox, b: BoundBox): BoundBox {
		return {
			top: Math.min(a.top, b.top),
			left: Math.min(a.left, b.left),
			bottom: Math.max(a.bottom, b.bottom),
			right: Math.max(a.right, b.right),
		};
	}

	/** 四方向膨胀指定值 */
	static Inflate(box: BoundBox, radius: number): BoundBox {
		return {
			top: box.top - radius,
			left: box.left - radius,
			bottom: box.bottom + radius,
			right: box.right + radius,
		};
	}

	/** 四方向收缩指定值 */
	static Shrink(box: BoundBox, radius: number): BoundBox {
		const tmp = {
			top: box.top + radius,
			left: box.left + radius,
			bottom: box.bottom - radius,
			right: box.right - radius,
		};
		if (BoundBox.IsValid(tmp)) return tmp;
		return box;
	}

	/** 判断包围盒是否有效(面积大于0) */
	static IsValid(box: BoundBox | null): box is BoundBox {
		return !!box && this.IsEmpty(box);
	}

	/** 从点集计算包围盒 */
	static FromPoints(points: Vec2D[]): BoundBox {
		if (points.length === 0) {
			return { ...BoundBox.Empty };
		}
		let top = Infinity;
		let left = Infinity;
		let bottom = -Infinity;
		let right = -Infinity;
		for (const p of points) {
			if (p.x < left) left = p.x;
			if (p.x > right) right = p.x;
			if (p.y < top) top = p.y;
			if (p.y > bottom) bottom = p.y;
		}
		return { top, left, bottom, right };
	}

	/** 计算两个包围盒的交集 */
	static Intersect(a: BoundBox, b: BoundBox): BoundBox {
		return {
			top: Math.max(a.top, b.top),
			left: Math.max(a.left, b.left),
			bottom: Math.min(a.bottom, b.bottom),
			right: Math.min(a.right, b.right),
		};
	}
}
