import type { PaintMode } from "../../Mode";
import type { Paint } from "../..";
import { LassoBrush } from "./LassoBrush";
import type { MyPointerEvent } from "../../Input/pointer-listener";
import { Vec2D } from "../../types";
import { deepClone } from "../../Utils";
import type { Lasso } from ".";

export class ClipMode implements PaintMode {
    constructor(private ctx: Paint, env:Lasso) {}

    onPointerMove({ e, pos }: MyPointerEvent) {
        if (this.ctx.canDraw && this.ctx.state === "CLIP") {
            this.ctx.brush.drawDot(this.ctx.cursor.curPos);
            return;
        }

        if (this.ctx.canDraw && this.ctx.state === "CLIPPING") {
            if (this.ctx.inBBox(this.ctx.cursor.curPos, (this.ctx.brush as LassoBrush).boundBox)) {
                const boundBox = (this.ctx.brush as LassoBrush).boundBox;
                if (this.ctx.clipStarted) {
                    this.ctx.currentLayer.vCtx.clearRect(
                        boundBox.left,
                        boundBox.top,
                        boundBox.right - boundBox.left,
                        boundBox.bottom - boundBox.top
                    );
                }
                const offset = Vec2D.Sub(pos, this.ctx.clipGrabStartPos);

                offset.x /= this.ctx.scaleValue;
                offset.y /= this.ctx.scaleValue;

                (this.ctx.brush as LassoBrush).startPoint = Vec2D.Add((this.ctx.brush as LassoBrush).startPoint, offset);

                const lassoCtx = this.ctx.backLayers[0].vCtx;
                lassoCtx.clearRect(boundBox.left, boundBox.top, boundBox.right - boundBox.left, boundBox.bottom - boundBox.top);
                this.ctx.brush.drawDot(Vec2D.Add((this.ctx.brush as LassoBrush).preEndpoint, offset));
                this.ctx.grabContent((this.ctx.brush as LassoBrush).boundBox);

                this.ctx.clipGrabStartPos = pos;

                this.ctx.clipStarted = false;
            }
            return;
        }
    }
    onPointerDown({ pos }: MyPointerEvent) {
        if (this.ctx.state === "CLIP") {
            (this.ctx.brush as LassoBrush).startPoint = deepClone(this.ctx.cursor.curPos);
        }
        if (this.ctx.state === "CLIPPING") {
            this.ctx.clipGrabStartPos = pos;
        }
    }
    onPointerUp(ev: MyPointerEvent) {
        if (this.ctx.state === "CLIP") {
            (this.ctx.brush as LassoBrush).drawDot(this.ctx.cursor.curPos);
        }
        if (this.ctx.state === "CLIPPING") {
            (this.ctx.brush as LassoBrush).drawDot(undefined, false);
        }
    }
    onPointerLeave(ev: MyPointerEvent) {
    }
    onPointerEnter(ev: MyPointerEvent){}
    onWheel(ev: MyPointerEvent){}
}
