import { Player, BettingRound, PlayerAction, PlayerActionData } from './types';

export interface BettingResult {
  isValid: boolean;
  error?: string;
  newBet?: number;
  newChips?: number;
}

export interface BettingOptions {
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
  minBet: number;
  minRaise: number;
  maxBet: number;
  callAmount: number;
}

/**
 * Calculate betting options for a player
 */
export function getBettingOptions(
  player: Player,
  bettingRound: BettingRound,
  bigBlind: number
): BettingOptions {
  const currentBet = bettingRound.currentBet;
  const playerBet = player.currentBet;
  const callAmount = Math.max(0, currentBet - playerBet);
  const maxBet = player.chips;

  // Player is all-in, no actions available
  if (player.isAllIn) {
    return {
      canCheck: false,
      canCall: false,
      canBet: false,
      canRaise: false,
      minBet: 0,
      minRaise: 0,
      maxBet: 0,
      callAmount: 0,
    };
  }

  // No betting yet this round
  if (currentBet === 0) {
    return {
      canCheck: true,
      canCall: false,
      canBet: maxBet > 0,
      canRaise: false,
      minBet: Math.min(bigBlind, maxBet),
      minRaise: 0,
      maxBet,
      callAmount: 0,
    };
  }

  // There's been betting
  const canCall = callAmount > 0 && maxBet >= callAmount;
  const canCheck = callAmount === 0;
  
  // Minimum raise is the last raise amount or big blind
  const minRaiseAmount = Math.max(bettingRound.lastRaiseAmount, bigBlind);
  const minRaise = currentBet + minRaiseAmount;
  const canRaise = maxBet + playerBet >= minRaise;

  return {
    canCheck,
    canCall,
    canBet: false, // Can't bet if there's already betting
    canRaise,
    minBet: 0,
    minRaise: Math.min(minRaise - playerBet, maxBet),
    maxBet,
    callAmount: Math.min(callAmount, maxBet),
  };
}

/**
 * Validate and process a player action
 */
export function processPlayerAction(
  player: Player,
  action: PlayerAction,
  amount: number,
  bettingRound: BettingRound,
  bigBlind: number
): BettingResult {
  const options = getBettingOptions(player, bettingRound, bigBlind);

  switch (action) {
    case 'fold':
      return { isValid: true, newBet: player.currentBet, newChips: player.chips };

    case 'check':
      if (!options.canCheck) {
        return { isValid: false, error: 'Cannot check when there is a bet to call' };
      }
      return { isValid: true, newBet: player.currentBet, newChips: player.chips };

    case 'call':
      if (!options.canCall) {
        return { isValid: false, error: 'Nothing to call' };
      }
      const callAmount = Math.min(options.callAmount, player.chips);
      return {
        isValid: true,
        newBet: player.currentBet + callAmount,
        newChips: player.chips - callAmount,
      };

    case 'bet':
      if (!options.canBet) {
        return { isValid: false, error: 'Cannot bet when there is already betting' };
      }
      if (amount < options.minBet) {
        return { isValid: false, error: `Minimum bet is ${options.minBet}` };
      }
      if (amount > options.maxBet) {
        return { isValid: false, error: `Maximum bet is ${options.maxBet}` };
      }
      return {
        isValid: true,
        newBet: player.currentBet + amount,
        newChips: player.chips - amount,
      };

    case 'raise':
      if (!options.canRaise) {
        return { isValid: false, error: 'Cannot raise' };
      }
      if (amount < options.minRaise) {
        return { isValid: false, error: `Minimum raise is ${options.minRaise}` };
      }
      if (amount > options.maxBet) {
        return { isValid: false, error: `Maximum raise is ${options.maxBet}` };
      }
      return {
        isValid: true,
        newBet: player.currentBet + amount,
        newChips: player.chips - amount,
      };

    case 'all-in':
      if (player.chips === 0) {
        return { isValid: false, error: 'No chips to go all-in' };
      }
      return {
        isValid: true,
        newBet: player.currentBet + player.chips,
        newChips: 0,
      };

    default:
      return { isValid: false, error: 'Invalid action' };
  }
}

/**
 * Apply an action to a player and update betting round
 */
