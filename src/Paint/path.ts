import { Vec2d } from "./types";

interface pathStyle {
	color: string;
	lineWidth: number;
	lineCap: "butt" | "round" | "square";
}
export class Path {
	constructor(public pathCtx: CanvasRenderingContext2D, private points: Vec2d[] = []) {
		this.pathCtx.strokeStyle = "black";
		this.pathCtx.lineWidth = 4;
		this.pathCtx.lineCap = "round";
	}

	render(curPos: Vec2d, style?: pathStyle) {
		this.points.push(curPos);
		if (this.points.length < 3) return;
		const startPoint = {
			x: (this.points[this.points.length - 3]!.x + this.points[this.points.length - 2]!.x) / 2,
			y: (this.points[this.points.length - 3]!.y + this.points[this.points.length - 2]!.y) / 2,
		};
		const endPoint = {
			x: (this.points[this.points.length - 1]!.x + this.points[this.points.length - 2]!.x) / 2,
			y: (this.points[this.points.length - 1]!.y + this.points[this.points.length - 2]!.y) / 2,
		};

		this.pathCtx.save();
		if (style) {
			this.pathCtx.strokeStyle = style?.color || this.pathCtx.strokeStyle;
			this.pathCtx.lineWidth = style?.lineWidth || this.pathCtx.lineWidth;
			this.pathCtx.lineCap = style?.lineCap || this.pathCtx.lineCap;
		}

		const controlPoint = this.points[this.points.length - 2]!;
		this.pathCtx.moveTo(startPoint.x, startPoint.y);
		this.pathCtx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
		this.pathCtx.stroke();

		this.pathCtx.restore();
		this.points.shift();
	}

	/** 处理光标跨过画布边缘时的情况 */
	renderToEdge(prePos:Vec2d, curPos:Vec2d,fromOut: boolean) {
		if (fromOut) {
			const edgePoint: Vec2d = this.getEdgePoint(prePos);
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
			const edgePoint: Vec2d = this.getEdgePoint(curPos);
			const lastPoint = this.points[this.points.length - 1];
			if (!lastPoint) return;

			this.pathCtx.quadraticCurveTo(lastPoint.x, lastPoint.y, edgePoint.x, edgePoint.y);
			this.pathCtx.stroke();
		}
	}

	/** 光标跨过边缘时与边缘的交点 */
	getEdgePoint(prePos: Vec2d): Vec2d {
		const edgePoint: Vec2d = new Vec2d();
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
