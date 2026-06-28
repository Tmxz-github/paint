import { Vec2D } from "../Types/vec2d";
import type { BoundBox } from "../Types";

export class PointsLine {
	constructor(points?: Vec2D[]) {
		if (points) {
			this.addPoints(points);
		}
	}

	private len: number = 0;

	public segmentLines: {
		x: number;
		y: number;
		length: number;
	}[] = [];

	public addPoints(points: Vec2D[]) {
		this.len = 0;
		this.segmentLines = [];
		for (let i = 0; i < points.length; i++) {
			let length = 0;
			if (i < points.length - 1) {
				length = Vec2D.Distance(points[i], points[i + 1]);
			}
			this.segmentLines[i] = {
				x: points[i].x,
				y: points[i].y,
				length: length,
			};
		}
	}

	public getAtDist(dist: number): Vec2D {
		let remainder = Math.min(this.getLength(), dist);
		let i = 0;

		for (; remainder > this.segmentLines[i].length && i < this.segmentLines.length - 2; i++) {
			remainder -= this.segmentLines[i].length;
		}

		const fac = Math.min(1, Math.max(0, remainder / this.segmentLines[i].length));

		return {
			x: this.segmentLines[i].x * (1 - fac) + this.segmentLines[i + 1].x * fac,
			y: this.segmentLines[i].y * (1 - fac) + this.segmentLines[i + 1].y * fac,
		};
	}

	public getLength(): number {
		if (this.len) return this.len;
		let result = 0;
		for (let i = 0; i < this.segmentLines.length - 1; i++) {
			result += this.segmentLines[i].length;
		}
		return result;
	}

	/** 返回所有 segment 点的包围盒 */
	getBBox(): BoundBox {
		if (this.segmentLines.length === 0) {
			return { top: 0, left: 0, bottom: 0, right: 0 };
		}
		let top = Infinity;
		let left = Infinity;
		let bottom = -Infinity;
		let right = -Infinity;
		for (const seg of this.segmentLines) {
			if (seg.x < left) left = seg.x;
			if (seg.x > right) right = seg.x;
			if (seg.y < top) top = seg.y;
			if (seg.y > bottom) bottom = seg.y;
		}
		return { top, left, bottom, right };
	}
}
