import type { DirPoint, Vec2D } from "../Types";

/**
 * MouseTrajectory - 鼠标轨迹数据
 *
 * 记录每次绘制操作中鼠标的原始轨迹点和经过贝塞尔插值后的平滑轨迹点，
 * 供 Brush / Lasso / 外部插件等模块读取使用。
 *
 * 生命周期：startLine() → 不断追加 point → endLine() 后保留完整轨迹，
 * 外部调用方读取完毕后应手动调用 clear() 释放。
 */
export class MouseTrajectory {
	private _rawPoints: DirPoint[] = [];
	private _smoothedPoints: Vec2D[] = [];

	/** 原始输入点（含方向信息） */
	get rawPoints(): readonly DirPoint[] {
		return this._rawPoints;
	}

	/** 经贝塞尔插值后的平滑点序列 */
	get smoothedPoints(): readonly Vec2D[] {
		return this._smoothedPoints;
	}

	/** 清空轨迹数据（新一笔绘制前调用） */
	clear(): void {
		this._rawPoints = [];
		this._smoothedPoints = [];
	}

	/** 追加一个原始输入点 */
	addRawPoint(point: DirPoint): void {
		this._rawPoints.push(point);
	}

	/** 追加一段贝塞尔插值后的平滑点 */
	addSmoothedPoints(points: Vec2D[]): void {
		for (const p of points) {
			this._smoothedPoints.push(p);
		}
	}
}
