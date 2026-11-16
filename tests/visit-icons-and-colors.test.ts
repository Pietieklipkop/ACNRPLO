import { describe, it, expect } from 'vitest';
import { VISIT_ICON_OPTIONS, VISIT_ICON_MAP, getVisitIconComponent } from '../src/lib/constants/visit-icons';
import { PLO_MEMBER_PALETTE, getMemberColor } from '../src/lib/constants/member-colors';

describe('Visit Reason Icons & PLO Member Colors', () => {
	it('should provide exactly 10 curated Lucide icon options for visit reasons', () => {
		expect(VISIT_ICON_OPTIONS).toHaveLength(10);
		for (const opt of VISIT_ICON_OPTIONS) {
			expect(opt.name).toBeTruthy();
			expect(opt.label).toBeTruthy();
			expect(opt.description).toBeTruthy();
			expect(opt.icon).toBeDefined();
			expect(VISIT_ICON_MAP[opt.name]).toBeDefined();
		}
	});

	it('should resolve icon components with robust fallback to Compass', () => {
		const crosshair = getVisitIconComponent('Crosshair');
		expect(crosshair).toBe(VISIT_ICON_MAP['Crosshair']);

		const fallback = getVisitIconComponent('non_existent_icon');
		expect(fallback).toBe(VISIT_ICON_MAP['Compass']);

		const nullFallback = getVisitIconComponent(null);
		expect(nullFallback).toBe(VISIT_ICON_MAP['Compass']);
	});

	it('should maintain a distinct, accessible PLO member palette', () => {
		expect(PLO_MEMBER_PALETTE.length).toBeGreaterThanOrEqual(10);
		for (const color of PLO_MEMBER_PALETTE) {
			expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it('should preserve explicit member colors', () => {
		const member = { id: 'u1', name: 'Willem', email: 'willem@farm.co.za', color: '#2563eb' };
		expect(getMemberColor(member)).toBe('#2563eb');
	});

	it('should deterministically assign palette colors when member color is missing', () => {
		const memberA = { id: 'user-a', email: 'a@reserve.co.za', color: null };
		const memberB = { id: 'user-b', email: 'b@reserve.co.za', color: null };

		const colorA1 = getMemberColor(memberA);
		const colorA2 = getMemberColor(memberA);
		expect(colorA1).toBe(colorA2);
		expect(PLO_MEMBER_PALETTE).toContain(colorA1);

		const colorB = getMemberColor(memberB);
		expect(PLO_MEMBER_PALETTE).toContain(colorB);
	});
});
