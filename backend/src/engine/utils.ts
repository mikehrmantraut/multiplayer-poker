import { TableState, ClientTableState, Player, ClientPlayer } from './types';

/**
 * Convert server table state to client-safe state
 * Hides other players' hole cards
 */
export function sanitizeTableStateForClient(
  tableState: TableState, 
  clientPlayerId?: string
): ClientTableState {
  return {
    ...tableState,
    seats: tableState.seats.map(seat => ({
      index: seat.index,
      isEmpty: seat.isEmpty,
      player: seat.player ? sanitizePlayerForClient(seat.player, clientPlayerId) : null,
    })),
  };
}

/**
 * Convert server player to client-safe player
 * Hides hole cards unless it's the client's own player
 */
export function sanitizePlayerForClient(
  player: Player, 
  clientPlayerId?: string
): ClientPlayer {
  const isOwnPlayer = player.id === clientPlayerId;
  
  return {
    ...player,
    holeCards: isOwnPlayer ? player.holeCards : null,
    hasCards: player.holeCards.length > 0,
  };
}

/**
 * Generate a unique table ID
 */
export function generateTableId(): string {
  return `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique player ID
 */
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate player name
 */
export function isValidPlayerName(name: string): boolean {
  return typeof name === 'string' && 
         name.trim().length >= 2 && 
         name.trim().length <= 20 &&
         /^[a-zA-Z0-9_\-\s]+$/.test(name.trim());
}

/**
 * Validate avatar URL
 */
export function isValidAvatarUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get seat positions for UI layout
 * Returns CSS positioning for seats around the table
 */
export function getSeatPosition(seatIndex: number, totalSeats: number): {
  top: string;
  left: string;
  transform: string;
} {
  // Positions around an oval table
  const positions = [
    // Seat 0: Top-left
    { top: '10%', left: '20%', transform: 'translate(-50%, -50%)' },
    // Seat 1: Top-right  
    { top: '10%', left: '80%', transform: 'translate(-50%, -50%)' },
    // Seat 2: Right
    { top: '50%', left: '90%', transform: 'translate(-50%, -50%)' },
    // Seat 3: Bottom
    { top: '90%', left: '50%', transform: 'translate(-50%, -50%)' },
    // Seat 4: Left
    { top: '50%', left: '10%', transform: 'translate(-50%, -50%)' },
  ];

  if (seatIndex < 0 || seatIndex >= positions.length) {
    return positions[0]; // Default to first position
  }

  return positions[seatIndex];
}

/**
 * Format chip amount for display
 */
export function formatChips(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  } else {
    return amount.toString();
  }
}

/**
 * Format time remaining for action timer
 */
export function formatTimeRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${seconds}s`;
}

/**
 * Get hand rank display name
 */
export function getHandRankDisplayName(rank: string): string {
  const displayNames: Record<string, string> = {
    'high-card': 'High Card',
    'pair': 'Pair',
    'two-pair': 'Two Pair',
    'three-of-a-kind': 'Three of a Kind',
    'straight': 'Straight',
    'flush': 'Flush',
    'full-house': 'Full House',
    'four-of-a-kind': 'Four of a Kind',
    'straight-flush': 'Straight Flush',
    'royal-flush': 'Royal Flush',
  };

  return displayNames[rank] || rank;
}

/**
 * Get action display name
 */
export function getActionDisplayName(action: string): string {
  const displayNames: Record<string, string> = {
    'fold': 'Fold',
    'check': 'Check',
    'call': 'Call',
    'bet': 'Bet',
    'raise': 'Raise',
    'all-in': 'All In',
  };

  return displayNames[action] || action;
}

/**
 * Calculate pot odds for a player
 */
export function calculatePotOdds(potSize: number, betToCall: number): number {
  if (betToCall === 0) return 0;
  return potSize / betToCall;
}

/**
 * Validate betting amount
 */
export function isValidBetAmount(amount: any): boolean {
  return typeof amount === 'number' && 
         Number.isInteger(amount) && 
         amount >= 0 && 
         amount <= 1000000; // Reasonable maximum
}

/**
 * Deep clone an object (for state snapshots)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get random element from array
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate default avatar URL based on player name
 */
export function generateDefaultAvatar(name: string): string {
  // Use a simple avatar service
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=random&size=128`;
}

/**
 * Check if two arrays are equal (shallow comparison)
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
