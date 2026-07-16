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
