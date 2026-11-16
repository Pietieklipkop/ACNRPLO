import { describe, it, expect } from 'vitest';

describe('Financial & Quota Mathematical Calculations', () => {
	it('should format ZAR currency amounts accurately', () => {
		function formatZar(cents: number): string {
			const isNegative = cents < 0;
			const absCents = Math.abs(cents);
			const rands = (absCents / 100).toLocaleString('en-ZA', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
			return `${isNegative ? '-' : ''}R ${rands}`;
		}

		expect(formatZar(45000000)).toMatch(/R\s*450[,\s\u00a0]000[.,]00/);
		expect(formatZar(-6850000)).toMatch(/-R\s*68[,\s\u00a0]500[.,]00/);
		expect(formatZar(0)).toMatch(/R\s*0[.,]00/);
		expect(formatZar(1550)).toMatch(/R\s*15[.,]50/);
	});

	it('should accurately compute consolidated reserve liquidity', () => {
		const ledger = [
			{ account: 'Operating Account', amountCents: 45000000 },
			{ account: 'Reserve Capital Fund', amountCents: 50000000 },
			{ account: 'Operating Account', amountCents: -6850000 },
			{ account: 'Emergency Anti-Poaching Fund', amountCents: -11500000 },
			{ account: 'Boma Operations', amountCents: 32000000 },
			{ account: 'Operating Account', amountCents: -3450000 }
		];

		const totalLiquidityCents = ledger.reduce((sum, item) => sum + item.amountCents, 0);
		// 450,000 + 500,000 - 68,500 - 115,000 + 320,000 - 34,500 = 1,052,000 ZAR => 105,200,000 cents
		expect(totalLiquidityCents).toBe(105200000);

		const operatingBalance = ledger
			.filter((i) => i.account === 'Operating Account')
			.reduce((sum, item) => sum + item.amountCents, 0);
		// 450,000 - 68,500 - 34,500 = 347,000 ZAR => 34,700,000 cents
		expect(operatingBalance).toBe(34700000);
	});

	it('should calculate quota remaining balance and prevent off-take exceeding allocation', () => {
		const allocation = {
			species: 'Kudu',
			allocatedHead: 10,
			huntedHead: 4,
			openToBuyHead: 2
		};

		const remainingHead = Math.max(0, allocation.allocatedHead - allocation.huntedHead);
		expect(remainingHead).toBe(6);

		// Record a hunt of 3 head
		const updatedHunted = allocation.huntedHead + 3;
		const updatedRemaining = Math.max(0, allocation.allocatedHead - updatedHunted);
		expect(updatedRemaining).toBe(3);

		// Open to buy cannot exceed remaining capacity
		expect(allocation.openToBuyHead <= remainingHead).toBe(true);
	});

	it('should allocate quotas proportionally to ownership basis points', () => {
		const totalQuotaHead = 20; // 20 Kudu for reserve
		const members = [
			{ name: 'Member A', ownershipBps: 2500 }, // 25.00% => 5 head
			{ name: 'Member B', ownershipBps: 3500 }, // 35.00% => 7 head
			{ name: 'Member C', ownershipBps: 4000 }  // 40.00% => 8 head
		];

		const allocations = members.map((m) => ({
			name: m.name,
			allocated: Math.floor((m.ownershipBps / 10000) * totalQuotaHead)
		}));

		expect(allocations[0].allocated).toBe(5);
		expect(allocations[1].allocated).toBe(7);
		expect(allocations[2].allocated).toBe(8);
		const sumAllocated = allocations.reduce((sum, a) => sum + a.allocated, 0);
		expect(sumAllocated).toBe(totalQuotaHead);
	});
});
