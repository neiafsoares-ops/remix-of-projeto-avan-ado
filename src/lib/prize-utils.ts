/**
 * Calculate the estimated prize for a betting pool
 * Formula: Initial Prize + (Entry Fee × Active Participants) - Admin Fee
 */
export function calculateEstimatedPrize(
  entryFee: number,
  participantCount: number,
  adminFeePercent: number = 0,
  initialPrize: number = 0
): number {
  const totalFromFees = entryFee * participantCount;
  const adminFee = totalFromFees * (adminFeePercent / 100);
  return initialPrize + totalFromFees - adminFee;
}

/**
 * Format currency in Brazilian Real
 */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Determines if a pool requires mandatory approval for participation
 * Pools with entry fee > 0 always require approval
 */
export function requiresApproval(entryFee: number, isPublic: boolean): boolean {
  // If pool has entry fee, always requires approval
  if (entryFee > 0) return true;
  // Otherwise, only private pools require approval
  return !isPublic;
}
