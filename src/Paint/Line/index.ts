import type { Brush } from "../Brushes";
import { Pen } from "../Brushes/Pen";
import type { DirPoint } from "../../Types";
import { Vec2D } from "../../Types/vec2d";
import { Clamp, deepClone, easeOutDecay, Mix } from "../Utils";
import { genBezierPoints } from "../Utils/line";
import { PointsLine } from "./PointsLine";

export class Line {
	private lastDot: number = 0;
	private originPoints: DirPoint[] = [];
	private lastPoint: Vec2D = { x: 0, y: 0 };
	private bezierPoints: Vec2D[] = [];

	public pointsLine: PointsLine;

	constructor(
		private pathCtx: CanvasRenderingContext2D,
		private brush: Brush,
	) {
		if (!brush) {
			this.brush = new Pen(this.pathCtx, 2, 2, "black");
		}
		this.pointsLine = new PointsLine();
	}

	public startLine(point: Vec2D) {
		this.originPoints.push({
			x: point.x,
			y: point.y,
			dir: { x: 0, y: 0 },
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
			dir: { x: 0, y: 0 },
		});

		if (this.originPoints.length === 1) {
			return;
		} else if (this.originPoints.length === 2) {
			this.lastDot = 0;
			this.originPoints[0]!.dir = Vec2D.Normalize(Vec2D.Sub(this.originPoints[1]!, this.originPoints[0]!));
			return;
		}
		const pointM3 = this.originPoints[this.originPoints.length - 3];
		const pointM2 = this.originPoints[this.originPoints.length - 2];
		const pointM1 = this.originPoints[this.originPoints.length - 1];
		pointM2.dir = Vec2D.Normalize(Vec2D.Sub(pointM1, pointM3));
		if (isNaN(pointM2.dir.x) || isNaN(pointM2.dir.y)) {
			//when xy -3 == -1
			pointM2.dir = deepClone(pointM3.dir);
		}
		this.bezierPoints = genBezierPoints(
			this.originPoints[this.originPoints.length - 3],
			this.originPoints[this.originPoints.length - 2],
			20,
		);

		this.pointsLine.addPoints(this.bezierPoints);
		this.renderLine();
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
		const size = easeOutDecay(this.brush.size) / 16;
		const len = this.pointsLine.getLength();
		let tempSpacing = Mix(size, size, Clamp(this.lastDot / len, 0, 1));
		let d = this.lastDot;
		for (; d <= len; d += tempSpacing) {
			tempSpacing = Mix(size, size, Clamp(d / len, 0, 1));
			const point = this.pointsLine.getAtDist(d);
			if (this.brush?.drawDot) {
				this.brush.drawDot(point);
			}
		}
		this.lastDot = d - len;
	}
}
