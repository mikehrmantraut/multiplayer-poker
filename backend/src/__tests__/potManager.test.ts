import { describe, it, expect } from 'vitest';
import { 
  calculateSidePots, 
  distributePots, 
  createMainPot, 
  needsSidePots,
  validatePots 
} from '../engine/potManager';
import { Player } from '../engine/types';

describe('PotManager', () => {
  // Helper function to create a test player
  const createPlayer = (id: string, chips: number, totalBet: number): Player => ({
    id,
    name: `Player ${id}`,
    chips,
    holeCards: [],
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    currentBet: 0,
    totalBetThisHand: totalBet,
    isFolded: false,
    isAllIn: chips === 0,
    isActive: true,
    seatIndex: 0,
  });

  describe('needsSidePots', () => {
    it('should return false when all players bet the same amount', () => {
      const players = [
        createPlayer('1', 100, 50),
        createPlayer('2', 100, 50),
        createPlayer('3', 100, 50),
      ];
      
      expect(needsSidePots(players)).toBe(false);
    });

    it('should return true when players bet different amounts', () => {
      const players = [
        createPlayer('1', 0, 100), // All-in for 100
        createPlayer('2', 50, 150), // Bet 150
        createPlayer('3', 0, 200), // All-in for 200
      ];
      
      expect(needsSidePots(players)).toBe(true);
    });

    it('should return false with only one player', () => {
      const players = [createPlayer('1', 100, 50)];
      
      expect(needsSidePots(players)).toBe(false);
    });
  });

  describe('createMainPot', () => {
    it('should create a main pot with correct amount', () => {
      const players = [
        createPlayer('1', 50, 100),
        createPlayer('2', 50, 100),
        createPlayer('3', 50, 100),
      ];
      
      const pots = createMainPot(players);
      
      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(300);
      expect(pots[0].isMainPot).toBe(true);
      expect(pots[0].eligiblePlayers).toEqual(['1', '2', '3']);
    });

    it('should exclude folded players from eligibility', () => {
      const players = [
        createPlayer('1', 50, 100),
        createPlayer('2', 50, 100),
        { ...createPlayer('3', 50, 100), isFolded: true },
      ];
      
      const pots = createMainPot(players);
      
      expect(pots[0].amount).toBe(300); // Still includes folded player's bet
      expect(pots[0].eligiblePlayers).toEqual(['1', '2']); // But not eligible to win
    });
  });

  describe('calculateSidePots', () => {
    it('should create correct side pots for all-in scenario', () => {
      const players = [
        createPlayer('1', 0, 100), // All-in for 100
        createPlayer('2', 0, 150), // All-in for 150  
        createPlayer('3', 50, 200), // Bet 200
      ];
      
      const pots = calculateSidePots(players);
      
      expect(pots).toHaveLength(3);
      
      // Main pot: 100 from each player = 300
      expect(pots[0].amount).toBe(300);
      expect(pots[0].isMainPot).toBe(true);
      expect(pots[0].eligiblePlayers).toEqual(['1', '2', '3']);
      
      // Side pot 1: 50 from players 2 and 3 = 100
      expect(pots[1].amount).toBe(100);
      expect(pots[1].isMainPot).toBe(false);
      expect(pots[1].eligiblePlayers).toEqual(['2', '3']);
      
      // Side pot 2: 50 from player 3 = 50
      expect(pots[2].amount).toBe(50);
      expect(pots[2].isMainPot).toBe(false);
      expect(pots[2].eligiblePlayers).toEqual(['3']);
    });

    it('should handle complex multi-way all-in', () => {
      const players = [
        createPlayer('1', 0, 50),  // All-in for 50
        createPlayer('2', 0, 100), // All-in for 100
        createPlayer('3', 0, 150), // All-in for 150
        createPlayer('4', 50, 200), // Bet 200
      ];
      
      const pots = calculateSidePots(players);
      
      expect(pots).toHaveLength(4);
      
      // Main pot: 50 * 4 = 200
      expect(pots[0].amount).toBe(200);
      expect(pots[0].eligiblePlayers).toEqual(['1', '2', '3', '4']);
      
      // Side pot 1: 50 * 3 = 150
      expect(pots[1].amount).toBe(150);
      expect(pots[1].eligiblePlayers).toEqual(['2', '3', '4']);
      
      // Side pot 2: 50 * 2 = 100
      expect(pots[2].amount).toBe(100);
      expect(pots[2].eligiblePlayers).toEqual(['3', '4']);
      
      // Side pot 3: 50 * 1 = 50
      expect(pots[3].amount).toBe(50);
      expect(pots[3].eligiblePlayers).toEqual(['4']);
    });
  });

  describe('distributePots', () => {
    it('should distribute single pot to winner', () => {
      const pots = [
        { amount: 300, eligiblePlayers: ['1', '2', '3'], isMainPot: true }
      ];
      
      const winners = [
        { playerId: '1', rank: 0 }, // Best hand
        { playerId: '2', rank: 1 }, // Second best
        { playerId: '3', rank: 2 }, // Worst hand
      ];
      
      const distributions = distributePots(pots, winners);
      
      expect(distributions).toHaveLength(1);
      expect(distributions[0]).toEqual({
        playerId: '1',
        amount: 300,
        potIndex: 0,
      });
    });

    it('should split pot on tie', () => {
      const pots = [
        { amount: 300, eligiblePlayers: ['1', '2', '3'], isMainPot: true }
      ];
      
      const winners = [
        { playerId: '1', rank: 0 }, // Tied for best
        { playerId: '2', rank: 0 }, // Tied for best
        { playerId: '3', rank: 1 }, // Worse hand
      ];
      
      const distributions = distributePots(pots, winners);
      
      expect(distributions).toHaveLength(2);
      expect(distributions[0].playerId).toBe('1');
      expect(distributions[0].amount).toBe(150);
      expect(distributions[1].playerId).toBe('2');
      expect(distributions[1].amount).toBe(150);
    });

    it('should distribute side pots correctly', () => {
      const pots = [
        { amount: 300, eligiblePlayers: ['1', '2', '3'], isMainPot: true },
        { amount: 100, eligiblePlayers: ['2', '3'], isMainPot: false },
        { amount: 50, eligiblePlayers: ['3'], isMainPot: false },
      ];
      
      const winners = [
        { playerId: '3', rank: 0 }, // Best hand
        { playerId: '2', rank: 1 }, // Second best
        { playerId: '1', rank: 2 }, // Worst hand
      ];
      
      const distributions = distributePots(pots, winners);
      
      expect(distributions).toHaveLength(3);
      
      // Player 3 wins all pots they're eligible for
      const player3Winnings = distributions.filter(d => d.playerId === '3');
      expect(player3Winnings).toHaveLength(3);
      expect(player3Winnings.reduce((sum, d) => sum + d.amount, 0)).toBe(450);
    });

    it('should handle odd pot splits with remainder', () => {
      const pots = [
        { amount: 301, eligiblePlayers: ['1', '2'], isMainPot: true } // Odd amount
      ];
      
      const winners = [
        { playerId: '1', rank: 0 }, // Tied
        { playerId: '2', rank: 0 }, // Tied
      ];
      
      const distributions = distributePots(pots, winners);
      
      expect(distributions).toHaveLength(2);
      
      const total = distributions.reduce((sum, d) => sum + d.amount, 0);
      expect(total).toBe(301);
      
      // First player should get the extra chip
      expect(distributions[0].amount).toBe(151);
      expect(distributions[1].amount).toBe(150);
    });
  });

  describe('validatePots', () => {
    it('should validate correct pot calculations', () => {
      const players = [
        createPlayer('1', 0, 100),
        createPlayer('2', 50, 150),
        createPlayer('3', 0, 200),
      ];
      
      const pots = calculateSidePots(players);
      
      expect(validatePots(players, pots)).toBe(true);
    });

    it('should detect incorrect pot calculations', () => {
      const players = [
        createPlayer('1', 50, 100),
        createPlayer('2', 50, 100),
      ];
      
      const incorrectPots = [
        { amount: 150, eligiblePlayers: ['1', '2'], isMainPot: true } // Should be 200
      ];
      
      expect(validatePots(players, incorrectPots)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no active players', () => {
      const players: Player[] = [];
      
      const pots = calculateSidePots(players);
      expect(pots).toHaveLength(0);
    });

    it('should handle single player', () => {
      const players = [createPlayer('1', 50, 100)];
      
      const pots = createMainPot(players);
      expect(pots[0].amount).toBe(100);
      expect(pots[0].eligiblePlayers).toEqual(['1']);
    });

    it('should handle players with zero bets', () => {
      const players = [
        createPlayer('1', 100, 0),
        createPlayer('2', 100, 0),
      ];
      
      const pots = createMainPot(players);
      expect(pots).toHaveLength(0);
    });
  });
});
