import { Card, Suit, Rank } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

/**
 * Convert rank to numeric value for comparison
 * Ace is high (14) except in low straights
 */
export function getRankValue(rank: Rank): number {
  switch (rank) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    case 'T': return 10;
    default: return parseInt(rank);
  }
}

/**
 * Convert rank to low value (Ace = 1) for low straights
 */
export function getRankValueLow(rank: Rank): number {
  return rank === 'A' ? 1 : getRankValue(rank);
}

/**
 * Create a card
 */
export function createCard(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

/**
 * Convert card to string representation
 */
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit.charAt(0).toUpperCase()}`;
}

/**
 * Parse card from string representation
 */
export function stringToCard(cardStr: string): Card {
  if (cardStr.length !== 2) {
    throw new Error(`Invalid card string: ${cardStr}`);
  }
  
  const rank = cardStr[0] as Rank;
  const suitChar = cardStr[1].toLowerCase();
  
  let suit: Suit;
  switch (suitChar) {
    case 'h': suit = 'hearts'; break;
    case 'd': suit = 'diamonds'; break;
    case 'c': suit = 'clubs'; break;
    case 's': suit = 'spades'; break;
    default: throw new Error(`Invalid suit: ${suitChar}`);
  }
  
  if (!RANKS.includes(rank)) {
    throw new Error(`Invalid rank: ${rank}`);
  }
  
  return createCard(suit, rank);
}

/**
 * Compare two cards by rank (for sorting)
 */
export function compareCards(a: Card, b: Card): number {
  return getRankValue(b.rank) - getRankValue(a.rank); // Descending order
}

/**
 * Check if two cards are equal
 */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Sort cards by rank (highest first)
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

/**
 * Group cards by rank
 */
export function groupCardsByRank(cards: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  
  for (const card of cards) {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank)!.push(card);
  }
  
  return groups;
}

/**
 * Group cards by suit
 */
export function groupCardsBySuit(cards: Card[]): Map<Suit, Card[]> {
  const groups = new Map<Suit, Card[]>();
  
  for (const card of cards) {
    if (!groups.has(card.suit)) {
      groups.set(card.suit, []);
    }
    groups.get(card.suit)!.push(card);
  }
  
  return groups;
}

/**
 * Check if cards form a straight sequence
 * Returns the high card of the straight, or null if no straight
 */
export function findStraight(cards: Card[]): Card | null {
  const sorted = sortCards(cards);
  const values = sorted.map(card => getRankValue(card.rank));
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  
  // Check for regular straight (5 consecutive cards)
  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
      // Found a straight, return the high card
      const highValue = uniqueValues[i];
      return sorted.find(card => getRankValue(card.rank) === highValue)!;
    }
  }
  
  // Check for low straight (A-2-3-4-5)
  if (uniqueValues.includes(14) && uniqueValues.includes(5) && 
      uniqueValues.includes(4) && uniqueValues.includes(3) && 
      uniqueValues.includes(2)) {
    // Return the 5 as high card for low straight
    return sorted.find(card => card.rank === '5')!;
  }
  
  return null;
}

/**
 * Check if cards form a flush (5+ cards of same suit)
 * Returns the suit and cards of the flush, or null if no flush
 */
export function findFlush(cards: Card[]): { suit: Suit; cards: Card[] } | null {
  const suitGroups = groupCardsBySuit(cards);
  
  for (const [suit, suitCards] of suitGroups) {
    if (suitCards.length >= 5) {
      // Sort by rank and return ALL cards of that suit (needed for straight flush detection)
      const sortedSuitCards = sortCards(suitCards);
      return {
        suit,
        cards: sortedSuitCards
      };
    }
  }
  
  return null;
}
