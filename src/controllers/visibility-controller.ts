import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Wraps an IntersectionObserver on the host element. `visible` latches true
 * once the host has been seen at least once (matches globe.gl cold-start
 * deferral: create on first visibility, then just pause/resume).
 */
export class VisibilityController implements ReactiveController {
	private _visible = typeof IntersectionObserver === 'undefined';
	private observer: IntersectionObserver | undefined;
	private readonly host: ReactiveControllerHost & HTMLElement;
	private readonly onChange: (visible: boolean) => void;

	get visible(): boolean {
		return this._visible;
	}

	constructor(host: ReactiveControllerHost & HTMLElement, onChange: (visible: boolean) => void) {
		this.host = host;
		this.onChange = onChange;
		host.addController(this);
	}

	hostConnected() {
		this.observe();
	}

	hostDisconnected() {
		this._visible = typeof IntersectionObserver === 'undefined';
		this.observer?.disconnect();
		this.observer = undefined;
	}

	private observe() {
		if (typeof IntersectionObserver !== 'function') {
			this._visible = true;
			return;
		}
		this.observer?.disconnect();
		this.observer = new IntersectionObserver(
			(entries) => {
				const isVisible = entries.some((e) => e.isIntersecting);
				this._visible = isVisible || this._visible;
				this.onChange(isVisible);
			},
			{ rootMargin: '120px', threshold: 0 },
		);
		this.observer.observe(this.host);
	}
}
