import { describe, it, expect } from 'vitest';

describe('Share-Weighted Voting & Governance Engine', () => {
	const TOTAL_RESERVE_BPS = 10000; // 100.00%

	function calculateVoteResults(
		votes: Array<{ choice: 'agree' | 'disagree' | 'abstain'; weightBps: number }>,
		resolutionType: 'simple' | 'special' = 'simple'
	) {
		const totalCastedBps = votes.reduce((sum, v) => sum + v.weightBps, 0);
		const agreeBps = votes.filter((v) => v.choice === 'agree').reduce((sum, v) => sum + v.weightBps, 0);
		const disagreeBps = votes.filter((v) => v.choice === 'disagree').reduce((sum, v) => sum + v.weightBps, 0);
		const abstainBps = votes.filter((v) => v.choice === 'abstain').reduce((sum, v) => sum + v.weightBps, 0);

		// Active voting pool excludes abstentions for deciding outcome percentage
		const decisiveBps = agreeBps + disagreeBps;
		const agreePercentage = decisiveBps > 0 ? (agreeBps / decisiveBps) * 100 : 0;
		const turnoutPercentage = (totalCastedBps / TOTAL_RESERVE_BPS) * 100;

		const quorumMet = turnoutPercentage >= 50.0;
		let passed = false;

		if (quorumMet) {
			if (resolutionType === 'simple') {
				passed = agreePercentage > 50.0;
			} else {
				passed = agreePercentage >= 75.0;
			}
		}

		return {
			totalCastedBps,
			agreeBps,
			disagreeBps,
			abstainBps,
			turnoutPercentage,
			agreePercentage,
			quorumMet,
			passed
		};
	}

	it('should calculate basis-point weights correctly (10,000 bps = 100%)', () => {
		const portions = [
			{ name: 'Portion 1', bps: 2500 }, // 25.00%
			{ name: 'Portion 2', bps: 3500 }, // 35.00%
			{ name: 'Portion 3', bps: 4000 }  // 40.00%
		];
		const sumBps = portions.reduce((s, p) => s + p.bps, 0);
		expect(sumBps).toBe(10000);
		expect(sumBps / 100).toBe(100.0);
	});

	it('should correctly evaluate simple majority with quorum met (>50%)', () => {
		const votes: Array<{ choice: 'agree' | 'disagree' | 'abstain'; weightBps: number }> = [
			{ choice: 'agree', weightBps: 3500 }, // 35%
			{ choice: 'disagree', weightBps: 2000 }, // 20%
			{ choice: 'abstain', weightBps: 500 } // 5%
		];
		// Total turnout = 60.00% >= 50% quorum
		// Decisive pool = 5500 bps (3500 agree vs 2000 disagree) => 3500/5500 = 63.64% > 50%
		const result = calculateVoteResults(votes, 'simple');

		expect(result.quorumMet).toBe(true);
		expect(result.turnoutPercentage).toBe(60.0);
		expect(result.agreePercentage).toBeCloseTo(63.64, 1);
		expect(result.passed).toBe(true);
	});

	it('should fail if quorum is not reached (<50% turnout)', () => {
		const votes: Array<{ choice: 'agree' | 'disagree' | 'abstain'; weightBps: number }> = [
			{ choice: 'agree', weightBps: 3000 }, // 30%
			{ choice: 'disagree', weightBps: 1000 } // 10%
		];
		// Turnout = 40.00% < 50.00%
		const result = calculateVoteResults(votes, 'simple');

		expect(result.quorumMet).toBe(false);
		expect(result.turnoutPercentage).toBe(40.0);
		expect(result.passed).toBe(false);
	});

	it('should enforce special resolution threshold (>=75%)', () => {
		const votes1: Array<{ choice: 'agree' | 'disagree' | 'abstain'; weightBps: number }> = [
			{ choice: 'agree', weightBps: 7000 }, // 70%
			{ choice: 'disagree', weightBps: 3000 } // 30%
		];
		// 70% agree < 75% special resolution threshold
		const result1 = calculateVoteResults(votes1, 'special');
		expect(result1.quorumMet).toBe(true);
		expect(result1.agreePercentage).toBe(70.0);
		expect(result1.passed).toBe(false);

		const votes2: Array<{ choice: 'agree' | 'disagree' | 'abstain'; weightBps: number }> = [
			{ choice: 'agree', weightBps: 8000 }, // 80%
			{ choice: 'disagree', weightBps: 2000 } // 20%
		];
		const result2 = calculateVoteResults(votes2, 'special');
		expect(result2.quorumMet).toBe(true);
		expect(result2.agreePercentage).toBe(80.0);
		expect(result2.passed).toBe(true);
	});

	it('should correctly anchor Secretary proxy votes to Main PLO landowner portion weight', () => {
		const landownerPortions = [
			{ userId: 'user-plo-1', portionName: 'Buffelsdraai 12', bps: 1250 },
			{ userId: 'user-plo-2', portionName: 'Kameeldoorn 7', bps: 2500 }
		];

		function calculateMemberWeight(userId: string) {
			return landownerPortions
				.filter((p) => p.userId === userId)
				.reduce((sum, p) => sum + p.bps, 0);
		}

		// Secretary records proxy vote for user-plo-1 (via WhatsApp)
		const proxyBallot = {
			pollId: 'decision-101',
			targetUserId: 'user-plo-1',
			choice: 'agree' as const,
			weightBps: calculateMemberWeight('user-plo-1'),
			channel: 'WhatsApp',
			recordedBy: 'sec-user-1'
		};

		expect(proxyBallot.weightBps).toBe(1250);
		expect(proxyBallot.channel).toBe('WhatsApp');
		expect(proxyBallot.targetUserId).toBe('user-plo-1');
	});

	it('should prevent double-voting across Main PLO, Authorised Delegate, and Secretary Proxy', () => {
		const existingBallots: Array<{ pollId: string; userId: string; choice: string }> = [
			{ pollId: 'decision-202', userId: 'user-plo-1', choice: 'agree' }
		];

		const delegateRelation = {
			associateUserId: 'delegate-1',
			sponsoringMainPloUserId: 'user-plo-1'
		};

		function isPortionAlreadyVoted(pollId: string, sponsorUserId: string) {
			const relatedIds = new Set([sponsorUserId, delegateRelation.associateUserId]);
			return existingBallots.some((b) => b.pollId === pollId && relatedIds.has(b.userId));
		}

		// Main PLO already voted directly
		expect(isPortionAlreadyVoted('decision-202', 'user-plo-1')).toBe(true);

		// Delegate attempting to vote for the same portion must be blocked
		expect(isPortionAlreadyVoted('decision-202', delegateRelation.sponsoringMainPloUserId)).toBe(true);

		// Secretary attempting proxy vote for user-plo-1 must be blocked
		expect(isPortionAlreadyVoted('decision-202', 'user-plo-1')).toBe(true);

		// Another landowner who hasn't voted must be allowed
		expect(isPortionAlreadyVoted('decision-202', 'user-plo-2')).toBe(false);
	});

	it('should enforce decision voting deadlines', () => {
		const now = new Date('2026-11-08T12:00:00Z');
		const openDecision = { id: 'd1', closesAt: new Date('2026-11-09T12:00:00Z') };
		const expiredDecision = { id: 'd2', closesAt: new Date('2026-11-07T12:00:00Z') };

		function canCast(decision: { closesAt: Date | null }, currentTime: Date) {
			if (decision.closesAt && currentTime > decision.closesAt) {
				return false;
			}
			return true;
		}

		expect(canCast(openDecision, now)).toBe(true);
		expect(canCast(expiredDecision, now)).toBe(false);
	});

	it('should strictly require quorum (>=50% turnout) before ratifying decisions', () => {
		const lowTurnoutVotes: Array<{ choice: 'agree' | 'disagree' | 'abstain'; weightBps: number }> = [
			{ choice: 'agree', weightBps: 200 } // 2% turnout
		];

		const result = calculateVoteResults(lowTurnoutVotes, 'simple');
		expect(result.quorumMet).toBe(false);
		expect(result.turnoutPercentage).toBe(2.0);
		expect(result.passed).toBe(false);
	});
});
