import type { GlobeInstance } from 'globe.gl';
import type { WebGLRenderer } from 'three';

import type { GlobeChartConfig } from '../config.js';
import type { PointOfView } from '../types.js';

export interface GlobeSceneOptions {
	element: HTMLElement;
	config: GlobeChartConfig;
	motionMs: (ms: number, kind?: 'polygon' | 'camera') => number;
}

export class GlobeScene {
	globe: GlobeInstance | null = null;
	private resizeObserver?: ResizeObserver;
	private element: HTMLElement | null = null;

	async create(options: GlobeSceneOptions): Promise<GlobeInstance> {
		// Tear down first so remounts do not stack WebGL contexts.
		this.destroy();

		const { element, config, motionMs } = options;
		this.element = element;

		const { default: Globe } = await import('globe.gl');

		// Aborted while the dynamic import was in flight.
		if (this.element !== element) {
			throw new DOMException('GlobeScene create aborted', 'AbortError');
		}

		this.globe = new Globe(element)
			.width(element.clientWidth)
			.height(element.clientHeight)
			.polygonsTransitionDuration(motionMs(config.camera.durations.polygon));

		this.resizeObserver = new ResizeObserver(() => {
			if (!this.globe || !this.element) return;
			this.globe.width(this.element.clientWidth).height(this.element.clientHeight);
		});
		this.resizeObserver.observe(element);
		return this.globe;
	}

	syncRotation(opts: {
		loading: boolean;
		autoRotate: boolean;
		autoRotateSpeed: number;
		config: GlobeChartConfig;
	}) {
		if (!this.globe) return;
		const controls = this.globe.controls();
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		const spinning = opts.loading || opts.autoRotate;
		controls.autoRotate = spinning;
		const speed = opts.loading ? opts.config.globe.loadingRotateSpeed : opts.autoRotateSpeed;
		controls.autoRotateSpeed = speed * opts.config.globe.autoRotateDirection;
	}

	pointOfView(view: PointOfView, durationMs: number) {
		this.globe?.pointOfView(view, durationMs);
	}

	destroy() {
		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;

		const globe = this.globe;
		const element = this.element;
		this.globe = null;
		this.element = null;

		if (globe) {
			try {
				const renderer = (
					globe as GlobeInstance & { renderer?: () => WebGLRenderer }
				).renderer?.();
				renderer?.forceContextLoss?.();
				renderer?.dispose?.();
			} catch {
				/* renderer may already be gone */
			}
			try {
				globe._destructor();
			} catch {
				/* ignore double-dispose */
			}
		}

		// Drop any leftover canvases globe.gl left in the host node.
		if (element) element.replaceChildren();
	}
}
