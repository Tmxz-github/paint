<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Paint } from "./Paint";
import { Eraser } from "./Paint/DefaultPlugins/Eraser";
import { Lasso } from "./Paint/DefaultPlugins/Lasso";

const canvas = ref<HTMLDivElement>();
const paint = ref<Paint>();

onMounted(() => {
	canvas.value = document.querySelector<HTMLDivElement>("#canvas") || undefined;
	if (!canvas.value) {
		return;
	}
	paint.value = new Paint({
		containerEl: canvas.value,
		width: 1024,
		use: [new Eraser, new Lasso]
	});
	paint.value.pointerListener.on("MOVE", () => {
		const div = document.querySelector("#pos")!;
		div.innerHTML = `${paint.value?.cursor.curPos.x}:::${paint.value?.cursor.curPos.y}`;
	})
});

const setLayer = (i: number) => {
	if (!paint.value) return;
	const layer = paint.value?.layers[i];
	if (!layer) return;
	paint.value.currentLayer = layer;
};
const setLayerVisible = (v: boolean, i: number) => {
	if (!paint.value) return;
	paint.value.setLayerInfo(v, i);
};
</script>

<template>
	<div>
		<div id="pos"></div>
		<div>
			<button @click="paint?.clearCurLayer">清空</button>
			<button @click="paint?.addNewLayer">添加</button>
			<button @click="paint?.swtichBrush('PEN')">笔</button>
			<button @click="paint?.swtichBrush('ERASER')">橡皮</button>
			<button @click="paint?.swtichBrush('LASSO')">套索</button>
			<button
				@click="
					paint?.setBrushStyle({
						size: paint.getBrushStyle().size + 1,
					})
				"
			>
				粗线
			</button>
			<button
				@click="
					paint?.setBrushStyle({
						size: paint.getBrushStyle().size - 1,
					})
				"
			>
				细线
			</button>
			<button
				@click="
					paint?.setBrushStyle({
						thickness: paint.getBrushStyle().thickness + 0.1,
					})
				"
			>
				加深
			</button>
			<button
				@click="
					paint?.setBrushStyle({
						thickness: paint.getBrushStyle().thickness - 0.1,
					})
				"
			>
				变浅
			</button>
			<button
				@click="
					paint?.rotateTo(paint.rotateDegree - 5)
				"
			>
				左转
			</button>
			<button
				@click="
					paint?.rotateTo(paint.rotateDegree + 5)
				"
			>
				右转
			</button>
		</div>
		<div
			id="canvas"
			style="border: 1px solid black"
		></div>
		<div>
			<div
				v-for="(_, i) in paint?.layers"
				@click="setLayer(i)"
				:style="{
					border: paint?.currentLayer === paint?.layers[i] ? '1px solid black' : '',
				}"
			>
				<div
					@click="setLayerVisible(!paint?.currentLayer.visible, i)"
					style="width: 100px; border: 1px solid black"
				>
					可见
				</div>
				layer {{ i }}
			</div>
		</div>
	</div>
</template>

<style scoped></style>
