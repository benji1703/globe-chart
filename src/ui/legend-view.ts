import { html, nothing, type TemplateResult } from 'lit';

import type { LegendConfig } from '../core/config.js';
import type { LegendEntry } from '../core/types.js';
import type { PageSlice } from '../core/legend-query.js';
import { formatValue } from '../core/format.js';

export interface LegendRenderOptions {
	entries: LegendEntry[];
	selectedIso: string | null;
	config: LegendConfig;
	query: string;
	page: PageSlice<LegendEntry>;
	searching: boolean;
	searchError: string | null;
	expanded: boolean;
	onSelect: (entry: LegendEntry) => void;
	onQueryInput: (query: string) => void;
	onPageChange: (page: number) => void;
	onToggle: () => void;
}

export function renderLegend(options: LegendRenderOptions): TemplateResult {
	const {
		selectedIso,
		config,
		query,
		page,
		searching,
		searchError,
		expanded,
		onSelect,
		onQueryInput,
		onPageChange,
		onToggle,
	} = options;
	const format = config.formatValue ?? ((v: number) => formatValue(v, config.emptyLabel));
	const showPager = config.pageSize > 0 && page.totalPages > 1;
	const showSearch = config.search.enabled;
	const showToggle = config.collapsible && config.collapseMode !== 'never';

	if (showToggle && !expanded) {
		return html`
			<button
				type="button"
				class="legend-toggle"
				aria-expanded="false"
				aria-controls="globe-chart-legend"
				@click=${onToggle}
			>
				${config.toggleLabel}
			</button>
		`;
	}

	return html`
		<div class="legend" id="globe-chart-legend" role="navigation" aria-label=${config.title}>
			<div class="legend-header">
				<div class="legend-header__top">
					<span class="legend-title">${config.title}</span>
					${showToggle
						? html`
								<button
									type="button"
									class="legend-close"
									aria-label="Close legend"
									aria-expanded="true"
									aria-controls="globe-chart-legend"
									@click=${onToggle}
								>
									Close
								</button>
							`
						: nothing}
				</div>
				${config.subtitle
					? html`<span class="legend-subtitle">${config.subtitle}</span>`
					: nothing}
				${config.showScale
					? html`
							<div class="legend-scale" aria-hidden="true">
								<span>Low</span>
								<div class="legend-scale-bar"></div>
								<span>High</span>
							</div>
						`
					: nothing}
				${showSearch
					? html`
							<label class="legend-search">
								<span class="legend-search__label">Search</span>
								<input
									class="legend-search__input"
									type="search"
									autocomplete="off"
									spellcheck="false"
									placeholder=${config.search.placeholder}
									.value=${query}
									aria-busy=${searching ? 'true' : 'false'}
									@input=${(e: Event) => {
										const target = e.target;
										if (target instanceof HTMLInputElement) onQueryInput(target.value);
									}}
								/>
							</label>
						`
					: nothing}
				${searchError
					? html`<p class="legend-search__error" role="status">${searchError}</p>`
					: nothing}
				${searching
					? html`<p class="legend-search__status" role="status">Searching…</p>`
					: nothing}
			</div>
			<ul class="legend-list">
				${page.items.length
					? page.items.map(
							(entry) => html`
								<li>
									<button
										type="button"
										class="legend-row"
										title=${entry.name}
										aria-current=${selectedIso === entry.iso ? 'true' : 'false'}
										@click=${() => onSelect(entry)}
									>
										<span class="legend-swatch" style="background:${entry.color}"></span>
										<span class="legend-name">${entry.name}</span>
										<span class="legend-value">${format(entry.value, entry.row)}</span>
									</button>
								</li>
							`,
						)
					: html`
							<li class="legend-empty" role="status">
								${query.trim() ? 'No matches' : config.emptyLabel}
							</li>
						`}
			</ul>
			${showPager
				? html`
						<div class="legend-pager">
							<button
								type="button"
								class="legend-pager__btn"
								?disabled=${page.page <= 1}
								aria-label="Previous page"
								@click=${() => onPageChange(page.page - 1)}
							>
								Prev
							</button>
							<span class="legend-pager__meta">
								${page.page} / ${page.totalPages}
							</span>
							<button
								type="button"
								class="legend-pager__btn"
								?disabled=${page.page >= page.totalPages}
								aria-label="Next page"
								@click=${() => onPageChange(page.page + 1)}
							>
								Next
							</button>
						</div>
					`
				: nothing}
			${config.showCount
				? html`
						<div class="legend-count">
							${page.totalItems}
							${page.totalItems === 1 ? 'country' : 'countries'}
							${query.trim() ? ' matched' : ''}
							${showPager ? html` · page ${page.page}` : nothing}
						</div>
					`
				: nothing}
		</div>
	`;
}
