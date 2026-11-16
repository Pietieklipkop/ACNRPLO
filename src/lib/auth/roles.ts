export type UserRole = 'secretary' | 'executive' | 'main_plo' | 'associate';
export type AssociateRelationship = 'family' | 'co_owner' | 'delegate';

export const ALL_ROLES: UserRole[] = ['secretary', 'executive', 'main_plo', 'associate'];

export const ROLE_LABELS: Record<UserRole, string> = {
	secretary: 'Secretary',
	executive: 'Executive PLO Member',
	main_plo: 'Main PLO Member',
	associate: 'Associate Member'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
	secretary: 'Platform administration, user onboarding, land portions, polls & quotas management',
	executive: 'Financial accounts, executive reporting, quota pricing & voting rights',
	main_plo: 'Primary landowner rights: voting, visit bookings, hunt logs & quota trading',
	associate: 'Family & associate access: permission-specific reserve capabilities'
};

export const ASSOCIATE_RELATIONSHIP_LABELS: Record<AssociateRelationship, string> = {
	family: 'Family Member (View Only)',
	co_owner: 'Co-Owner (Calendar Booking)',
	delegate: 'Authorised Delegate (Voting Proxy)'
};

export const ASSOCIATE_RELATIONSHIP_DESCRIPTIONS: Record<AssociateRelationship, string> = {
	family: 'Family member: view-only visibility into reserve details & calendar. Cannot add calendar entries or cast votes.',
	co_owner: 'Co-owner: joint portion landowner rights. Allowed to add entries to the shared reserve calendar.',
	delegate: 'Authorised delegate: authorised representative who can cast voting ballots on behalf of the Main PLO member.'
};

/**
 * Checks if a user holds at least one of the required roles (stackable/additive permissions)
 */
export function hasAnyRole(userRoles: UserRole[] | undefined | null, requiredRoles: UserRole[]): boolean {
	if (!userRoles || userRoles.length === 0) return false;
	return requiredRoles.some((reqRole) => userRoles.includes(reqRole));
}

/**
 * Checks if a user has voting rights:
 * - Main PLO Member
 * - Executive Member
 * - Authorised Delegate (voting on behalf of their sponsoring Main PLO member)
 * - Family members, Co-owners, and Secretary CANNOT vote
 */
export function canVote(
	userRoles: UserRole[] | undefined | null,
	associateRelationship?: AssociateRelationship | string | null
): boolean {
	if (!userRoles || userRoles.length === 0) return false;
	if (userRoles.includes('main_plo') || userRoles.includes('executive')) return true;
	if (userRoles.includes('associate') && associateRelationship === 'delegate') return true;
	return false;
}

/**
 * Checks if a user can manage other user accounts and land portions (Secretary only)
 */
export function canManageUsers(userRoles: UserRole[] | undefined | null): boolean {
	return hasAnyRole(userRoles, ['secretary']);
}

/**
 * Checks if a user can create/manage voting polls (Secretary only)
 */
export function canManagePolls(userRoles: UserRole[] | undefined | null): boolean {
	return hasAnyRole(userRoles, ['secretary']);
}

/**
 * Checks if a user can create calendar bookings:
 * - Secretary
 * - Main PLO Member
 * - Executive Member
 * - Co-Owner associate (allowed to add entries to the calendar)
 * - Family members and Delegates CANNOT add entries to the calendar (view only)
 */
export function canBookCalendar(
	userRoles: UserRole[] | undefined | null,
	associateRelationship?: AssociateRelationship | string | null
): boolean {
	if (!userRoles || userRoles.length === 0) return false;
	if (hasAnyRole(userRoles, ['secretary', 'main_plo', 'executive'])) return true;
	if (userRoles.includes('associate') && associateRelationship === 'co_owner') return true;
	return false;
}

/**
 * Checks if a user can view financial ledgers (Secretary or Executive PLO Member)
 */
export function canAccessFinance(userRoles: UserRole[] | undefined | null): boolean {
	return hasAnyRole(userRoles, ['secretary', 'executive']);
}

/**
 * Checks if a user can add Associate Members (Main PLO Member or Secretary)
 */
export function canAddAssociates(userRoles: UserRole[] | undefined | null): boolean {
	return hasAnyRole(userRoles, ['main_plo', 'secretary']);
}
