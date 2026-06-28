import { BoundBox } from "./boundbox";

export interface ClipedArea {
	boundBox: BoundBox;
	imageData: ImageData;
}
export class ClipedArea {
	static readonly Empty: ClipedArea = {
		boundBox: { top: Infinity, bottom: 0, left: Infinity, right: 0 },
		imageData: new ImageData(1, 1),
	};
}
