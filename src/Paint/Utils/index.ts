export const Mix = (a: number, b: number, f: number): number => {
    return a * (1 - f) + b * f;
}
export const Clamp = (num: number, min: number, max: number): number => {
    return num < min ? min : num > max ? max : num;
}