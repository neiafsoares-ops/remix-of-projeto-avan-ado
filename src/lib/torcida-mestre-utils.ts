import type { TorcidaMestreRound, TorcidaMestrePrediction } from '@/types/torcida-mestre';

export interface WinnerResult {
  winners: TorcidaMestrePrediction[];
  shouldAccumulate: boolean;
  reason?: 'team_lost' | 'no_winners' | 'draw_not_allowed';
}

/**
 * Calculates winners for a Torcida Mestre round
 * Winners must have exact score AND the club must have won (or drawn if allowed)
 */
export function calculateTorcidaMestreWinners(
  round: TorcidaMestreRound,
  predictions: TorcidaMestrePrediction[],
  allowDraws: boolean
): WinnerResult {
  // Check if scores are set
  if (round.home_score === null || round.away_score === null) {
    return { winners: [], shouldAccumulate: false };
  }

  const homeScore = round.home_score;
  const awayScore = round.away_score;
  
  // Determine if the club won based on home/away
  const clubWon = round.is_home 
    ? homeScore > awayScore
    : awayScore > homeScore;
  
  const isDraw = homeScore === awayScore;
  
  // If the club lost, accumulate
  if (!clubWon && !isDraw) {
    return { winners: [], shouldAccumulate: true, reason: 'team_lost' };
  }
  
  // If draw and draws not allowed, accumulate
  if (isDraw && !allowDraws) {
    return { winners: [], shouldAccumulate: true, reason: 'draw_not_allowed' };
  }
  
  // Filter predictions that match exact score
  const winners = predictions.filter(p => 
    p.home_score === homeScore && 
    p.away_score === awayScore
  );
  
  // If no one got exact score, accumulate
  if (winners.length === 0) {
    return { winners: [], shouldAccumulate: true, reason: 'no_winners' };
  }
  
  return { winners, shouldAccumulate: false };
}

/**
 * Calculates prize per winner after admin fee
 */
export function calculatePrizePerWinner(
  totalPrize: number,
  winnersCount: number,
  adminFeePercent: number
): number {
  if (winnersCount === 0) return 0;
  const afterFee = totalPrize * (1 - adminFeePercent / 100);
  return afterFee / winnersCount;
}

/**
 * Calculates total prize for a round including accumulated from previous rounds
 */
export function calculateRoundTotalPrize(
  entryFee: number,
  participantsCount: number,
  previousAccumulated: number
): number {
  return (entryFee * participantsCount) + previousAccumulated;
}

/**
 * Formats prize display
 */
export function formatPrize(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Gets result message based on winner calculation
 */
export function getResultMessage(result: WinnerResult, clubName: string): string {
  if (!result.shouldAccumulate) {
    const count = result.winners.length;
    return count === 1 
      ? '1 vencedor cravou o placar!' 
      : `${count} vencedores cravaram o placar!`;
  }
  
  switch (result.reason) {
    case 'team_lost':
      return `${clubName} perdeu - Prêmio acumulado!`;
    case 'draw_not_allowed':
      return 'Empate - Prêmio acumulado!';
    case 'no_winners':
      return 'Ninguém acertou - Prêmio acumulado!';
    default:
      return 'Prêmio acumulado!';
  }
}
