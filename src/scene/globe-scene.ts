import type { GlobeInstance } from 'globe.gl';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { GlobeChartConfig } from '../config.js';
import type { PointOfView } from '../types.js';

export interface GlobeSceneOptions {
	element: HTMLElement;
	config: GlobeChartConfig;
	motionMs: (ms: number, kind?: 'polygon' | 'camera') => number;
}

type OrbitControlsWithContext = OrbitControls & {
	_onContextMenu?: (event: Event) => void;
};

/**
 * globe.gl schedules requestAnimationFrame forever once started. That is the
 * source of hundreds of Chrome [Violation] rAF warnings when each frame is
 * expensive (177 country meshes). We pause when idle and only resume for
 * interaction / auto-rotate / camera tweens.
 */
export class GlobeScene {
	globe: GlobeInstance | null = null;
	private resizeObserver: ResizeObserver | undefined;
	private element: HTMLElement | null = null;
	private idleTimer: ReturnType<typeof setTimeout> | undefined;
	private interactionBound = false;
	/** Keep the render loop alive (auto-rotate, loading spin, camera tween). */
	private continuous = false;
	private paused = false;
	private readonly onWake = () => {
		this.setPaused(false);
		this.scheduleIdlePause();
	};
	private readonly onInteractionEnd = () => {
		this.scheduleIdlePause();
	};

	async create(options: GlobeSceneOptions): Promise<GlobeInstance> {
		this.destroy();

		const { element, config, motionMs } = options;
		this.element = element;

		const { default: Globe } = await import('globe.gl');

		if (this.element !== element) {
			throw new DOMException('GlobeScene create aborted', 'AbortError');
		}

		// antialias off + no intro spin: biggest cold-start / per-frame wins in globe.gl.
		this.globe = new Globe(element, {
			animateIn: false,
			waitForGlobeReady: true,
			rendererConfig: {
				antialias: false,
				alpha: true,
				powerPreference: 'low-power',
				precision: 'lowp',
			},
		})
			.width(element.clientWidth)
			.height(element.clientHeight)
			.polygonsTransitionDuration(motionMs(config.camera.durations.polygon))
			// Skip hover raycasts until the first choropleth paint finishes.
			.enablePointerInteraction(false);

		try {
			const renderer = this.globe.renderer();
			const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
			const cap = Math.max(0.5, config.globe.maxPixelRatio);
			renderer.setPixelRatio(Math.min(dpr, cap));
		} catch {
			/* renderer may not be ready yet */
		}

		const controls = this.globe.controls();
		// Damping forces continuous frames; we drive pause/resume ourselves instead.
		controls.enableDamping = false;
		controls.enablePan = false;

		this.applyContextMenuPolicy(config.globe.allowContextMenu);
		this.bindInteractionLifecycle(element, controls);

		this.resizeObserver = new ResizeObserver(() => {
			if (!this.globe || !this.element) return;
			this.globe.width(this.element.clientWidth).height(this.element.clientHeight);
			// One frame to apply new size, then idle again if appropriate.
			this.setPaused(false);
			this.scheduleIdlePause();
		});
		this.resizeObserver.observe(element);

		// Stay running until the first paint calls kick() — pausing here would skip the first frame.
		return this.globe;
	}

	/** OrbitControls blocks contextmenu for right-pan — restore the browser menu when allowed. */
	applyContextMenuPolicy(allow: boolean) {
		if (!this.globe || !allow) return;
		const controls = this.globe.controls() as OrbitControlsWithContext;
		const handler = controls._onContextMenu;
		const el = controls.domElement;
		if (handler && el) {
			el.removeEventListener('contextmenu', handler);
		}
	}

	/**
	 * @param continuous When true (auto-rotate / loading), never idle-pause.
	 */
	setContinuous(continuous: boolean) {
		this.continuous = continuous;
		if (continuous) {
			clearTimeout(this.idleTimer);
			this.setPaused(false);
		} else {
			this.scheduleIdlePause();
		}
	}

	setPaused(paused: boolean) {
		if (!this.globe || this.paused === paused) return;
		this.paused = paused;
		if (paused) this.globe.pauseAnimation();
		else this.globe.resumeAnimation();
	}

	/** Brief wake for camera tweens / data paints, then idle again. */
	kick(ms = 400) {
		this.setPaused(false);
		if (!this.continuous) this.scheduleIdlePause(ms);
	}

	syncRotation(opts: {
		loading: boolean;
		autoRotate: boolean;
		autoRotateSpeed: number;
		config: GlobeChartConfig;
	}) {
		if (!this.globe) return;
		const controls = this.globe.controls();
		controls.enableDamping = false;
		const spinning = opts.loading || opts.autoRotate;
		controls.autoRotate = spinning;
		const speed = opts.loading ? opts.config.globe.loadingRotateSpeed : opts.autoRotateSpeed;
		controls.autoRotateSpeed = speed * opts.config.globe.autoRotateDirection;
		this.setContinuous(spinning);
	}

	pointOfView(view: PointOfView, durationMs: number) {
		if (!this.globe) return;
		this.setPaused(false);
		this.globe.pointOfView(view, durationMs);
		this.scheduleIdlePause(Math.max(durationMs, 0) + 50);
	}

	destroy() {
		clearTimeout(this.idleTimer);
		this.idleTimer = undefined;
		this.unbindInteractionLifecycle();
		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;

		const globe = this.globe;
		const element = this.element;
		this.globe = null;
		this.element = null;
		this.paused = false;
		this.continuous = false;
		this.interactionBound = false;

		if (globe) {
			try {
				globe.pauseAnimation();
			} catch {
				/* ignore */
			}
			try {
				const renderer = globe.renderer();
				renderer.forceContextLoss();
				renderer.dispose();
			} catch {
				/* renderer may already be gone */
			}
			try {
				globe._destructor();
			} catch {
				/* ignore double-dispose */
			}
		}

		if (element) element.replaceChildren();
	}

	private scheduleIdlePause(delayMs = 180) {
		clearTimeout(this.idleTimer);
		if (this.continuous || !this.globe) return;
		this.idleTimer = setTimeout(() => {
			if (!this.continuous) this.setPaused(true);
		}, delayMs);
	}

	private bindInteractionLifecycle(element: HTMLElement, controls: OrbitControls) {
		if (this.interactionBound) return;
		this.interactionBound = true;
		element.addEventListener('pointerdown', this.onWake, { passive: true });
		element.addEventListener('pointermove', this.onWake, { passive: true });
		element.addEventListener('wheel', this.onWake, { passive: true });
		element.addEventListener('touchstart', this.onWake, { passive: true });
		controls.addEventListener('start', this.onWake);
		controls.addEventListener('end', this.onInteractionEnd);
	}

	private unbindInteractionLifecycle() {
		if (!this.interactionBound || !this.element || !this.globe) {
			this.interactionBound = false;
			return;
		}
		this.element.removeEventListener('pointerdown', this.onWake);
		this.element.removeEventListener('pointermove', this.onWake);
		this.element.removeEventListener('wheel', this.onWake);
		this.element.removeEventListener('touchstart', this.onWake);
		try {
			const controls = this.globe.controls();
			controls.removeEventListener('start', this.onWake);
			controls.removeEventListener('end', this.onInteractionEnd);
		} catch {
			/* controls gone */
		}
		this.interactionBound = false;
	}
}
