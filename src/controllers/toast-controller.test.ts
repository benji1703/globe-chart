import { describe, expect, it, vi } from 'vitest';

import { ToastController } from './toast-controller.js';
import type { ToastsConfig } from '../core/config.js';

const toastsConfig: ToastsConfig = {
	enabled: true,
	position: 'bottom-end',
	maxVisible: 3,
	persistWarnings: false,
	warningDismissMs: 8000,
};

function makeHost() {
	const target = new EventTarget();
	return Object.assign(target, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('ToastController', () => {
	it('pushes a toast, requests an update, and dispatches a globe-warning event', () => {
		vi.useFakeTimers();
		const host = makeHost();
		const dispatched: CustomEvent[] = [];
		host.addEventListener('globe-warning', (e) => dispatched.push(e as CustomEvent));
		const controller = new ToastController(host);

		controller.notify({ level: 'warning', title: 'Heads up', body: 'body text' }, toastsConfig);

		expect(controller.items).toHaveLength(1);
		expect(controller.items[0]?.title).toBe('Heads up');
		expect(host.requestUpdate).toHaveBeenCalled();
		expect(dispatched).toHaveLength(1);
		expect(dispatched[0]?.detail).toMatchObject({ level: 'warning', title: 'Heads up' });

		vi.useRealTimers();
	});

	it('auto-dismisses non-persisted warnings after warningDismissMs', () => {
		vi.useFakeTimers();
		const host = makeHost();
		const controller = new ToastController(host);
		controller.notify({ level: 'warning', title: 'A', body: 'a' }, toastsConfig);
		expect(controller.items).toHaveLength(1);

		vi.advanceTimersByTime(toastsConfig.warningDismissMs);
		expect(controller.items).toHaveLength(0);
		vi.useRealTimers();
	});

	it('respects once codes', () => {
		const host = makeHost();
		const controller = new ToastController(host);
		controller.notify({ level: 'info', title: 'Empty', body: 'x', code: 'empty-data', once: true }, toastsConfig);
		controller.notify({ level: 'info', title: 'Empty', body: 'x', code: 'empty-data', once: true }, toastsConfig);
		expect(controller.items).toHaveLength(1);
	});

	it('dispatches globe-error for error-level toasts', () => {
		const host = makeHost();
		const dispatched: CustomEvent[] = [];
		host.addEventListener('globe-error', (e) => dispatched.push(e as CustomEvent));
		const controller = new ToastController(host);
		controller.notify({ level: 'error', title: 'Bad', body: 'b', code: 'x' }, toastsConfig);
		expect(dispatched).toHaveLength(1);
		expect(dispatched[0]?.detail).toMatchObject({ level: 'error', title: 'Bad', code: 'x' });
	});

	it('toggles details and dismisses by id', () => {
		const host = makeHost();
		const controller = new ToastController(host);
		controller.notify({ level: 'error', title: 'Bad', body: 'b', details: 'stack trace' }, toastsConfig);
		const id = controller.items[0]!.id;

		controller.toggleDetails(id);
		expect(controller.expandedToastId).toBe(id);
		controller.toggleDetails(id);
		expect(controller.expandedToastId).toBeNull();

		controller.dismiss(id);
		expect(controller.items).toHaveLength(0);
	});
});
