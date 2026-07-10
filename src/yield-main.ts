interface SchedulerWithYield {
	yield: () => Promise<void>;
}

function getScheduler(): SchedulerWithYield | undefined {
	if (!('scheduler' in globalThis)) return undefined;
	const candidate = (globalThis as { scheduler?: unknown }).scheduler;
	if (
		candidate != null &&
		typeof candidate === 'object' &&
		'yield' in candidate &&
		typeof (candidate as SchedulerWithYield).yield === 'function'
	) {
		return candidate as SchedulerWithYield;
	}
	return undefined;
}

/**
 * Yield so the browser can paint / handle input between heavy globe tasks.
 *
 * Prefer `scheduler.yield()` when available. Avoid `setTimeout(0)`: Chrome
 * attributes the async continuation (and any heavy work right after `await`)
 * to that timer, which surfaces as `[Violation] 'setTimeout' handler took Nms`
 * even when the timer itself only resolved a promise.
 */
export function yieldToMain(): Promise<void> {
	const scheduler = getScheduler();
	if (scheduler) return scheduler.yield();

	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}
