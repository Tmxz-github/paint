/** a * (1 - f) + b * f  */
export const Mix = (a: number, b: number, f: number): number => {
	return a * (1 - f) + b * f;
};

/** 将数字限制在 [min, max] 中 */
export const Clamp = (num: number, min: number, max: number): number => {
	return num < min ? min : num > max ? max : num;
};

export const CircleClamp = (num: number, min: number, max: number): number => {
	const range = max - min;
	return ((((num - min) % range) + range) % range) + min;
};

export const easeOutDecay = (x: number): number => {
	const startY = 32;
	const endY = 4;
	const k = 0.03; // 控制下降快慢的系数，值越小越慢
	return endY + (startY - endY) * Math.exp(-k * x);
};

/**
 * 获取一个镜像，镜像上的操作会作用与 env[...mirrorProps]
 *
 * 例如 this.mirrorCtx = createMirror<typeof this, CanvasRenderingContext2D>(this, ["currentLayer", "vCtx"]);
 *
 * mirrorCtx 上的每一次操作都会找到当前的 this.currentLayer.vCtx，然后作用于上面
 *
 * @param env 环境
 * @param mirrorProps 属性名数组
 * @returns 最终获得的属性类型
 */
export const createMirror = <ENV extends Record<string, any>, R extends object>(env: ENV, mirrorProps: string[]): R => {
	return new Proxy({} as R, {
		get(_, prop: string) {
			let middleValue = env;
			for (const prop of mirrorProps) {
				middleValue = middleValue[prop];
			}
			const mirror = middleValue as Record<string, any>;
			const value = mirror[prop];
			if (typeof value === "function") {
				return (...args: any[]) => {
					return (value as Function).apply(mirror, args);
				};
			} else {
				return value;
			}
		},
		set(_, prop: string, value: any) {
			let middleValue = env;
			for (const prop of mirrorProps) {
				middleValue = middleValue[prop];
			}
			const mirror = middleValue as Record<string, any>;
			mirror[prop] = value;
			return true;
		},
	});
};

export const deepClone = <T>(obj: T): T => {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime()) as T;
	}

	if (obj instanceof RegExp) {
		return new RegExp(obj.source, obj.flags) as T;
	}

	if (Array.isArray(obj)) {
		return obj.map(deepClone) as unknown as T;
	}

	const cloned: any = {};
	for (const key of Object.keys(obj)) {
		cloned[key] = deepClone((obj as any)[key]);
	}

	const symbols = Object.getOwnPropertySymbols(obj);
	for (const sym of symbols) {
		cloned[sym] = deepClone((obj as any)[sym]);
	}

	return cloned;
};
