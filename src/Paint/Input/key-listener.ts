interface KeyState {
	control: boolean;
	alt: boolean;
	shift: boolean;
}
class KeyState {
	control: boolean = false;
	alt: boolean = false;
	shift: boolean = false;
}

type singleChar =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z"
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"
	| "G"
	| "H"
	| "I"
	| "J"
	| "K"
	| "L"
	| "M"
	| "N"
	| "O"
	| "P"
	| "Q"
	| "R"
	| "S"
	| "T"
	| "U"
	| "V"
	| "W"
	| "X"
	| "Y"
	| "Z"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "0"
	| "Enter"
	| "Escape"
	| "Backspace"
	| "Tab"
	| " "
	| "ArrowUp"
	| "ArrowDown"
	| "ArrowLeft"
	| "ArrowRight"
	| "CapsLock"
	| "PageUp"
	| "PageDown"
	| "End"
	| "Home"
	| "Insert"
	| "Delete"
	| ";"
	| "'"
	| ","
	| "."
	| "/"
	| "["
	| "]"
	| "\\"
	| "-"
	| "="
	| "`"
	| "!"
	| "@"
	| "#"
	| "$"
	| "%"
	| "^"
	| "&"
	| "*"
	| "("
	| ")"
	| "_"
	| "+"
	| "{"
	| "}"
	| "|"
	| ":"
	| "<"
	| ">"
	| "?"
	| "~";

type downUp = "down" | "up";

type KeyboardKey = `${singleChar}:${downUp}`;

interface afterControl {
	alt: {
		(): afterControlAlt & returnOn;
	};
	shift: {
		(): afterControlShift & returnOn;
	};
}

interface afterAlt {
	control: {
		(): afterControlAlt & returnOn;
	};
	shift: {
		(): afterAltShift & returnOn;
	};
}

interface afterShift {
	control: {
		(): afterControlShift & returnOn;
	};
	alt: {
		(): afterAltShift & returnOn;
	};
}

interface afterControlAlt {
	shift: {
		(): returnOn;
	};
}

interface afterControlShift {
	alt: {
		(): returnOn;
	};
}

interface afterAltShift {
	control: {
		(): returnOn;
	};
}

interface returnOn {
	on: (key: KeyboardKey, cb: () => void, env?: object) => void;
}

export class KeyListener {
	constructor(private element: HTMLElement) {
		this.element.addEventListener("keydown", (e) => {
			e.preventDefault();
			this.emit(e.ctrlKey, e.altKey, e.shiftKey, e.key + ":down");
		});
		this.element.addEventListener("keyup", (e) => {
			e.preventDefault();
			this.emit(e.ctrlKey, e.altKey, e.shiftKey, e.key + ":up");
		});
	}

	private evs: Map<string, Function[]> = new Map();

	private curKeyState: KeyState = new KeyState();

	private genEvKey(state: KeyState, keyCode?: string) {
		let key = "";
		for (const k of Object.keys(state)) {
			if (state[k as keyof KeyState]) {
				key += k;
				key += "+";
			}
		}
		if (keyCode) {
			key += keyCode;
		} else {
			key = key.slice(0, key.length - 1);
		}
		return key;
	}
	private fnKeyHandler(key: keyof KeyState) {
		this.curKeyState[key] = true;
	}
	private keyHandler(key?: string, cb?: () => void) {
		if (cb) {
			const evKey = this.genEvKey(this.curKeyState, key);
			let cbs = this.evs.get(evKey);
			if (!cbs) {
				cbs = [];
				this.evs.set(evKey, cbs);
			}
			cbs.push(cb);
			this.curKeyState = new KeyState();
		}
	}

	control(): returnOn & afterControl {
		const outEnv = this;
		const on = outEnv.on.bind(outEnv);
		outEnv.fnKeyHandler("control");
		function alt(): returnOn & afterControlAlt {
			const on = outEnv.on.bind(outEnv);
			outEnv.fnKeyHandler("alt");
			function shift(): returnOn {
				outEnv.fnKeyHandler("shift");
				return {
					on,
				};
			}
			return {
				on,
				shift,
			};
		}

		function shift(): returnOn & afterControlShift {
			const on = outEnv.on.bind(outEnv);
			outEnv.fnKeyHandler("shift");
			function alt(): returnOn {
				outEnv.fnKeyHandler("alt");
				return {
					on,
				};
			}
			return {
				on,
				alt,
			};
		}
		return { on, alt, shift };
	}

	alt(): returnOn & afterAlt {
		const outEnv = this;
		const on = outEnv.on.bind(outEnv);
		outEnv.fnKeyHandler("alt");
		function control(): returnOn & afterControlAlt {
			const on = outEnv.on.bind(outEnv);
			outEnv.fnKeyHandler("control");
			function shift(): returnOn {
				outEnv.fnKeyHandler("shift");
				return {
					on,
				};
			}
			return {
				on,
				shift,
			};
		}

		function shift(): returnOn & afterAltShift {
			const on = outEnv.on.bind(outEnv);
			outEnv.fnKeyHandler("shift");
			function control(): returnOn {
				outEnv.fnKeyHandler("control");
				return {
					on,
				};
			}
			return {
				on,
				control,
			};
		}
		return { on, control, shift };
	}

	shift(): returnOn & afterShift {
		const outEnv = this;
		const on = outEnv.on.bind(outEnv);
		outEnv.fnKeyHandler("shift");
		function control(): returnOn & afterControlShift {
			const on = outEnv.on.bind(outEnv);
			outEnv.fnKeyHandler("control");
			function alt(): returnOn {
				outEnv.fnKeyHandler("alt");
				return {
					on,
				};
			}
			return {
				on,
				alt,
			};
		}

		function alt(): returnOn & afterAltShift {
			const on = outEnv.on.bind(outEnv);
			outEnv.fnKeyHandler("alt");
			function control(): returnOn {
				outEnv.fnKeyHandler("control");
				return {
					on,
				};
			}
			return {
				on,
				control,
			};
		}
		return { on, control, alt };
	}

	on(key: KeyboardKey, cb: () => void, env?: object) {
		key = key.toLowerCase() as KeyboardKey;
		this.keyHandler(key, env ? cb.bind(env) : cb);
	}

	offAll(key: KeyboardKey) {
		key = key.toLowerCase() as KeyboardKey;
		this.evs.delete(key);
	}

	off(key: KeyboardKey, cb: Function) {
		key = key.toLowerCase() as KeyboardKey;
		const cbs = this.evs.get(key) || [];
		let i = cbs.findIndex((f) => f === cb);
		if (i < 0) return;
		cbs.splice(i, 1);
	}

	emit(control: boolean, alt: boolean, shift: boolean, key?: string) {
		key = key?.toLowerCase();
		const k = this.genEvKey({ control, alt, shift }, key);
		const cbs = this.evs.get(k) || [];
		for (const cb of cbs) {
			cb();
		}
	}
}