export function applyPlayerAction(
  player: Player,
  action: PlayerAction,
  amount: number,
  bettingRound: BettingRound,
  bigBlind: number
): { success: boolean; error?: string } {
  const result = processPlayerAction(player, action, amount, bettingRound, bigBlind);
  
  if (!result.isValid) {
    return { success: false, error: result.error };
  }

  // Update player state
  const oldBet = player.currentBet;
  player.currentBet = result.newBet!;
  player.chips = result.newChips!;
  player.lastAction = action;

  if (action === 'fold') {
    player.isFolded = true;
  }

  if (player.chips === 0) {
    player.isAllIn = true;
  }

  // Update betting round
  const betIncrease = player.currentBet - oldBet;
  player.totalBetThisHand += betIncrease;

  if (action === 'bet' || action === 'raise' || action === 'all-in') {
    const newCurrentBet = Math.max(bettingRound.currentBet, player.currentBet);
    if (newCurrentBet > bettingRound.currentBet) {
      bettingRound.lastRaiseAmount = newCurrentBet - bettingRound.currentBet;
      bettingRound.currentBet = newCurrentBet;
    }
  }

  // Record the action
  const actionData: PlayerActionData = {
    playerId: player.id,
    action,
    amount: betIncrease,
    timestamp: Date.now(),
  };
  bettingRound.actions.push(actionData);

  return { success: true };
}

/**
 * Check if betting round is complete
 */
export function isBettingRoundComplete(
  players: Player[],
  bettingRound: BettingRound
): boolean {
  const activePlayers = players.filter(p => p.isActive && !p.isFolded);
  
  if (activePlayers.length <= 1) {
    return true;
  }

  // Check if all active players have acted
  const playersWhoNeedToAct = activePlayers.filter(p => {
    // Player needs to act if:
    // 1. They haven't acted yet this round, OR
    // 2. Their current bet is less than the current bet and they're not all-in
    const hasActed = bettingRound.actions.some(a => a.playerId === p.id);
    const needsToCallOrFold = p.currentBet < bettingRound.currentBet && !p.isAllIn;
    
    return !hasActed || needsToCallOrFold;
  });

  return playersWhoNeedToAct.length === 0;
}

/**
 * Get the next player to act
 */
export function getNextPlayerToAct(
  players: Player[],
  currentPlayerIndex: number,
  bettingRound: BettingRound
): number {
  const activePlayers = players.filter(p => p.isActive && !p.isFolded);
  
  if (activePlayers.length <= 1) {
    return -1; // No one needs to act
  }

  // Find players who still need to act
  for (let i = 0; i < players.length; i++) {
    const playerIndex = (currentPlayerIndex + 1 + i) % players.length;
    const player = players[playerIndex];
    
    if (!player || !player.isActive || player.isFolded || player.isAllIn) {
      continue;
    }

    // Check if player needs to act
    const hasActed = bettingRound.actions.some(a => a.playerId === player.id);
    const needsToCallOrFold = player.currentBet < bettingRound.currentBet;
    
    if (!hasActed || needsToCallOrFold) {
      return playerIndex;
    }
  }

  return -1; // Everyone has acted appropriately
}

/**
 * Reset betting round for new stage
 */
export function resetBettingRound(
  bettingRound: BettingRound,
  players: Player[],
  isPreflop: boolean = false
): void {
  if (!isPreflop) {
    // For post-flop rounds, reset all bets
    bettingRound.currentBet = 0;
    bettingRound.minRaise = 0;
    bettingRound.lastRaiseAmount = 0;
    bettingRound.lastRaiserIndex = -1;
    
    // Reset player bets for the new round (but keep total bet this hand)
    for (const player of players) {
      player.currentBet = 0;
      player.lastAction = undefined;
    }
  } else {
    // For preflop, don't reset currentBet as blinds are already posted
    // Just reset the action tracking
    bettingRound.lastRaiserIndex = -1;
    
    // Clear last actions but keep current bets (blinds)
    for (const player of players) {
      player.lastAction = undefined;
    }
  }
  
  bettingRound.actionIndex = -1;
  bettingRound.isComplete = false;
  bettingRound.actions = [];
}
