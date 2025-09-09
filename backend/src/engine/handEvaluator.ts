import { Card, HandRank, HandEvaluation, Rank } from './types';
import { 
  getRankValue, 
  sortCards, 
  groupCardsByRank, 
  findStraight, 
  findFlush 
} from './cards';

/**
 * Evaluate a poker hand from 5-7 cards
 * Returns the best 5-card hand with ranking and kickers
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('Hand evaluation requires 5-7 cards');
  }

  const sorted = sortCards(cards);
  const rankGroups = groupCardsByRank(cards);
  const flush = findFlush(cards);
  const straight = findStraight(cards);

  // Check for straight flush / royal flush
  if (flush && straight) {
    const flushCards = flush.cards;
    const straightInFlush = findStraight(flushCards);
    
    if (straightInFlush) {
      const highCard = straightInFlush;
      const isRoyal = getRankValue(highCard.rank) === 14; // Ace high
      
      return {
        rank: isRoyal ? 'royal-flush' : 'straight-flush',
        value: isRoyal ? 10000000 : 9000000 + getRankValue(highCard.rank),
        bestFive: getStraightFlushCards(flushCards, highCard),
        kickers: []
      };
    }
  }

  // Check for four of a kind
  const quads = findGroupsOfSize(rankGroups, 4);
  if (quads.length > 0) {
    const quadRank = quads[0];
    const quadCards = rankGroups.get(quadRank)!;
    const kicker = findKickers(sorted, [quadRank], 1)[0];
    
    return {
      rank: 'four-of-a-kind',
      value: 8000000 + getRankValue(quadRank) * 1000 + getRankValue(kicker.rank),
      bestFive: [...quadCards, kicker],
      kickers: [getRankValue(kicker.rank)]
    };
  }

  // Check for full house
  const trips = findGroupsOfSize(rankGroups, 3);
  const pairs = findGroupsOfSize(rankGroups, 2);
  
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const tripRank = trips[0]; // Highest trips
    const pairRank = trips.length > 1 ? trips[1] : pairs[0]; // Second trips or highest pair
    
    const tripCards = rankGroups.get(tripRank)!;
    const pairCards = rankGroups.get(pairRank)!.slice(0, 2);
    
    return {
      rank: 'full-house',
      value: 7000000 + getRankValue(tripRank) * 1000 + getRankValue(pairRank),
      bestFive: [...tripCards, ...pairCards],
      kickers: []
    };
  }

  // Check for flush
  if (flush) {
    const flushCards = flush.cards.slice(0, 5);
    const kickers = flushCards.map(card => getRankValue(card.rank));
    
    return {
      rank: 'flush',
      value: 6000000 + calculateKickerValue(kickers),
      bestFive: flushCards,
      kickers
    };
  }

  // Check for straight
  if (straight) {
    const straightCards = getStraightCards(sorted, straight);
    const highValue = getRankValue(straight.rank);
    
    return {
      rank: 'straight',
      value: 5000000 + highValue,
      bestFive: straightCards,
      kickers: []
    };
  }

  // Check for three of a kind
  if (trips.length > 0) {
    const tripRank = trips[0];
    const tripCards = rankGroups.get(tripRank)!;
    const kickers = findKickers(sorted, [tripRank], 2);
    const kickerValues = kickers.map(card => getRankValue(card.rank));
    
    return {
      rank: 'three-of-a-kind',
      value: 4000000 + getRankValue(tripRank) * 10000 + calculateKickerValue(kickerValues),
      bestFive: [...tripCards, ...kickers],
      kickers: kickerValues
    };
  }

  // Check for two pair
  if (pairs.length >= 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const highPairCards = rankGroups.get(highPair)!;
    const lowPairCards = rankGroups.get(lowPair)!;
    const kicker = findKickers(sorted, [highPair, lowPair], 1)[0];
    const kickerValue = getRankValue(kicker.rank);
    
    return {
      rank: 'two-pair',
      value: 3000000 + getRankValue(highPair) * 10000 + getRankValue(lowPair) * 100 + kickerValue,
      bestFive: [...highPairCards, ...lowPairCards, kicker],
      kickers: [kickerValue]
    };
  }

  // Check for one pair
  if (pairs.length > 0) {
    const pairRank = pairs[0];
    const pairCards = rankGroups.get(pairRank)!;
    const kickers = findKickers(sorted, [pairRank], 3);
    const kickerValues = kickers.map(card => getRankValue(card.rank));
    
    return {
      rank: 'pair',
      value: 2000000 + getRankValue(pairRank) * 100000 + calculateKickerValue(kickerValues),
      bestFive: [...pairCards, ...kickers],
      kickers: kickerValues
    };
  }

  // High card
  const bestFive = sorted.slice(0, 5);
  const kickerValues = bestFive.map(card => getRankValue(card.rank));
  
  return {
    rank: 'high-card',
    value: 1000000 + calculateKickerValue(kickerValues),
    bestFive,
    kickers: kickerValues
  };
}

/**
 * Find groups of cards with specific size
 */
