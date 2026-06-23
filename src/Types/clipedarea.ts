import { BoundBox } from "./boundbox";

export interface ClipedArea {
	boundBox: BoundBox;
	imageData: ImageData;
}
export class ClipedArea {
	static readonly Empty: ClipedArea = {
		boundBox: { top: 0, bottom: 0, left: 0, right: 0 },
		imageData: new ImageData(1, 1),
	};
}
