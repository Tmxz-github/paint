import { type Vec2d } from "./types";

export class Path {
	constructor(
		public pathCtx: CanvasRenderingContext2D,
		private points: Vec2d[] = []
	) {}

	private setStyle() {
		this.pathCtx.strokeStyle = "black";
		this.pathCtx.lineWidth = 8;
		this.pathCtx.lineCap = "round";
	}

	render(curPos: Vec2d) {
		this.points.push(curPos);
		if (this.points.length < 3) return;
		const startPoint = {
			x:
				(this.points[this.points.length - 3]!.x +
					this.points[this.points.length - 2]!.x) /
				2,
			y:
				(this.points[this.points.length - 3]!.y +
					this.points[this.points.length - 2]!.y) /
				2,
		};
		const endPoint = {
			x:
				(this.points[this.points.length - 1]!.x +
					this.points[this.points.length - 2]!.x) /
				2,
			y:
				(this.points[this.points.length - 1]!.y +
					this.points[this.points.length - 2]!.y) /
				2,
		};

		this.setStyle();

		const controlPoint = this.points[this.points.length - 2]!;
		this.pathCtx.beginPath();
		this.pathCtx.moveTo(startPoint.x, startPoint.y);
		this.pathCtx.quadraticCurveTo(
			controlPoint.x,
			controlPoint.y,
			endPoint.x,
			endPoint.y
		);
		this.pathCtx.stroke();
	}

	clear() {
		this.points = [];
	}
}
