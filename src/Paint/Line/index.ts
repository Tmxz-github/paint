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
			this.brush = new Pen(this.pathCtx, 2, 2, "black");
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
		const pointM1 = this.originPoints[this.originPoints.length - 1];
		const pointM2 = this.originPoints[this.originPoints.length - 2];
		const pointM3 = this.originPoints[this.originPoints.length - 3];
		pointM2.dir = Vec2D.Normalize(Vec2D.Sub(pointM1, pointM3));
		if (isNaN(pointM2.dir.x) || isNaN(pointM2.dir.y)) {
			//when xy -3 == -1
			pointM2.dir = JSON.parse(JSON.stringify(pointM3.dir));
		}
		this.bezierPoints = genBezierPoints(
			this.originPoints[this.originPoints.length - 2],
			this.originPoints[this.originPoints.length - 1],
			20
		);

		this.pointsLine.addPoints(this.bezierPoints);
		this.renderLine();

		// this.brush.drawDot(curPoint, {
		// 	color: "red",
		// 	size: 8,
		// });
	}

	public endLine() {
		if (this.originPoints.length < 2) return;
		const [lastPoint1, lastPoint2] = [
			this.originPoints[this.originPoints.length - 2],
			this.originPoints[this.originPoints.length - 1],
		];
		const newP = Vec2D.Add(lastPoint2, Vec2D.Sub(lastPoint2, lastPoint1));
		this.lineTo(newP);
		this.originPoints = [];
		this.bezierPoints = [];
	}

	private renderLine() {
		const tmp = [];
		const len = this.pointsLine.getLength();
		let tempSpacing = Mix(2, 2, Clamp(2 / len, 0, 1));
		let d = this.lastDot;
		for (; d <= len; d += tempSpacing) {
			tempSpacing = Mix(2, 2, Clamp(2 / len, 0, 1));
			const point = this.pointsLine.getAtDist(d);
			tmp.push(point);
			if (this.brush?.drawDot) {
				this.brush.drawDot(point);
			}
		}
		this.lastDot = d - len;
	}
}
