import { describe, it, expect } from 'vitest';
import { evaluateHand, getBestHand, compareHands } from '../engine/handEvaluator';
import { stringToCard } from '../engine/cards';
import { Card } from '../engine/types';

describe('HandEvaluator', () => {
  // Helper function to create cards from string array
  const createCards = (cardStrings: string[]): Card[] => {
    return cardStrings.map(str => stringToCard(str));
  };

  describe('Royal Flush', () => {
    it('should identify a royal flush', () => {
      const cards = createCards(['AS', 'KS', 'QS', 'JS', 'TS']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('royal-flush');
      expect(result.value).toBeGreaterThan(9000000);
    });

    it('should identify royal flush from 7 cards', () => {
      const cards = createCards(['AS', 'KS', 'QS', 'JS', 'TS', '2H', '3C']);
      const result = getBestHand(cards);
      
      expect(result.rank).toBe('royal-flush');
    });
  });

  describe('Straight Flush', () => {
    it('should identify a straight flush', () => {
      const cards = createCards(['9S', '8S', '7S', '6S', '5S']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('straight-flush');
      expect(result.value).toBeGreaterThan(8000000);
      expect(result.value).toBeLessThan(9000000);
    });

    it('should identify a low straight flush (A-2-3-4-5)', () => {
      const cards = createCards(['AS', '5S', '4S', '3S', '2S']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('straight-flush');
      expect(result.bestFive[0].rank).toBe('5'); // 5 high straight
    });
  });

  describe('Four of a Kind', () => {
    it('should identify four of a kind', () => {
      const cards = createCards(['AS', 'AH', 'AD', 'AC', 'KS']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('four-of-a-kind');
      expect(result.value).toBeGreaterThan(7000000);
      expect(result.value).toBeLessThan(8000000);
      expect(result.kickers).toEqual([13]); // King kicker
    });

    it('should pick higher four of a kind', () => {
      const cards1 = createCards(['AS', 'AH', 'AD', 'AC', 'KS']);
      const cards2 = createCards(['KS', 'KH', 'KD', 'KC', 'AS']);
      
      const result1 = evaluateHand(cards1);
      const result2 = evaluateHand(cards2);
      
      expect(compareHands(result1, result2)).toBeGreaterThan(0);
    });
  });

  describe('Full House', () => {
    it('should identify a full house', () => {
      const cards = createCards(['AS', 'AH', 'AD', 'KS', 'KH']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('full-house');
      expect(result.value).toBeGreaterThan(6000000);
      expect(result.value).toBeLessThan(7000000);
    });

    it('should pick higher full house by trips', () => {
      const cards1 = createCards(['AS', 'AH', 'AD', 'KS', 'KH']);
      const cards2 = createCards(['KS', 'KH', 'KD', 'AS', 'AH']);
      
      const result1 = evaluateHand(cards1);
      const result2 = evaluateHand(cards2);
      
      expect(compareHands(result1, result2)).toBeGreaterThan(0);
    });

    it('should handle full house from 7 cards with two trips', () => {
      const cards = createCards(['AS', 'AH', 'AD', 'KS', 'KH', 'KD', '2C']);
      const result = getBestHand(cards);
      
      expect(result.rank).toBe('full-house');
      expect(result.bestFive.filter(c => c.rank === 'K').length).toBe(3); // Kings full
      expect(result.bestFive.filter(c => c.rank === 'A').length).toBe(2); // of Aces
    });
  });

  describe('Flush', () => {
    it('should identify a flush', () => {
      const cards = createCards(['AS', 'KS', '9S', '7S', '3S']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('flush');
      expect(result.value).toBeGreaterThan(5000000);
      expect(result.value).toBeLessThan(6000000);
      expect(result.kickers).toEqual([14, 13, 9, 7, 3]); // A, K, 9, 7, 3
    });

    it('should pick higher flush by high cards', () => {
      const cards1 = createCards(['AS', 'KS', '9S', '7S', '3S']);
      const cards2 = createCards(['AH', 'QH', '9H', '7H', '3H']);
      
      const result1 = evaluateHand(cards1);
      const result2 = evaluateHand(cards2);
      
      expect(compareHands(result1, result2)).toBeGreaterThan(0); // King beats Queen
    });
  });

  describe('Straight', () => {
    it('should identify a straight', () => {
      const cards = createCards(['AS', 'KH', 'QD', 'JS', 'TC']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('straight');
      expect(result.value).toBeGreaterThan(4000000);
      expect(result.value).toBeLessThan(5000000);
    });

    it('should identify a low straight (A-2-3-4-5)', () => {
      const cards = createCards(['AS', '5H', '4D', '3S', '2C']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('straight');
      expect(result.bestFive[0].rank).toBe('5'); // 5 high straight
    });

    it('should not identify a straight with gap', () => {
      const cards = createCards(['AS', 'KH', 'QD', 'JS', '9C']);
      const result = evaluateHand(cards);
      
      expect(result.rank).not.toBe('straight');
    });
  });

  describe('Three of a Kind', () => {
    it('should identify three of a kind', () => {
      const cards = createCards(['AS', 'AH', 'AD', 'KS', 'QH']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('three-of-a-kind');
      expect(result.value).toBeGreaterThan(3000000);
      expect(result.value).toBeLessThan(4000000);
      expect(result.kickers).toEqual([13, 12]); // K, Q kickers
    });
  });

  describe('Two Pair', () => {
    it('should identify two pair', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'KH', 'QD']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('two-pair');
      expect(result.value).toBeGreaterThan(2000000);
      expect(result.value).toBeLessThan(3000000);
      expect(result.kickers).toEqual([12]); // Q kicker
    });

    it('should pick higher two pair', () => {
      const cards1 = createCards(['AS', 'AH', 'KS', 'KH', 'QD']);
      const cards2 = createCards(['AS', 'AH', 'QS', 'QH', 'KD']);
      
      const result1 = evaluateHand(cards1);
      const result2 = evaluateHand(cards2);
      
      expect(compareHands(result1, result2)).toBeGreaterThan(0); // A-K beats A-Q
    });
  });

  describe('One Pair', () => {
    it('should identify one pair', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'QH', 'JD']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('pair');
      expect(result.value).toBeGreaterThan(1000000);
      expect(result.value).toBeLessThan(2000000);
      expect(result.kickers).toEqual([13, 12, 11]); // K, Q, J kickers
    });
  });

  describe('High Card', () => {
    it('should identify high card', () => {
      const cards = createCards(['AS', 'KH', 'QS', 'JH', '9D']);
      const result = evaluateHand(cards);
      
      expect(result.rank).toBe('high-card');
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(1000000);
      expect(result.kickers).toEqual([14, 13, 12, 11, 9]); // A, K, Q, J, 9
    });
  });

  describe('Edge Cases', () => {
    it('should handle 7-card hands correctly', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'KH', 'QD', 'JC', '9S']);
      const result = getBestHand(cards);
      
      expect(result.rank).toBe('two-pair');
      expect(result.bestFive.length).toBe(5);
    });

    it('should throw error for less than 5 cards', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'KH']);
      
      expect(() => evaluateHand(cards)).toThrow();
    });

    it('should throw error for more than 7 cards', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'KH', 'QD', 'JC', '9S', '8H']);
      
      expect(() => evaluateHand(cards)).toThrow();
    });
  });

  describe('Hand Comparison', () => {
    it('should compare different hand ranks correctly', () => {
      const flush = createCards(['AS', 'KS', 'QS', 'JS', '9S']);
      const straight = createCards(['AH', 'KD', 'QC', 'JH', 'TS']);
      
      const flushResult = evaluateHand(flush);
      const straightResult = evaluateHand(straight);
      
      expect(compareHands(flushResult, straightResult)).toBeGreaterThan(0);
    });

    it('should compare same rank hands by kickers', () => {
      const highPair = createCards(['AS', 'AH', 'KS', 'QH', 'JD']);
      const lowPair = createCards(['AS', 'AH', 'KS', 'QH', 'TD']);
      
      const highResult = evaluateHand(highPair);
      const lowResult = evaluateHand(lowPair);
      
      expect(compareHands(highResult, lowResult)).toBeGreaterThan(0);
    });

    it('should identify ties correctly', () => {
      const hand1 = createCards(['AS', 'KH', 'QS', 'JH', 'TD']);
      const hand2 = createCards(['AD', 'KC', 'QH', 'JC', 'TS']);
      
      const result1 = evaluateHand(hand1);
      const result2 = evaluateHand(hand2);
      
      expect(compareHands(result1, result2)).toBe(0);
    });
  });
});
