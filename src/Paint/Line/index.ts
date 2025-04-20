import type { Brush } from "../Brushes";
import { Pen } from "../Brushes/Pen";
import { Vec2D, type DirPoint } from "../types";
import { Clamp, Mix } from "../Utils";
import { genBezierPoints } from "../Utils/line";
import { PointsLine } from "./PointsLine";

export class Line {
	private lastDot: number = 0;
	private originPoints: DirPoint[] = [];
	private lastPoint: Vec2D = new Vec2D();
	private bezierPoints: Vec2D[] = [];

	public pointsLine: PointsLine;

	constructor(private pathCtx: CanvasRenderingContext2D, private brush: Brush) {
		if (!brush) {
			this.brush = new Pen(this.pathCtx, 2);
		}
		this.pointsLine = new PointsLine();
	}

	public startLine(point: Vec2D) {
		this.originPoints.push({
			x: point.x,
			y: point.y,
			dir: new Vec2D(),
		});
		this.brush.drawDot(point);
	}

	public lineTo(curPoint: Vec2D) {
		if (Vec2D.Equal(this.lastPoint, curPoint)) {
			return [];
		}
		this.lastPoint = curPoint;
		this.originPoints.push({
			x: curPoint.x,
			y: curPoint.y,
			dir: new Vec2D(),
		});
		if (this.originPoints.length === 1) {
			return;
		} else if (this.originPoints.length === 2) {
			this.lastDot = this.brush.size;
			this.originPoints[0]!.dir = Vec2D.Normalize(Vec2D.Sub(this.originPoints[1]!, this.originPoints[0]!));
			return;
		}
		this.bezierPoints = genBezierPoints(
			this.originPoints[this.originPoints.length - 3],
			this.originPoints[this.originPoints.length - 2],
			20
		);
		this.pointsLine.addPoints(this.bezierPoints);
		this.renderLine();
	}

	public endLine() {
		this.originPoints = [];
	}

	private renderLine() {
		const len = this.pointsLine.getLength();
		let tempSpacing = Mix(2, 2, Clamp(2 / len, 0, 1));
		let d = this.lastDot;
		for (; d <= len; d += tempSpacing) {
			tempSpacing = Mix(2, 2, Clamp(2 / len, 0, 1));
			const point = this.pointsLine.getAtDist(d);
			if (this.brush?.drawDot) {
				this.brush.drawDot(point);
			}
		}
		this.lastDot = d - len;
	}
}
