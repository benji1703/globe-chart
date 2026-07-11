import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { GlobeChartConfig, LegendSearchHit } from '../core/config.js';
import type { LegendSearchEventDetail } from '../core/types.js';

export interface SearchControllerOptions {
	host: ReactiveControllerHost & EventTarget;
	getConfig: () => GlobeChartConfig;
	getLegendResults: () => LegendSearchHit[] | null;
}

/** Owns the legend search query, debounce, remote provider invocation, and abort lifecycle. */
export class SearchController implements ReactiveController {
	private _query = '';
	private remoteHits: LegendSearchHit[] = [];
	private _searching = false;
	private _error: string | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;
	private abort: AbortController | undefined;
	private readonly host: ReactiveControllerHost & EventTarget;
	private readonly getConfig: () => GlobeChartConfig;
	private readonly getLegendResults: () => LegendSearchHit[] | null;

	get query(): string {
		return this._query;
	}

	get searching(): boolean {
		return this._searching;
	}

	get error(): string | null {
		return this._error;
	}

	constructor(options: SearchControllerOptions) {
		this.host = options.host;
		this.getConfig = options.getConfig;
		this.getLegendResults = options.getLegendResults;
		options.host.addController(this);
	}

	hostDisconnected() {
		clearTimeout(this.debounceTimer);
		this.abort?.abort();
	}

	/** Host-driven `legendResults` wins when set; otherwise fall back to our own provider hits. */
	effectiveHits(): LegendSearchHit[] {
		const external = this.getLegendResults();
		return external != null ? external : this.remoteHits;
	}

	/** Call when the host's `legendResults` property changes to a non-null value. */
	onLegendResultsChanged() {
		this._searching = false;
		this.host.requestUpdate();
	}

	onQueryInput(query: string) {
		this._query = query;
		this._error = null;
		const search = this.getConfig().legend.search;

		if (!search.enabled) {
			this.host.requestUpdate();
			return;
		}

		clearTimeout(this.debounceTimer);
		const trimmed = query.trim();

		if (search.mode === 'local') {
			this.remoteHits = [];
			this._searching = false;
			this.host.requestUpdate();
			return;
		}

		if (trimmed.length < search.minLength) {
			this.abort?.abort();
			this.remoteHits = [];
			this._searching = false;
			this.host.requestUpdate();
			return;
		}

		this.host.requestUpdate();
		this.debounceTimer = setTimeout(() => {
			void this.run(trimmed);
		}, search.debounceMs);
	}

	private async run(query: string) {
		const search = this.getConfig().legend.search;
		this.abort?.abort();
		const abort = new AbortController();
		this.abort = abort;

		const detail: LegendSearchEventDetail = { query, signal: abort.signal };
		this.host.dispatchEvent(new CustomEvent('legend-search', { detail, bubbles: true, composed: true }));

		if (!search.provider) {
			// Host is expected to set `legendResults` from the event.
			this._searching = this.getLegendResults() == null;
			this.host.requestUpdate();
			return;
		}

		this._searching = true;
		this._error = null;
		this.host.requestUpdate();
		try {
			const hits = await search.provider(query, abort.signal);
			if (abort.signal.aborted) return;
			this.remoteHits = hits ?? [];
		} catch (err) {
			if (abort.signal.aborted) return;
			this.remoteHits = [];
			this._error = err instanceof Error ? err.message : 'Search failed';
		} finally {
			if (!abort.signal.aborted) this._searching = false;
			this.host.requestUpdate();
		}
	}
}
