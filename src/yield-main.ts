/** Yield so the browser can paint / handle input between heavy globe tasks. */
export function yieldToMain(): Promise<void> {
	const scheduler = (
		globalThis as unknown as {
			scheduler?: { yield?: () => Promise<void> };
		}
	).scheduler;

	if (scheduler?.yield) {
		return scheduler.yield();
	}

	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			setTimeout(resolve, 0);
		});
	});
}
