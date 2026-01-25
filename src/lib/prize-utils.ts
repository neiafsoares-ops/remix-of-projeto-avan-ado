/**
 * Calculate the estimated prize for a betting pool
 * Formula: (Entry Fee × Active Participants) - Admin Fee
 */
export function calculateEstimatedPrize(
  entryFee: number,
  participantCount: number,
  adminFeePercent: number = 0
): number {
  if (entryFee <= 0 || participantCount <= 0) return 0;
  
  const totalPool = entryFee * participantCount;
  const adminFee = totalPool * (adminFeePercent / 100);
  return totalPool - adminFee;
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
