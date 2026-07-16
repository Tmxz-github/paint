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
	const k = 0.03;
	return endY + (startY - endY) * Math.exp(-k * x);
};
