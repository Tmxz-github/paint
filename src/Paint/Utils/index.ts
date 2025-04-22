export const Mix = (a: number, b: number, f: number): number => {
	return a * (1 - f) + b * f;
};
export const Clamp = (num: number, min: number, max: number): number => {
	return num < min ? min : num > max ? max : num;
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
export const createMirror = <ENV extends Record<string, any>, R extends object>(env: ENV, mirrorProps:string[]): R => {
	return new Proxy(
		{} as R,
		{
			get(_, prop: string) {
				let middleValue = env;
				for (const prop of mirrorProps) {
					middleValue = middleValue[prop]
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
					middleValue = middleValue[prop]
				}
				const mirror = middleValue as Record<string, any>;
				mirror[prop] = value;
				return true;
			},
		}
	);
};