function findGroupsOfSize(rankGroups: Map<Rank, Card[]>, size: number): Rank[] {
  const groups: Rank[] = [];
  
  for (const [rank, cards] of rankGroups) {
    if (cards.length === size) {
      groups.push(rank);
    }
  }
  
  // Sort by rank value (highest first)
  return groups.sort((a, b) => getRankValue(b) - getRankValue(a));
}

/**
 * Find kicker cards (highest cards not in used ranks)
 */
function findKickers(sorted: Card[], usedRanks: Rank[], count: number): Card[] {
  const kickers: Card[] = [];
  
  for (const card of sorted) {
    if (!usedRanks.includes(card.rank) && kickers.length < count) {
      kickers.push(card);
    }
  }
  
  return kickers;
}

/**
 * Calculate numeric value from kicker array for comparison
 */
function calculateKickerValue(kickers: number[]): number {
  let value = 0;
  for (let i = 0; i < kickers.length; i++) {
    value += kickers[i] * Math.pow(100, kickers.length - 1 - i);
  }
  return value;
}

/**
 * Get the 5 cards that form a straight flush
 */
function getStraightFlushCards(flushCards: Card[], highCard: Card): Card[] {
  const sorted = sortCards(flushCards);
  const highValue = getRankValue(highCard.rank);
  
  // Handle low straight (A-2-3-4-5)
  if (highValue === 5) {
    const ranks = ['A', '5', '4', '3', '2'];
    return ranks.map(rank => sorted.find(card => card.rank === rank)!);
  }
  
  // Regular straight
  const straightCards: Card[] = [];
  for (let i = 0; i < 5; i++) {
    const targetValue = highValue - i;
    const card = sorted.find(card => getRankValue(card.rank) === targetValue);
    if (card) straightCards.push(card);
  }
  
  return straightCards;
}

/**
 * Get the 5 cards that form a straight
 */
function getStraightCards(sorted: Card[], highCard: Card): Card[] {
  const highValue = getRankValue(highCard.rank);
  
  // Handle low straight (A-2-3-4-5)
  if (highValue === 5) {
    const ranks = ['5', '4', '3', '2', 'A'];
    return ranks.map(rank => sorted.find(card => card.rank === rank)!);
  }
  
  // Regular straight
  const straightCards: Card[] = [];
  for (let i = 0; i < 5; i++) {
    const targetValue = highValue - i;
    const card = sorted.find(card => getRankValue(card.rank) === targetValue);
    if (card) straightCards.push(card);
  }
  
  return straightCards;
}

/**
 * Compare two hand evaluations
 * Returns positive if hand1 > hand2, negative if hand1 < hand2, 0 if equal
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  return hand1.value - hand2.value;
}

/**
 * Get the best possible hand from any number of cards (5-7)
 */
export function getBestHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate hand');
  }
  
  if (cards.length === 5) {
    return evaluateHand(cards);
  }
  
  // For 6 or 7 cards, try all combinations of 5
  let bestHand: HandEvaluation | null = null;
  
  const combinations = getCombinations(cards, 5);
  for (const combo of combinations) {
    const evaluation = evaluateHand(combo);
    if (!bestHand || evaluation.value > bestHand.value) {
      bestHand = evaluation;
    }
  }
  
  return bestHand!;
}

/**
 * Generate all combinations of k items from array
 */
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  
  const combinations: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      combinations.push([...current]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return combinations;
}
