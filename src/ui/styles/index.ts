import type { CSSResultGroup } from 'lit';

import { hostStyles } from './host.styles.js';
import { legendStyles } from './legend.styles.js';
import { toastStyles } from './toast.styles.js';
import { tooltipStyles } from './tooltip.styles.js';

export const globeChartStyles: CSSResultGroup = [hostStyles, legendStyles, toastStyles, tooltipStyles];
