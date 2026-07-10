import type { ToastLevel, ToastMessage } from './types.js';

export interface ToastState {
	items: ToastMessage[];
	/** Codes already shown once (empty-data, invalid-config, …). */
	seenCodes: Set<string>;
}

export function createToastState(): ToastState {
	return { items: [], seenCodes: new Set() };
}

let toastSeq = 0;

export function nextToastId(): string {
	toastSeq += 1;
	return `toast-${toastSeq}`;
}

export interface PushToastInput {
	level: ToastLevel;
	title: string;
	body: string;
	details?: string;
	code?: string;
	persist?: boolean;
	maxVisible: number;
	once?: boolean;
}

export function pushToast(state: ToastState, input: PushToastInput): ToastState {
	if (input.once && input.code && state.seenCodes.has(input.code)) {
		return state;
	}

	const seenCodes = new Set(state.seenCodes);
	if (input.code) seenCodes.add(input.code);

	const item: ToastMessage = {
		id: nextToastId(),
		level: input.level,
		title: input.title,
		body: input.body,
		details: input.details,
		createdAt: Date.now(),
		persist: input.persist ?? input.level === 'error',
	};

	const items = [...state.items, item].slice(-Math.max(1, input.maxVisible));
	return { items, seenCodes };
}

export function dismissToast(state: ToastState, id: string): ToastState {
	return { ...state, items: state.items.filter((t) => t.id !== id) };
}

export function clearToasts(state: ToastState): ToastState {
	return { ...state, items: [] };
}

export function clearSeenCode(state: ToastState, code: string): ToastState {
	const seenCodes = new Set(state.seenCodes);
	seenCodes.delete(code);
	return { ...state, seenCodes };
}
