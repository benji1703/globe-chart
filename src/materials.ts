import { MeshBasicMaterial } from 'three';

const landCapMaterials = new Map<string, MeshBasicMaterial>();

/** Cap at altitude 0; polygonOffset vs ocean; depthWrite false so strokes stay visible. */
export function landCapMaterial(color: string): MeshBasicMaterial {
	const key = color.toLowerCase();
	let material = landCapMaterials.get(key);
	if (!material) {
		material = new MeshBasicMaterial({
			color,
			polygonOffset: true,
			polygonOffsetFactor: -4,
			polygonOffsetUnits: -4,
			depthWrite: false,
		});
		landCapMaterials.set(key, material);
	}
	material.depthWrite = false;
	return material;
}

export function solidColorImage(color: string): string {
	const canvas = document.createElement('canvas');
	canvas.width = 64;
	canvas.height = 32;
	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	return canvas.toDataURL();
}
