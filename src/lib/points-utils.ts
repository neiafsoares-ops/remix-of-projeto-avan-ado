/**
 * Utility functions for calculating and describing points in the bolão
 */

export interface PointsResult {
  points: number;
  rule: string;
  color: string;
  bgColor: string;
}

/**
 * Calculates points and returns the description of the rule applied
 */
export function getPointsDescription(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): PointsResult {
  // Placar exato = 5 pontos
  if (predHome === actualHome && predAway === actualAway) {
    return { 
      points: 5, 
      rule: 'Placar exato', 
      color: 'text-accent',
      bgColor: 'bg-accent text-accent-foreground'
    };
  }
  
  // Calcular vencedores
  const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
  
  // Calcular diferença de gols
  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;
  
  // Vencedor + diferença de gols = 3 pontos
  if (predWinner === actualWinner && predDiff === actualDiff) {
    return { 
      points: 3, 
      rule: 'Vencedor + diferença de gols', 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-600 text-white'
    };
  }
  
  // Apenas vencedor = 1 ponto
  if (predWinner === actualWinner) {
    return { 
      points: 1, 
      rule: 'Acertou o vencedor', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-600 text-white'
    };
  }
  
  return { 
    points: 0, 
    rule: 'Nenhum acerto', 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted text-muted-foreground'
  };
}

/**
 * Returns the points scoring rules for display
 */
export const SCORING_RULES = [
  { points: 5, description: 'Placar exato', color: 'bg-accent' },
  { points: 3, description: 'Vencedor + diferença de gols', color: 'bg-emerald-600' },
  { points: 1, description: 'Acertou o vencedor', color: 'bg-blue-600' },
  { points: 0, description: 'Nenhum acerto', color: 'bg-muted' },
];
