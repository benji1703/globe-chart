import { describe, expect, it, vi } from 'vitest';

import { VisibilityController } from './visibility-controller.js';

class FakeIntersectionObserver {
	static instances: FakeIntersectionObserver[] = [];
	callback: (entries: { isIntersecting: boolean }[]) => void;
	observed: unknown;

	constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
		this.callback = callback;
		FakeIntersectionObserver.instances.push(this);
	}

	observe(target: unknown) {
		this.observed = target;
	}

	disconnect() {
		/* no-op */
	}

	trigger(isIntersecting: boolean) {
		this.callback([{ isIntersecting }]);
	}
}

function makeHost() {
	const el = document.createElement('div');
	return Object.assign(el, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('VisibilityController', () => {
	it('starts not-visible when IntersectionObserver is available, observes the host, and reports changes', () => {
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
		FakeIntersectionObserver.instances = [];
		const host = makeHost();
		const onChange = vi.fn();
		const controller = new VisibilityController(host, onChange);
		controller.hostConnected();

		const observer = FakeIntersectionObserver.instances[0];
		expect(observer?.observed).toBe(host);
		expect(controller.visible).toBe(false);

		observer?.trigger(true);
		expect(controller.visible).toBe(true);
		expect(onChange).toHaveBeenCalledWith(true);

		observer?.trigger(false);
		expect(onChange).toHaveBeenCalledWith(false);
		// visible latches true once seen, matching original observeVisibility() behavior
		expect(controller.visible).toBe(true);

		vi.unstubAllGlobals();
	});

	it('treats visibility as always-true when IntersectionObserver is unavailable', () => {
		vi.stubGlobal('IntersectionObserver', undefined);
		const host = makeHost();
		const controller = new VisibilityController(host, vi.fn());
		controller.hostConnected();
		expect(controller.visible).toBe(true);
		vi.unstubAllGlobals();
	});
});
