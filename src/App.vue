<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Paint, Eraser, Lasso } from ".";

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
		use: [new Eraser(), new Lasso()],
	});
	paint.value.pointerListener.on("MOVE", () => {
		const div = document.querySelector("#pos")!;
		div.innerHTML = `${paint.value?.cursorRenderer.cursor.curPos.x}:::${paint.value?.cursorRenderer.cursor.curPos.y}`;
	});
});

const setLayer = (i: number) => {
	if (!paint.value) return;
	const layer = paint.value?.layerManager.layers[i];
	if (!layer) return;
	paint.value.layerManager.currentLayer = layer;
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
			<button @click="paint?.switchBrush('PEN')">笔</button>
			<button @click="paint?.switchBrush('ERASER')">橡皮</button>
			<button @click="paint?.switchBrush('LASSO')">套索</button>
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
			<button @click="paint?.rotateTo(paint.transform.rotation - 5)">左转</button>
			<button @click="paint?.rotateTo(paint.transform.rotation + 5)">右转</button>
		</div>
		<div
			id="canvas"
			style="border: 1px solid black"
		></div>
		<div>
			<div
				v-for="(_, i) in paint?.layerManager.layers"
				@click="setLayer(i)"
				:style="{
					border: paint?.layerManager.currentLayer === paint?.layerManager.layers[i] ? '1px solid black' : '',
				}"
			>
				<div
					@click="setLayerVisible(!paint?.layerManager.currentLayer.visible, i)"
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
