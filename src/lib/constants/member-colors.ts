export const PLO_MEMBER_PALETTE = [
	'#2563eb', // Royal Blue (e.g. Willem)
	'#059669', // Emerald Green (e.g. Des)
	'#d97706', // Amber / Ochre (e.g. Dave)
	'#7c3aed', // Purple / Violet (e.g. Stefan)
	'#dc2626', // Crimson Red
	'#0891b2', // Deep Cyan
	'#ea580c', // Burnt Orange
	'#4f46e5', // Indigo
	'#db2777', // Rose Pink
	'#16a34a', // Leaf Green
	'#9333ea', // Deep Violet
	'#0284c7'  // Sky Blue
];

/**
 * Returns the member's assigned color, or deterministically computes one from the palette based on member attributes.
 */
export function getMemberColor(
	member: { id?: string; email?: string; color?: string | null } | null | undefined,
	fallbackIndex = 0
): string {
	if (member?.color && member.color.trim().length > 0) {
		return member.color;
	}
	const seed = member?.email || member?.id || `user-${fallbackIndex}`;
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = seed.charCodeAt(i) + ((hash << 5) - hash);
	}
	const idx = Math.abs(hash) % PLO_MEMBER_PALETTE.length;
	return PLO_MEMBER_PALETTE[idx];
}
