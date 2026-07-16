import { Vec2D, type BoundBox } from "../Types";
import type { DirPoint } from "../Types";

/** 给定坐标是否在给定包围盒内 */
export const inBBox = (pos: Vec2D, boundBox: BoundBox): boolean => {
	return pos.x > boundBox.left && pos.x < boundBox.right && pos.y > boundBox.top && pos.y < boundBox.bottom;
};

/**
 * 计算 DirPoint 沿 direction 方向延长后与 BoundBox 的相交点。
 */
export const extendToBoundBox = (point: DirPoint, boundBox: BoundBox): Vec2D => {
	const { x: ox, y: oy } = point;
	const dx = point.dir.x;
	const dy = point.dir.y;

	if (Vec2D.IsZero(point.dir)) {
		return Vec2D.Zero;
	}

	let bestT = Infinity;
	let bestX = ox;
	let bestY = oy;

	if (dx !== 0) {
		const tLeft = (boundBox.left - ox) / dx;
		if (tLeft > 0) {
			const yAtLeft = oy + tLeft * dy;
			if (yAtLeft >= boundBox.top && yAtLeft <= boundBox.bottom && tLeft < bestT) {
				bestT = tLeft;
				bestX = boundBox.left;
				bestY = yAtLeft;
			}
		}
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

	if (dy !== 0) {
		const tTop = (boundBox.top - oy) / dy;
		if (tTop > 0) {
			const xAtTop = ox + tTop * dx;
			if (xAtTop >= boundBox.left && xAtTop <= boundBox.right && tTop < bestT) {
				bestT = tTop;
				bestX = xAtTop;
				bestY = boundBox.top;
			}
		}
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
		return Vec2D.Zero;
	}

	return { x: bestX, y: bestY };
};
