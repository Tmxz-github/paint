import { Vec2D } from "./types";

interface pathStyle {
	color: string;
	lineWidth: number;
	lineCap: "butt" | "round" | "square";
}
export class Path {
	constructor(
		public pathCtx: CanvasRenderingContext2D,
		private points: Vec2D[] = [],
		public downPos: Vec2D = new Vec2D(),
		public style: pathStyle = {
			color: "black",
			lineWidth: 4,
			lineCap: "round",
		}
	) {}

	single = false;
	render(curPos: Vec2D) {
		this.points.push(curPos);

		this.pathCtx.save();
		this.pathCtx.strokeStyle = this.style.color || this.pathCtx.strokeStyle;
		this.pathCtx.lineWidth = this.style.lineWidth || this.pathCtx.lineWidth;
		this.pathCtx.lineCap = this.style.lineCap || this.pathCtx.lineCap;

		if (this.points.length === 1) {
			const p = this.points[0]!;
			this.pathCtx.beginPath();
			this.pathCtx.arc(p.x, p.y, this.pathCtx.lineWidth / 2, 0, Math.PI * 2);
			this.pathCtx.moveTo(p.x, p.y);
			this.pathCtx.fill();
			return;
		}
		const p3 = this.points[this.points.length - 1]!;
		const p2 = this.points[this.points.length - 2]!;
		const p1 = this.points[this.points.length - 3] || p3; // 当前点
		const p0 = this.points[this.points.length - 4] || p2; // 上一个点

		const distance2 = Math.pow(p1.x - this.downPos.x, 2) + Math.pow(p1.y - this.downPos.y, 2);
		if (distance2 < this.pathCtx.lineWidth) {
			return;
		}
		if (distance2 <= Math.min(Math.pow(this.pathCtx.lineWidth, 2), 16)) {
			this.pathCtx.beginPath();
			this.pathCtx.arc(p1.x, p1.y, this.pathCtx.lineWidth / 2, 0, Math.PI * 2);
			this.pathCtx.fill();
			this.downPos = p1;
			return;
		}

		this.pathCtx.beginPath();
		this.pathCtx.moveTo(p0.x, p0.y);

		for (let step = 0; step < 1; step += 0.1) {
			const x =
				0.5 *
				(2 * p1.x +
					(-p0.x + p2.x) * step +
					(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * step * step +
					(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * step * step * step);
			const y =
				0.5 *
				(2 * p1.y +
					(-p0.y + p2.y) * step +
					(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * step * step +
					(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * step * step * step);
			this.pathCtx.lineTo(x, y);
			this.pathCtx.stroke();
		}

		this.pathCtx.restore();
	}

	/** 处理光标跨过画布边缘时的情况 */
	renderToEdge(prePos: Vec2D, curPos: Vec2D, fromOut: boolean) {
		this.pathCtx.save();
		this.pathCtx.strokeStyle = this.style.color || this.pathCtx.strokeStyle;
		this.pathCtx.lineWidth = this.style.lineWidth || this.pathCtx.lineWidth;
		this.pathCtx.lineCap = this.style.lineCap || this.pathCtx.lineCap;
		this.pathCtx.beginPath();
		if (fromOut) {
			const edgePoint: Vec2D = this.getEdgePoint(prePos);
			const controlPoint = {
				x: (curPos.x + edgePoint.x) / 2,
				y: (curPos.y + edgePoint.y) / 2,
			};

			this.pathCtx.moveTo(edgePoint.x, edgePoint.y);
			this.pathCtx.quadraticCurveTo(controlPoint.x, controlPoint.y, curPos.x, curPos.y);
			this.points.push(edgePoint);
			this.points.push(curPos);
			this.pathCtx.stroke();
		} else {
			const edgePoint: Vec2D = this.getEdgePoint(curPos);
			const lastPoint = this.points[this.points.length - 1];
			if (!lastPoint) return;

			this.pathCtx.quadraticCurveTo(lastPoint.x, lastPoint.y, edgePoint.x, edgePoint.y);
			this.pathCtx.stroke();
		}

		this.pathCtx.save();
	}

	/** 光标跨过边缘时与边缘的交点 */
	getEdgePoint(prePos: Vec2D): Vec2D {
		const edgePoint: Vec2D = new Vec2D();
		if (prePos.x > 0 && prePos.x < this.pathCtx.canvas.width && prePos.y < 0) {
			edgePoint.x = prePos.x;
			edgePoint.y = 0;
		}
		if (prePos.x > 0 && prePos.x < this.pathCtx.canvas.width && prePos.y > this.pathCtx.canvas.height) {
			edgePoint.x = prePos.x;
			edgePoint.y = this.pathCtx.canvas.height;
		} // 上下

		if (prePos.x < 0 && prePos.y < 0) {
			edgePoint.x = 0;
			edgePoint.y = 0;
		}
		if (prePos.x < 0 && prePos.y > this.pathCtx.canvas.height) {
			edgePoint.x = 0;
			edgePoint.y = this.pathCtx.canvas.height;
		} // 左上/左下

		if (prePos.x > this.pathCtx.canvas.width && prePos.y < 0) {
			edgePoint.x = this.pathCtx.canvas.width;
			edgePoint.y = 0;
		}
		if (prePos.x > this.pathCtx.canvas.width && prePos.y > this.pathCtx.canvas.height) {
			edgePoint.x = this.pathCtx.canvas.width;
			edgePoint.y = this.pathCtx.canvas.height;
		} // 右上/右下

		if (prePos.x < 0 && prePos.y > 0 && prePos.y < this.pathCtx.canvas.height) {
			edgePoint.x = 0;
			edgePoint.y = prePos.y;
		}
		if (prePos.x > this.pathCtx.canvas.width && prePos.y > 0 && prePos.y < this.pathCtx.canvas.height) {
			edgePoint.x = this.pathCtx.canvas.width;
			edgePoint.y = prePos.y;
		} // 左右

		return edgePoint;
	}

	clear() {
		this.points = [];
	}
}
