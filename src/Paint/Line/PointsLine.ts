import { Vec2D } from "../types";

export class PointsLine {
	constructor(points?: Vec2D[]) {
		if (points) {
			this.addPoints(points);
		}
	}

	public segmentLines: {
		x: number;
		y: number;
		length: number;
	}[] = [];

	public addPoints(points: Vec2D[]) {
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
			}
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
		let result = 0;
		for (let i = 0; i < this.segmentLines.length - 1; i++) {
			result += this.segmentLines[i].length;
		}
		return result;
	}
}
