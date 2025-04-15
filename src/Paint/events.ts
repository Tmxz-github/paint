interface keyState {
	control: boolean;
	alt: boolean;
	shift: boolean;
}

interface afterControl {
	alt: {
		(key: string, cb: () => void): void;
		(): afterControlAlt;
	};
	shift: {
		(key: string, cb: () => void): void;
		(): afterControlShift;
	};
}

interface afterAlt {
	control: {
		(key: string, cb: () => void): void;
		(): afterControlAlt;
	};
	shift: {
		(key: string, cb: () => void): void;
		(): afterAltShift;
	};
}

interface afterShift {
	control: {
		(key: string, cb: () => void): void;
		(): afterControlShift;
	};
	alt: {
		(key: string, cb: () => void): void;
		(): afterAltShift;
	};
}

interface afterControlAlt {
	shift: {
		(key: string, cb: () => void): void;
		(): void;
	};
}

interface afterControlShift {
	alt: {
		(key: string, cb: () => void): void;
		(): void;
	};
}

interface afterAltShift {
	control: {
		(key: string, cb: () => void): void;
		(): void;
	};
}

class FuncKey {
	public curKeyState: keyState = {
		control: false,
		alt: false,
		shift: false,
	};

	private controlHanlder(key?: string, cb?: () => void) {
		console.log(key, "control");
		this.curKeyState.control = true;
		if (cb) cb();
	}
	private altHandler(key?: string, cb?: () => void) {
		console.log(key, "alt");
		this.curKeyState.alt = true;
		if (cb) cb();
	}
	private shiftHandler(key?: string, cb?: () => void) {
		console.log(key, "shift");
		this.curKeyState.shift = true;
		if (cb) cb();
	}

	control(): afterControl;
	control(key: string, cb?: () => void): void;
	control(key?: string, cb?: () => void): afterControl | void {
		const outEnv = this;
		function alt(key: string, cb?: () => void): void;
		function alt(): afterControlAlt;
		function alt(key?: string, cb?: () => void): afterControlAlt | void {
			function shift(key?: string, cb?: () => void): void {
				outEnv.shiftHandler(key, cb);
			}
			outEnv.altHandler(key, cb);
			if (key) return;
			return {
				shift,
			};
		}

		function shift(key: string, cb?: () => void): void;
		function shift(): afterControlShift;
		function shift(key?: string, cb?: () => void): afterControlShift | void {
			outEnv.shiftHandler(key);
			function alt(key?: string, cb?: () => void): void {
				outEnv.altHandler(key);
			}
			if (key) return;
			return {
				alt,
			};
		}
		this.controlHanlder(key);
		if (key) {
			return;
		}
		return { alt, shift };
	}

	alt(): afterAlt;
	alt(key: string, cb?: () => void): void;
	alt(key?: string, cb?: () => void): afterAlt | void {
		const outEnv = this;
		function control(key: string, cb?: () => void): void;
		function control(): afterControlAlt;
		function control(key?: string, cb?: () => void): afterControlAlt | void {
			function shift(key?: string, cb?: () => void): void {
				outEnv.shiftHandler(key, cb);
			}
			outEnv.altHandler(key, cb);
			if (key) return;
			return {
				shift,
			};
		}

		function shift(): afterAltShift;
		function shift(key: string): void;
		function shift(key?: string, cb?: () => void): afterAltShift | void {
			function control(key?: string, cb?: () => void): void {
				outEnv.controlHanlder(key, cb);
			}
			if (key) return;
			return {
				control,
			};
		}
		this.altHandler(key, cb);
		if (key) {
			return;
		}
		return { control, shift };
	}

	shift(): afterShift;
	shift(key: string, cb?: () => void): void;
	shift(key?: string, cb?: () => void): afterShift | void {
		const outEnv = this;
		function control(key: string, cb?: () => void): void;
		function control(): afterControlShift;
		function control(key?: string, cb?: () => void): afterControlShift | void {
			function alt(key?: string, cb?: () => void): void {
				outEnv.shiftHandler(key, cb);
			}
			outEnv.altHandler(key, cb);
			if (key) return;
			return {
				alt,
			};
		}

		function alt(key: string, cb?: () => void): void;
		function alt(): afterAltShift;
		function alt(key?: string, cb?: () => void): afterAltShift | void {
			function control(key?: string, cb?: () => void): void {
				outEnv.controlHanlder(key, cb);
			}
			if (key) return;
			return {
				control,
			};
		}
		this.altHandler(key, cb);
		if (key) {
			return;
		}
		return { control, alt };
	}
}

export const funcKey = new FuncKey();
