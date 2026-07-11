import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { GlobeChartConfig } from '../core/config.js';
import type { LegendEntry } from '../core/types.js';

export interface LegendControllerOptions {
	host: ReactiveControllerHost;
	getConfig: () => GlobeChartConfig;
	onSelect: (entry: LegendEntry) => void;
}

/** Owns legend selection, paging, and open/collapsed panel state. */
export class LegendController implements ReactiveController {
	private _selectedIso: string | null = null;
	private _page = 1;
	private _expanded = true;
	private mq: MediaQueryList | undefined;
	private readonly host: ReactiveControllerHost;
	private readonly getConfig: () => GlobeChartConfig;
	private readonly onSelectCb: (entry: LegendEntry) => void;
	private readonly onBreakpointChange = () => this.applyCollapseDefault();

	get selectedIso(): string | null {
		return this._selectedIso;
	}

	set selectedIso(value: string | null) {
		if (this._selectedIso === value) return;
		this._selectedIso = value;
		this.host.requestUpdate();
	}

	get page(): number {
		return this._page;
	}

	get expanded(): boolean {
		return this._expanded;
	}

	constructor(options: LegendControllerOptions) {
		this.host = options.host;
		this.getConfig = options.getConfig;
		this.onSelectCb = options.onSelect;
		options.host.addController(this);
	}

	hostDisconnected() {
		this.mq?.removeEventListener('change', this.onBreakpointChange);
		this.mq = undefined;
	}

	select(entry: LegendEntry) {
		this.selectedIso = entry.iso;
		this.onSelectCb(entry);
		this.maybeCollapseAfterSelect();
	}

	setPage(page: number) {
		this._page = page;
		this.host.requestUpdate();
	}

	toggle() {
		this._expanded = !this._expanded;
		this.host.requestUpdate();
	}

	/** Re-bind the mobile-breakpoint listener after config changes (collapseMode/collapseOnSelect). */
	syncBreakpointListener() {
		this.mq?.removeEventListener('change', this.onBreakpointChange);
		this.mq = undefined;
		const legend = this.getConfig().legend;
		const needsMq = legend.collapsible && (legend.collapseMode === 'mobile' || legend.collapseOnSelect === 'mobile');
		if (typeof matchMedia !== 'function' || !needsMq) return;
		this.mq = matchMedia(legend.mobileBreakpoint);
		this.mq.addEventListener('change', this.onBreakpointChange);
	}

	applyCollapseDefault() {
		const legend = this.getConfig().legend;
		if (!legend.collapsible || legend.collapseMode === 'never') {
			this._expanded = true;
		} else if (legend.collapseMode === 'always') {
			this._expanded = false;
		} else {
			const mobile = this.mq?.matches ?? false;
			this._expanded = !mobile;
		}
		this.host.requestUpdate();
	}

	private maybeCollapseAfterSelect() {
		const legend = this.getConfig().legend;
		if (!legend.collapsible) return;
		const mode = legend.collapseOnSelect;
		if (mode === 'never') return;
		if (mode === 'always') {
			this._expanded = false;
			this.host.requestUpdate();
			return;
		}
		const mobile = this.mq?.matches ?? (typeof matchMedia === 'function' && matchMedia(legend.mobileBreakpoint).matches);
		if (mobile) {
			this._expanded = false;
			this.host.requestUpdate();
		}
	}
}
