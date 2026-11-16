import {
	Crosshair,
	Binoculars,
	Wrench,
	Tent,
	Compass,
	HeartHandshake,
	Camera,
	Trees,
	Flame,
	ShieldCheck
} from 'lucide-svelte';

export interface VisitIconOption {
	name: string;
	label: string;
	description: string;
	icon: any;
}

export const VISIT_ICON_OPTIONS: VisitIconOption[] = [
	{ name: 'Crosshair', label: 'Hunting & Off-Take', description: 'Regulated quota hunting excursion', icon: Crosshair },
	{ name: 'Binoculars', label: 'Game Count / Census', description: 'Wildlife census & ecological survey', icon: Binoculars },
	{ name: 'Wrench', label: 'Reserve Maintenance', description: 'Fences, waterholes, roads & boma work', icon: Wrench },
	{ name: 'Tent', label: 'Camping & Eco Stay', description: 'Landowner camp & bush accommodation', icon: Tent },
	{ name: 'Compass', label: 'Leisure & Safari Drive', description: 'Game viewing, relaxation & drives', icon: Compass },
	{ name: 'HeartHandshake', label: 'Governance & AGM', description: 'PLO committee, executive & landowner meetings', icon: HeartHandshake },
	{ name: 'Camera', label: 'Wildlife Photography', description: 'Photography excursions & scenic touring', icon: Camera },
	{ name: 'Trees', label: 'Conservation & Veld', description: 'Veld rehabilitation, botany & tree planting', icon: Trees },
	{ name: 'Flame', label: 'Boma & Braai', description: 'Social gathering & boma fireside stay', icon: Flame },
	{ name: 'ShieldCheck', label: 'Security & APU Patrol', description: 'Boundary patrol & anti-poaching inspection', icon: ShieldCheck }
];

export const VISIT_ICON_MAP: Record<string, any> = {
	Crosshair,
	Binoculars,
	Wrench,
	Tent,
	Compass,
	HeartHandshake,
	Camera,
	Trees,
	Flame,
	ShieldCheck
};

export function getVisitIconComponent(iconName: string | null | undefined): any {
	if (!iconName) return Compass;
	return VISIT_ICON_MAP[iconName] || Compass;
}
