import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')




// 能生成点线？

// this.points.push({ x: e.offsetX, y: e.offsetY });
// if (this.points.length < 3 || this.points.length % 2 !== 0) return;
// const startPoint = {
//     x: (this.points[this.points.length - 3]!.x + this.points[this.points.length - 2]!.x) / 2,
//     y: (this.points[this.points.length - 3]!.y + this.points[this.points.length - 2]!.y) / 2
// };
// const endPoint = {
//     x: (this.points[this.points.length - 1]!.x + this.points[this.points.length - 2]!.x) / 2,
//     y: (this.points[this.points.length - 1]!.y + this.points[this.points.length - 2]!.y) / 2
// };
// const controlPoint = this.points[this.points.length - 2]!;
// this.mirrorCtx.beginPath();
// this.mirrorCtx.moveTo(startPoint.x, startPoint.y);
// this.mirrorCtx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
// this.mirrorCtx.stroke();