import { Player, Pot } from './types';

export interface PotDistribution {
  playerId: string;
  amount: number;
  potIndex: number;
}

/**
 * Calculate side pots from player bets
 */
export function calculateSidePots(players: Player[]): Pot[] {
  const activePlayers = players.filter(p => p.isActive && p.totalBetThisHand > 0);
  
  if (activePlayers.length === 0) {
    return [];
  }

  // Sort players by total bet amount (ascending)
  const sortedPlayers = [...activePlayers].sort((a, b) => a.totalBetThisHand - b.totalBetThisHand);
  
  const pots: Pot[] = [];
  let previousBetLevel = 0;

  for (let i = 0; i < sortedPlayers.length; i++) {
    const currentBetLevel = sortedPlayers[i].totalBetThisHand;
    
    if (currentBetLevel > previousBetLevel) {
      const potContribution = currentBetLevel - previousBetLevel;
      const eligiblePlayers = sortedPlayers.slice(i);
      
      // Calculate pot amount
      const potAmount = potContribution * eligiblePlayers.length;
      
      // Add contributions from players who bet more
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        // Already counted in the multiplication above
      }

      pots.push({
        amount: potAmount,
        eligiblePlayers: eligiblePlayers.map(p => p.id),
        isMainPot: i === 0,
      });
      
      previousBetLevel = currentBetLevel;
    }
  }

  return pots;
}

/**
 * Distribute pots to winners
 */
export function distributePots(
  pots: Pot[],
  winners: Array<{ playerId: string; rank: number }> // rank: 0 = best hand, 1 = second best, etc.
): PotDistribution[] {
  const distributions: PotDistribution[] = [];

  for (let potIndex = 0; potIndex < pots.length; potIndex++) {
    const pot = pots[potIndex];
    
    // Find the best hand rank among eligible players
    const eligibleWinners = winners.filter(w => pot.eligiblePlayers.includes(w.playerId));
    
    if (eligibleWinners.length === 0) {
      // This shouldn't happen, but if it does, distribute to all eligible players
      const share = Math.floor(pot.amount / pot.eligiblePlayers.length);
      for (const playerId of pot.eligiblePlayers) {
        distributions.push({
          playerId,
          amount: share,
          potIndex,
        });
      }
      continue;
    }

    // Find the best rank among eligible players
    const bestRank = Math.min(...eligibleWinners.map(w => w.rank));
    const potWinners = eligibleWinners.filter(w => w.rank === bestRank);

    // Split pot among winners with the best hand
    const share = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount % potWinners.length;

    for (let i = 0; i < potWinners.length; i++) {
      const winner = potWinners[i];
      let amount = share;
      
      // Give remainder to first winner(s)
      if (i < remainder) {
        amount += 1;
      }

      distributions.push({
        playerId: winner.playerId,
        amount,
        potIndex,
      });
    }
  }

  return distributions;
}

/**
 * Get total pot amount across all pots
 */
export function getTotalPotAmount(pots: Pot[]): number {
  return pots.reduce((total, pot) => total + pot.amount, 0);
}

/**
 * Validate pot calculations against player bets
 */
export function validatePots(players: Player[], pots: Pot[]): boolean {
  const totalPlayerBets = players.reduce((total, player) => total + player.totalBetThisHand, 0);
  const totalPotAmount = getTotalPotAmount(pots);
  
  return totalPlayerBets === totalPotAmount;
}

/**
 * Create a simple main pot when no side pots are needed
 */
export function createMainPot(players: Player[]): Pot[] {
  const totalAmount = players.reduce((total, player) => total + player.totalBetThisHand, 0);
  
  if (totalAmount === 0) {
    return [];
  }

  const eligiblePlayers = players
    .filter(p => p.isActive && !p.isFolded)
    .map(p => p.id);

  return [{
    amount: totalAmount,
    eligiblePlayers,
    isMainPot: true,
  }];
}

/**
 * Check if side pots are needed (any player is all-in with different bet amounts)
 */
export function needsSidePots(players: Player[]): boolean {
  const activePlayers = players.filter(p => p.isActive && p.totalBetThisHand > 0);
  
  if (activePlayers.length <= 1) {
    return false;
  }

  // Check if all players bet the same amount
  const betAmounts = activePlayers.map(p => p.totalBetThisHand);
  const uniqueBetAmounts = [...new Set(betAmounts)];
  
  return uniqueBetAmounts.length > 1;
}

/**
 * Get pot summary for display
 */
export function getPotSummary(pots: Pot[]): {
  mainPot: number;
  sidePots: number[];
  totalPot: number;
} {
  const mainPot = pots.find(p => p.isMainPot)?.amount || 0;
  const sidePots = pots.filter(p => !p.isMainPot).map(p => p.amount);
  const totalPot = getTotalPotAmount(pots);

  return {
    mainPot,
    sidePots,
    totalPot,
  };
}

/**
 * Apply pot distributions to players' chip stacks
 */
export function applyPotDistributions(
  players: Player[],
  distributions: PotDistribution[]
): void {
  for (const distribution of distributions) {
    const player = players.find(p => p.id === distribution.playerId);
    if (player) {
      player.chips += distribution.amount;
    }
  }
}

/**
 * Reset players' betting state for new hand
 */
export function resetPlayerBetsForNewHand(players: Player[]): void {
  for (const player of players) {
    player.currentBet = 0;
    player.totalBetThisHand = 0;
    player.isFolded = false;
    player.isAllIn = false;
    player.lastAction = undefined;
  }
}
