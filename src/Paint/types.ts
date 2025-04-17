export interface Vec2D {
	x: number;
	y: number;
}

export class Vec2D {
	x = 0;
	y = 0;

	/** a + b */
	static Add(a: Vec2D, b: Vec2D) {
		return {
			x: a.x + b.x,
			y: a.y + b.y,
		};
	}

	/** a - b */
	static Sub(a: Vec2D, b: Vec2D) {
		return {
			x: a.x - b.x,
			y: a.y - b.y,
		};
	}

	static Mul(a: Vec2D, b: number) {
		return {
			x: a.x * b,
			y: a.y * b,
		};
	}

	static Dot(a: Vec2D, b: Vec2D) {
		return a.x * b.x + a.y * b.y;
	}

	/** sqrt(a.x ** 2 + a.y ** 2) */
	static Len(a: Vec2D) {
		return Math.sqrt(a.x ** 2 + a.y ** 2);
	}

	/** .x ** 2 + a.y ** 2 */
	static Len2(a: Vec2D) {
		return a.x ** 2 + a.y ** 2;
	}

	static Normalize(a: Vec2D) {
		const len = Math.sqrt(a.x ** 2 + a.y ** 2);
		return { x: a.x / len, y: a.y / len };
	}
}
