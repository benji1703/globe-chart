import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { ToastsConfig } from '../core/config.js';
import {
	clearSeenCode,
	clearToasts,
	createToastState,
	dismissToast,
	pushToast,
	type ToastState,
} from '../core/toast.js';
import type { FeedbackEventDetail, ToastMessage } from '../core/types.js';
import { definedProps } from '../core/types.js';

export interface NotifyInput {
	level: FeedbackEventDetail['level'];
	title: string;
	body: string;
	details?: string;
	code?: string;
	once?: boolean;
}

/** Owns the toast reducer, per-toast auto-dismiss timers, and the error/warning CustomEvent dispatch. */
export class ToastController implements ReactiveController {
	private state: ToastState = createToastState();
	private expandedId: string | null = null;
	private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
	private readonly host: ReactiveControllerHost & EventTarget;

	get items(): ToastMessage[] {
		return this.state.items;
	}

	get expandedToastId(): string | null {
		return this.expandedId;
	}

	constructor(host: ReactiveControllerHost & EventTarget) {
		this.host = host;
		host.addController(this);
	}

	hostDisconnected() {
		for (const timer of this.timers.values()) clearTimeout(timer);
		this.timers.clear();
		this.state = clearToasts(this.state);
		this.expandedId = null;
	}

	notify(input: NotifyInput, toastsConfig: ToastsConfig) {
		const persist = input.level === 'error' || (input.level === 'warning' && toastsConfig.persistWarnings);

		this.state = pushToast(this.state, {
			...input,
			persist,
			maxVisible: toastsConfig.maxVisible,
		});
		this.host.requestUpdate();

		const latest = this.state.items[this.state.items.length - 1];
		if (!latest) return;

		const detail: FeedbackEventDetail = {
			level: latest.level,
			title: latest.title,
			body: latest.body,
			...definedProps({ details: latest.details, code: input.code }),
		};
		if (latest.level === 'error') {
			this.host.dispatchEvent(new CustomEvent('error', { detail, bubbles: true, composed: true }));
		} else if (latest.level === 'warning') {
			this.host.dispatchEvent(new CustomEvent('warning', { detail, bubbles: true, composed: true }));
		}

		if (!persist && latest.level !== 'error') {
			const ms = toastsConfig.warningDismissMs;
			clearTimeout(this.timers.get(latest.id));
			this.timers.set(
				latest.id,
				setTimeout(() => this.dismiss(latest.id), ms),
			);
		}
	}

	dismiss(id: string) {
		clearTimeout(this.timers.get(id));
		this.timers.delete(id);
		this.state = dismissToast(this.state, id);
		if (this.expandedId === id) this.expandedId = null;
		this.host.requestUpdate();
	}

	toggleDetails(id: string) {
		this.expandedId = this.expandedId === id ? null : id;
		this.host.requestUpdate();
	}

	clearSeen(code: string) {
		this.state = clearSeenCode(this.state, code);
	}
}
