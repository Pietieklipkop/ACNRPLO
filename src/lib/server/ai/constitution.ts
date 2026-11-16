export interface ConstitutionArticle {
	articleNumber: string;
	title: string;
	clauses: { clauseNumber: string; heading: string; text: string }[];
	summary: string;
	keywords: string[];
}

export const CONSTITUTION_ARTICLES: ConstitutionArticle[] = [
	{
		articleNumber: '1',
		title: 'Establishment, Legal Status & Primary Conservation Objectives',
		summary:
			'ACNR is established as a collaborative nature reserve under NEMPAA and LEMA, uniting private landowners and LEDET to preserve biodiversity and ecological integrity.',
		keywords: [
			'establishment',
			'name',
			'objectives',
			'conservation',
			'nempaa',
			'lema',
			'ledet',
			'biodiversity',
			'cooperative',
			'nature reserve'
		],
		clauses: [
			{
				clauseNumber: '1.1',
				heading: 'Name and Legal Personality',
				text: 'The association shall be known as the Atherstone Collaborative Nature Reserve Private Land Owners Association (ACNRPLO). It operates as a juristic entity governed by the National Environmental Management: Protected Areas Act (NEMPAA) and the Limpopo Environmental Management Act (LEMA).'
			},
			{
				clauseNumber: '1.2',
				heading: 'Primary Mandate and Objectives',
				text: 'The core purpose of the Association is the unified ecological management, wildlife custodianship, biodiversity preservation, and sustainable utilization of the contiguous land portions constituting the Atherstone Nature Reserve.'
			},
			{
				clauseNumber: '1.3',
				heading: 'Provincial Co-Management Accord',
				text: 'The Association maintains a formal co-management partnership with the Limpopo Department of Economic Development, Environment and Tourism (LEDET) for joint conservation, anti-poaching, and biological census monitoring.'
			}
		]
	},
	{
		articleNumber: '2',
		title: 'Membership Classes, Land Ownership & Representation',
		summary:
			'Defines Main PLO Members (title deed owners), Executive co-owners, Associate Members (family/delegates), and the appointed Secretary.',
		keywords: [
			'membership',
			'roles',
			'main plo',
			'associate',
			'executive',
			'secretary',
			'title deed',
			'landowners',
			'family'
		],
		clauses: [
			{
				clauseNumber: '2.1',
				heading: 'Main PLO Member',
				text: 'A Main PLO Member is the primary registered owner or accredited representative of a private land portion within the reserve. Each Main PLO Member holds voting rights, visit booking authorization, hunting quota allocations, and quota trading rights.'
			},
			{
				clauseNumber: '2.2',
				heading: 'Executive PLO Member',
				text: 'Elected co-owners serving on the executive committee. Executive members hold full Main PLO rights, oversight of the reserve financial accounts, and fiduciary governance responsibilities.'
			},
			{
				clauseNumber: '2.3',
				heading: 'Associate Member Status',
				text: 'Family members, partners, or delegates designated by a sponsoring Main PLO Member. Associates are granted real-time read-only visibility into reserve calendars, active polls, game counts, and document vaults. Associates hold no independent voting power or quota trading rights.'
			},
			{
				clauseNumber: '2.4',
				heading: 'The Secretary',
				text: 'The administrative officer of the reserve responsible for landowner onboarding, land portion cadastral registration, voting poll management, quota distribution, and official notice promulgation.'
			}
		]
	},
	{
		articleNumber: '3',
		title: 'Share-Weighted Governance, Voting & Resolution Thresholds',
		summary:
			'Voting is strictly weighted by basis points (10,000 bps = 100.00%). Simple Majority (>50%) for operational matters; Special Resolution (≥75%) for constitutional amendments, land alienation, and capital levies.',
		keywords: [
			'voting',
			'governance',
			'basis points',
			'threshold',
			'simple majority',
			'special resolution',
			'quorum',
			'75%',
			'50%',
			'amendment',
			'polls',
			'ballot',
			'resolution'
		],
		clauses: [
			{
				clauseNumber: '3.1',
				heading: 'Basis-Point Allocation Standard',
				text: 'All voting power across the reserve is apportioned strictly in proportion to registered land ownership, calibrated to exactly 10,000 basis points (where 100 bps equals 1.00% ownership). Fractional land percentages are precisely expressed without rounding truncation.'
			},
			{
				clauseNumber: '3.2',
				heading: 'Quorum Requirements',
				text: 'A legally constituted Annual General Meeting or formal electronic vote requires a quorum representing not less than 5,000 basis points (50.00%) of the total reserve voting power present in person, by proxy, or by digital ballot.'
			},
			{
				clauseNumber: '3.3',
				heading: 'Simple Majority Resolutions',
				text: 'Ordinary administrative and operational resolutions (including calendar operating procedures, minor maintenance budgets, and standard quota price setting) require more than 50.00% of cast votes.'
			},
			{
				clauseNumber: '3.4',
				heading: 'Special Resolutions',
				text: 'Any motion to amend this Constitution, alter reserve external boundaries, permit mining or commercial concession developments, or impose a capital levy exceeding R 50,000 per member requires a Special Resolution passing with not less than 7,500 basis points (75.00%) of total reserve voting power.'
			}
		]
	},
	{
		articleNumber: '4',
		title: 'Wildlife Custodianship, Quotas & Hunting Off-Take',
		summary:
			'Annual quotas are derived from the collaborative game count and allocated by ownership %. Members can trade surplus quota through the Open-to-Buy marketplace.',
		keywords: [
			'quota',
			'hunting',
			'off-take',
			'game count',
			'census',
			'open to buy',
			'trade',
			'wildlife',
			'boma',
			'live capture',
			'ledet quota'
		],
		clauses: [
			{
				clauseNumber: '4.1',
				heading: 'Ecological Carrying Capacity & Annual Quotas',
				text: 'Annual off-take quotas for consumptive hunting and population management are established following the annual collaborative game census conducted with LEDET ecologists. Quotas are calibrated strictly to species carrying capacity and range forage conditions.'
			},
			{
				clauseNumber: '4.2',
				heading: 'Proportional Quota Allocation',
				text: 'Total hunting off-take quotas allocated to private landowners are distributed strictly proportional to each member’s registered basis-point ownership percentage.'
			},
			{
				clauseNumber: '4.3',
				heading: 'Open-to-Buy Surplus Trading',
				text: 'Any landowner who does not intend to utilize their full allocated hunting head count may flag surplus head as "Open-to-Buy". Fellow co-owners may acquire surplus quota at the official reserve tariff. All trades must be logged and approved via the platform ledger.'
			},
			{
				clauseNumber: '4.4',
				heading: 'Commercial Live Capture & Boma Proceeds',
				text: 'Revenue derived from collective commercial live game capture (boma sales) or surplus wildlife translocation is credited to the collective reserve capital fund for perimeter fence maintenance and infrastructure upgrades.'
			}
		]
	},
	{
		articleNumber: '5',
		title: 'Reserve Access, Safety & Field Protocols',
		summary:
			'Mandatory visit scheduling on the Shared Calendar, fire prevention, vehicle traverse rights, and dangerous game safety standards (.375 minimum caliber).',
		keywords: [
			'calendar',
			'visit',
			'booking',
			'access',
			'traverse',
			'safety',
			'firearm',
			'caliber',
			'camps',
			'fences',
			'roads'
		],
		clauses: [
			{
				clauseNumber: '5.1',
				heading: 'Mandatory Visit Scheduling',
				text: 'To ensure safety and coordinate lodge facilities, all landowner visits, hunting parties, maintenance teams, and contractors must be registered on the Shared Reserve Calendar prior to entry.'
			},
			{
				clauseNumber: '5.2',
				heading: 'Traverse and Road Infrastructure Protocols',
				text: 'Members hold reciprocal rights of traverse on designated reserve arterial roads and perimeter fence lines. Off-road driving is prohibited except for legitimate anti-poaching, fire containment, or animal recovery.'
			},
			{
				clauseNumber: '5.3',
				heading: 'Dangerous Game and Firearm Standards',
				text: 'Due to the presence of free-roaming dangerous game (including elephant, white rhino, and leopard), all hunting parties must adhere to statutory minimum calibers (.375 H&H Magnum for dangerous game) and carry operable communication gear.'
			}
		]
	},
	{
		articleNumber: '6',
		title: 'Financial Stewardship, Reserve Accounts & Audits',
		summary:
			'Operational bank accounts, transparent financial ledgers accessible to Executives and Secretary, and mandatory annual independent audit.',
		keywords: [
			'finance',
			'accounts',
			'ledger',
			'audit',
			'levy',
			'treasurer',
			'budget',
			'statements',
			'expenditure'
		],
		clauses: [
			{
				clauseNumber: '6.1',
				heading: 'Bank Accounts and Financial Records',
				text: 'All Association funds shall be deposited in an accredited commercial banking institution in South Africa. The Executive Committee and Secretary maintain real-time digital balance ledgers.'
			},
			{
				clauseNumber: '6.2',
				heading: 'Annual Independent Audit',
				text: 'The financial statements of the Association shall be audited annually by a registered chartered accountant and presented to all members at the Annual General Meeting.'
			}
		]
	}
];

