import { MeshBasicMaterial } from 'three';

const landCapMaterials = new Map<string, MeshBasicMaterial>();
const solidColorImages = new Map<string, string>();

/** Cap slightly above ocean; polygonOffset + depthWrite false keep strokes visible. */
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

/** Cached 1×1-ish data-URL so theme paints do not recreate canvases. */
export function solidColorImage(color: string): string {
	const key = color.toLowerCase();
	const cached = solidColorImages.get(key);
	if (cached) return cached;

	const canvas = document.createElement('canvas');
	canvas.width = 2;
	canvas.height = 2;
	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	const url = canvas.toDataURL('image/png');
	solidColorImages.set(key, url);
	return url;
}
