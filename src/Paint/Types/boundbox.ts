export interface BoundBox {
	top: number;
	bottom: number;
	left: number;
	right: number;
}
export class BoundBox {
	static readonly Empty: BoundBox = { top: Infinity, bottom: 0, left: Infinity, right: 0 };

	/** 合并两个包围盒，取并集 */
	static merge(a: BoundBox, b: BoundBox): BoundBox {
		return {
			top: Math.min(a.top, b.top),
			left: Math.min(a.left, b.left),
			bottom: Math.max(a.bottom, b.bottom),
			right: Math.max(a.right, b.right),
		};
	}

	/** 四方向膨胀指定值（用于笔刷半径扩展） */
	static inflate(box: BoundBox, radius: number): BoundBox {
		return {
			top: box.top - radius,
			left: box.left - radius,
			bottom: box.bottom + radius,
			right: box.right + radius,
		};
	}

	/** 判断包围盒是否有效（非空且面积 > 0） */
	static isValid(box: BoundBox | null): box is BoundBox {
		return box !== null && box.right > box.left && box.bottom > box.top;
	}

	/** 从点集计算包围盒 */
	static fromPoints(points: { x: number; y: number }[]): BoundBox {
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
}