/**
 * Searches constitution articles by keyword relevance
 */
export function searchConstitutionArticles(query: string): ConstitutionArticle[] {
	const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
	if (terms.length === 0) return CONSTITUTION_ARTICLES;

	const scored = CONSTITUTION_ARTICLES.map((article) => {
		let score = 0;
		const articleText = (
			article.title +
			' ' +
			article.summary +
			' ' +
			article.keywords.join(' ') +
			' ' +
			article.clauses.map((c) => c.clauseNumber + ' ' + c.heading + ' ' + c.text).join(' ')
		).toLowerCase();

		for (const term of terms) {
			if (article.keywords.some((k) => k.includes(term))) score += 4;
			if (article.title.toLowerCase().includes(term)) score += 3;
			if (articleText.includes(term)) score += 1;
		}

		return { article, score };
	});

	return scored
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.map((s) => s.article);
}

/**
 * Answers a member's question strictly grounded in the ACNR Constitution
 */
export async function queryConstitutionAssistant(
	query: string,
	aiBinding?: any
): Promise<{ answer: string; citations: { label: string; articleNumber: string; clauseNumber?: string }[] }> {
	const matchingArticles = searchConstitutionArticles(query);
	const primaryArticle = matchingArticles.length > 0 ? matchingArticles[0] : CONSTITUTION_ARTICLES[2];

	// Extract citations
	const citations: { label: string; articleNumber: string; clauseNumber?: string }[] = [];
	matchingArticles.slice(0, 3).forEach((art) => {
		if (art.clauses.length > 0) {
			citations.push({
				label: `Article ${art.clauses[0].clauseNumber}`,
				articleNumber: art.articleNumber,
				clauseNumber: art.clauses[0].clauseNumber
			});
		} else {
			citations.push({
				label: `Article ${art.articleNumber}`,
				articleNumber: art.articleNumber
			});
		}
	});

	// If Cloudflare Workers AI is available, execute LLM inference
	if (aiBinding && typeof aiBinding.run === 'function') {
		try {
			const contextText = matchingArticles
				.slice(0, 3)
				.map(
					(a) =>
						`[ARTICLE ${a.articleNumber}: ${a.title}]\n` +
						a.clauses.map((c) => `${c.clauseNumber} (${c.heading}): ${c.text}`).join('\n')
				)
				.join('\n\n');

			const systemPrompt = `You are the Atherstone Nature Reserve Constitutional Assistant.
Answer the landowner's question strictly based on the provided Atherstone PLO Constitution context below.
Be authoritative, clear, and precise. Include bracketed citations like [Article 3.4] or [Article 4.2].
If the question cannot be answered from the constitution, clearly state so.

CONSTITUTION TEXT:
${contextText}`;

			const response = await aiBinding.run('@cf/meta/llama-3.3-70b-instruct', {
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: query }
				],
				max_tokens: 512,
				temperature: 0.2
			});

			if (response && response.response) {
				return {
					answer: response.response,
					citations
				};
			}
		} catch (err) {
			console.warn('Workers AI call failed, falling back to rule-based engine:', err);
		}
	}

	// High-fidelity fallback knowledge engine matching constitutional topics
	const q = query.toLowerCase();

	if (q.includes('amend') || q.includes('change') || q.includes('threshold') || q.includes('special resolution') || q.includes('75%')) {
		return {
			answer: `Under **[Article 3.4] (Special Resolutions)**, any motion to amend this Constitution, alter external reserve boundaries, allow commercial concessions, or impose a capital levy exceeding R 50,000 requires a **Special Resolution**. A Special Resolution must pass with not less than **75.00% (7,500 basis points)** of the total reserve voting power.\n\nOrdinary operational resolutions require a Simple Majority (>50.00%) as outlined in **[Article 3.3]**.`,
			citations: [
				{ label: 'Article 3.4', articleNumber: '3', clauseNumber: '3.4' },
				{ label: 'Article 3.3', articleNumber: '3', clauseNumber: '3.3' }
			]
		};
	}

	if (q.includes('quota') || q.includes('hunt') || q.includes('off-take') || q.includes('allocation')) {
		return {
			answer: `Pursuant to **[Article 4.1]** and **[Article 4.2]**, annual wildlife off-take quotas are established following the collaborative game census with LEDET. Quotas are allocated to private landowners **strictly in proportion to their registered basis-point land ownership percentage** (10,000 bps = 100.00%).\n\nUnder **[Article 4.3] (Open-to-Buy Surplus Trading)**, co-owners who do not intend to utilize their full allocation may list surplus head on the platform marketplace for peer acquisition at official reserve tariffs.`,
			citations: [
				{ label: 'Article 4.2', articleNumber: '4', clauseNumber: '4.2' },
				{ label: 'Article 4.3', articleNumber: '4', clauseNumber: '4.3' }
			]
		};
	}

	if (q.includes('associate') || q.includes('family') || q.includes('delegate') || q.includes('guest')) {
		return {
			answer: `According to **[Article 2.3] (Associate Member Status)**, Associate Members (family, partners, or delegates designated by a sponsoring Main PLO Member) are granted real-time **read-only visibility** into the reserve calendar, active polls, census records, and document vaults. Associate Members **hold no independent voting power** or quota trading rights—ballots and quota transfers must be executed by the sponsoring Main PLO Member.`,
			citations: [
				{ label: 'Article 2.3', articleNumber: '2', clauseNumber: '2.3' },
				{ label: 'Article 2.1', articleNumber: '2', clauseNumber: '2.1' }
			]
		};
	}

	if (q.includes('quorum') || q.includes('agm') || q.includes('meeting')) {
		return {
			answer: `As stated in **[Article 3.2] (Quorum Requirements)**, an Annual General Meeting or formal electronic vote requires a legal quorum representing not less than **5,000 basis points (50.00%)** of the total reserve voting power present in person, by accredited proxy, or by digital platform ballot.`,
			citations: [
				{ label: 'Article 3.2', articleNumber: '3', clauseNumber: '3.2' }
			]
		};
	}

	if (q.includes('calendar') || q.includes('visit') || q.includes('access') || q.includes('book') || q.includes('firearm')) {
		return {
			answer: `Under **[Article 5.1] (Mandatory Visit Scheduling)**, all landowner visits, hunting parties, maintenance teams, and contractors must be registered on the Shared Reserve Calendar prior to arrival to coordinate lodge facilities and perimeter security. Additionally, **[Article 5.3]** requires a statutory minimum caliber of **.375 H&H Magnum** for dangerous game protection.`,
			citations: [
				{ label: 'Article 5.1', articleNumber: '5', clauseNumber: '5.1' },
				{ label: 'Article 5.3', articleNumber: '5', clauseNumber: '5.3' }
			]
		};
	}

	// General synthesized answer from the most relevant article
	return {
		answer: `Based on **[Article ${primaryArticle.articleNumber}] (${primaryArticle.title})**:\n\n${primaryArticle.summary}\n\nKey Constitutional Clauses:\n` +
			primaryArticle.clauses
				.map((c) => `- **[Article ${c.clauseNumber}] ${c.heading}**: ${c.text}`)
				.join('\n\n'),
		citations: primaryArticle.clauses.map((c) => ({
			label: `Article ${c.clauseNumber}`,
			articleNumber: primaryArticle.articleNumber,
			clauseNumber: c.clauseNumber
		}))
	};
}
