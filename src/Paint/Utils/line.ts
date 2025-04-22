import { Vec2D, type DirPoint } from "../types";

export const genBezierPoints = (startPoint: DirPoint, endPoint: DirPoint, resolution: number = 20): Vec2D[] => {
	const [controlPoint1, controlPoint2] = [
		Vec2D.Add(startPoint, Vec2D.Mul(startPoint.dir, Vec2D.Distance(startPoint, endPoint) / 4)),
		Vec2D.Sub(endPoint, Vec2D.Mul(endPoint.dir, Vec2D.Distance(startPoint, endPoint) / 4)),
	];
	const curvePoints = [];
	const step = 1 / resolution;
	for (let i = 0; i <= 1 + step; i += step) {
		curvePoints.push({
			x:
				Math.pow(1 - i, 3) * startPoint.x +
				3 * Math.pow(1 - i, 2) * i * controlPoint1.x +
				3 * (1 - i) * Math.pow(i, 2) * controlPoint2.x +
				Math.pow(i, 3) * endPoint.x,
			y:
				Math.pow(1 - i, 3) * startPoint.y +
				3 * Math.pow(1 - i, 2) * i * controlPoint1.y +
				3 * (1 - i) * Math.pow(i, 2) * controlPoint2.y +
				Math.pow(i, 3) * endPoint.y,
		});
	}
	return curvePoints;
};
