import { Pen } from "../Brushes/Pen";
import type { DirPoint } from "../Types";
import { BoundBox, Vec2D } from "../Types";
import { Clamp, deepClone, easeOutDecay, Mix } from "../Utils";
import { genBezierPoints } from "../Utils/line";
import { PointsLine } from "./PointsLine";
import type { BaseBrush } from "../Brushes";
import type { MouseTrajectory } from "../MouseTrajectory";

export class Line {
	private lastDot: number = 0;
	private originPoints: DirPoint[] = [];
	private lastPoint: Vec2D = Vec2D.Zero;
	private bezierPoints: Vec2D[] = [];
	private _currentDirtyRect: BoundBox | null = null;
	private readonly _onDirty?: (rect: BoundBox) => void;
	private readonly _mouseTrajectory?: MouseTrajectory;

	public pointsLine: PointsLine;

	constructor(
		private brush: BaseBrush,
		onDirty?: (rect: BoundBox) => void,
		mouseTrajectory?: MouseTrajectory,
	) {
		this._onDirty = onDirty;
		this._mouseTrajectory = mouseTrajectory;
		this.pointsLine = new PointsLine();
	}

	public startLine(point: Vec2D) {
		// 新一笔开始时清空上一笔的轨迹数据
		this._mouseTrajectory?.clear();

		this.originPoints.push({
			x: point.x,
			y: point.y,
			dir: Vec2D.Zero,
		});
		this._mouseTrajectory?.addRawPoint(this.originPoints[this.originPoints.length - 1]);
		this.brush.drawDot(point);
	}

	public lineTo(curPoint: Vec2D) {
		if (Vec2D.Equal(this.lastPoint, curPoint)) {
			return [];
		}
		this.lastPoint = curPoint;
		const newPoint: DirPoint = {
			x: curPoint.x,
			y: curPoint.y,
			dir: Vec2D.Zero,
		};
		this.originPoints.push(newPoint);
		this._mouseTrajectory?.addRawPoint(newPoint);

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

		// 将插值后的平滑点写入外部轨迹数据
		this._mouseTrajectory?.addSmoothedPoints(this.bezierPoints);

		// 计算当前 Bezier 段的脏区：从采样点计算包围盒，向外膨胀笔刷半径
		const segmentBBox = BoundBox.inflate(
			BoundBox.fromPoints(this.bezierPoints),
			this.brush.size * 1.5, // 膨胀笔刷半径的 1.5 倍确保覆盖圆形笔触
		);
		this._currentDirtyRect = segmentBBox;
		if (this._onDirty) {
			this._onDirty(segmentBBox);
		}

		this.pointsLine.addPoints(this.bezierPoints);
		this.renderLine();
	}

	public endLine() {
		if (this.originPoints.length < 2) {
			this.originPoints = [];
			this.bezierPoints = [];
			return;
		}
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

	/** 返回最近一次 lineTo 计算的脏区 */
	getCurrentDirtyRect(): BoundBox | null {
		return this._currentDirtyRect;
	}
}
