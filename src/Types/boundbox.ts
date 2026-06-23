export interface BoundBox {
	top: number;
	bottom: number;
	left: number;
	right: number;
}
export class BoundBox {
	static readonly Empty: BoundBox = { top: 0, bottom: 0, left: 0, right: 0 };
}
