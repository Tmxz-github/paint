import { Layer } from "../Layer";

/** 插件注册的渲染层条目，由 Paint.renderLayers() 统一绘制 */
export interface RenderLayerEntry {
	/** 唯一标识，用于插件的注销和替换 */
	id: string;
	/** 渲染层级，数值越大越靠前（后绘制） */
	zIndex: number;
	/** 渲染层 */
	layer: Layer;
	/** 所属插件标识（用于插件卸载时清理） */
	pluginId: string;
}
