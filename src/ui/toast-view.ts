import { html, nothing, type TemplateResult } from 'lit';

import type { ToastPosition } from '../core/config.js';
import type { ToastMessage } from '../core/types.js';

export interface ToastRenderOptions {
	items: ToastMessage[];
	position: ToastPosition;
	onDismiss: (id: string) => void;
	expandedId: string | null;
	onToggleDetails: (id: string) => void;
}

export function renderToasts(options: ToastRenderOptions): TemplateResult | typeof nothing {
	const { items, position, onDismiss, expandedId, onToggleDetails } = options;
	if (!items.length) return nothing;

	return html`
		<div class="toast-stack toast-stack--${position}" aria-live="polite">
			${items.map((toast) => {
				const role = toast.level === 'error' ? 'alert' : 'status';
				const expanded = expandedId === toast.id;
				return html`
					<div class="toast toast--${toast.level}" role=${role}>
						<div class="toast__body">
							<strong class="toast__title">${toast.title}</strong>
							<p class="toast__text">${toast.body}</p>
							${toast.details && expanded
								? html`<pre class="toast__details">${toast.details}</pre>`
								: nothing}
						</div>
						<div class="toast__actions">
							${toast.details
								? html`
										<button
											type="button"
											class="toast__btn"
											@click=${() => onToggleDetails(toast.id)}
										>
											${expanded ? 'Hide' : 'Details'}
										</button>
									`
								: nothing}
							<button
								type="button"
								class="toast__btn toast__btn--dismiss"
								aria-label="Dismiss notification"
								@click=${() => onDismiss(toast.id)}
							>
								Dismiss
							</button>
						</div>
					</div>
				`;
			})}
		</div>
	`;
}
