import { describe, expect, it } from 'vitest';

import { landCapMaterial } from './materials.js';

describe('landCapMaterial', () => {
	it('reuses the cached material for the same color', () => {
		const a = landCapMaterial('#AB12CD');
		const b = landCapMaterial('#ab12cd');
		expect(b).toBe(a);
	});

	it('never serves a disposed material (globe teardown disposes cached caps)', () => {
		// three-globe's destructor calls material.dispose() on cap materials it
		// does not own. Reusing a disposed instance leaves the next globe's
		// country caps unrendered (storybook story switch, SPA remount).
		const a = landCapMaterial('#0FEE05');
		a.dispose();
		const b = landCapMaterial('#0fee05');
		expect(b).not.toBe(a);
	});
});
