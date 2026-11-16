import { describe, it, expect } from 'vitest';
import {
	hasAnyRole,
	canVote,
	canManageUsers,
	canManagePolls,
	canAccessFinance,
	canBookCalendar,
	canAddAssociates,
	type UserRole
} from '../src/lib/auth/roles';

describe('Stackable RBAC & Role Authorization Engine', () => {
	it('should allow Secretary to manage users and polls', () => {
		const secretaryRoles: UserRole[] = ['secretary'];
		expect(canManageUsers(secretaryRoles)).toBe(true);
		expect(canManagePolls(secretaryRoles)).toBe(true);
		expect(canAccessFinance(secretaryRoles)).toBe(true);
		expect(canBookCalendar(secretaryRoles)).toBe(true);
		expect(canAddAssociates(secretaryRoles)).toBe(true);
		// Secretary alone without main_plo/executive cannot vote
		expect(canVote(secretaryRoles)).toBe(false);
	});

	it('should allow Main PLO Member to vote and book calendar, but not manage users', () => {
		const ploRoles: UserRole[] = ['main_plo'];
		expect(canVote(ploRoles)).toBe(true);
		expect(canBookCalendar(ploRoles)).toBe(true);
		expect(canAddAssociates(ploRoles)).toBe(true);
		expect(canManageUsers(ploRoles)).toBe(false);
		expect(canManagePolls(ploRoles)).toBe(false);
		expect(canAccessFinance(ploRoles)).toBe(false);
	});

	it('should support stackable roles (e.g. Secretary + Main PLO Member)', () => {
		const dualRoles: UserRole[] = ['secretary', 'main_plo'];
		expect(canManageUsers(dualRoles)).toBe(true);
		expect(canVote(dualRoles)).toBe(true);
		expect(canAccessFinance(dualRoles)).toBe(true);
	});

	it('should allow Executive to access finance and vote', () => {
		const execRoles: UserRole[] = ['executive', 'main_plo'];
		expect(canAccessFinance(execRoles)).toBe(true);
		expect(canVote(execRoles)).toBe(true);
		expect(canManageUsers(execRoles)).toBe(false);
	});

	it('should enforce granular permissions for associate member relationships', () => {
		const associateRoles: UserRole[] = ['associate'];

		// 1. Family Member: view-only, cannot book calendar, cannot vote
		expect(canBookCalendar(associateRoles, 'family')).toBe(false);
		expect(canVote(associateRoles, 'family')).toBe(false);

		// 2. Co-Owner: can add calendar entries, cannot vote
		expect(canBookCalendar(associateRoles, 'co_owner')).toBe(true);
		expect(canVote(associateRoles, 'co_owner')).toBe(false);

		// 3. Authorised Delegate: can vote on behalf of Main PLO, cannot book calendar
		expect(canBookCalendar(associateRoles, 'delegate')).toBe(false);
		expect(canVote(associateRoles, 'delegate')).toBe(true);
	});
});
