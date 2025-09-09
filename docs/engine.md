# Poker Engine Documentation

This document explains the architecture and design of the Texas Hold'em poker engine.

## Overview

The poker engine is designed as a pure TypeScript module with no external dependencies (except for types). This makes it:

- **Deterministic**: Same inputs always produce same outputs
- **Testable**: Pure functions can be unit tested in isolation  
- **Portable**: Can run in any JavaScript environment
- **Secure**: Server-authoritative with no client-side game logic

## Core Architecture

### State Machine

The game follows a strict state machine pattern:

```
waiting_for_players → starting_hand → preflop → flop → turn → river → showdown → payouts → hand_cleanup
                                                                                              ↓
                                                                                         next_hand
```

#### State Descriptions

- **`waiting_for_players`**: Waiting for minimum 2 players to join
- **`starting_hand`**: Setting up new hand (blinds, dealing cards)
- **`preflop`**: First betting round after hole cards dealt
- **`flop`**: Betting round after 3 community cards revealed
- **`turn`**: Betting round after 4th community card revealed  
- **`river`**: Betting round after 5th community card revealed
- **`showdown`**: Revealing hands and determining winners
- **`payouts`**: Distributing winnings to players
- **`hand_cleanup`**: Resetting for next hand

### Data Models

#### TableState
```typescript
interface TableState {
  id: string;
  stage: GameStage;
  seats: Seat[];                    // Up to 5 seats
  communityCards: Card[];           // 0-5 cards
  pots: Pot[];                      // Main + side pots
  dealerIndex: number;              // Current dealer position
  smallBlindIndex: number;          // Small blind position
  bigBlindIndex: number;            // Big blind position
  currentPlayerIndex: number;       // Player to act
  bettingRound: BettingRound;       // Current betting state
  handNumber: number;               // Hand counter
  blinds: { small: number; big: number };
  maxPlayers: number;               // Table capacity
  isHandActive: boolean;            // Game in progress
}
```

#### Player
```typescript
interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  chips: number;                    // Current chip stack
  holeCards: Card[];                // Private cards (2)
  isDealer: boolean;                // Dealer button
  isSmallBlind: boolean;            // Small blind position
  isBigBlind: boolean;              // Big blind position
  currentBet: number;               // Bet this round
  totalBetThisHand: number;         // Total bet this hand
  isFolded: boolean;                // Has folded
  isAllIn: boolean;                 // All chips committed
  isActive: boolean;                // Still in game
  seatIndex: number;                // Seat position (0-4)
  lastAction?: PlayerAction;        // Last action taken
}
```

## Game Engine Modules

### 1. Cards & Deck (`cards.ts`, `deck.ts`)

**Cards**: Standard 52-card deck with utilities
- Ranks: `A, 2, 3, 4, 5, 6, 7, 8, 9, T, J, Q, K`
- Suits: `hearts, diamonds, clubs, spades`
- Functions: `getRankValue()`, `sortCards()`, `findStraight()`, `findFlush()`

**Deck**: Card management with shuffling
- Fisher-Yates shuffle algorithm
- Deal cards one at a time or in batches
- Track dealt vs remaining cards
- Support for deterministic test decks

### 2. Hand Evaluation (`handEvaluator.ts`)

Evaluates poker hands from 5-7 cards and returns:

```typescript
interface HandEvaluation {
  rank: HandRank;           // 'royal-flush', 'pair', etc.
  value: number;            // Numeric comparison value
  bestFive: Card[];         // Best 5-card combination
  kickers: number[];        // Tie-breaking values
}
```

**Algorithm**:
1. Check for straight flush / royal flush
2. Check for four of a kind  
3. Check for full house
4. Check for flush
5. Check for straight
6. Check for three of a kind
7. Check for two pair
8. Check for one pair
9. Default to high card

**Hand Values**: Each hand type has a base value (e.g., 8,000,000 for four of a kind) plus modifiers for specific cards and kickers.

### 3. Betting Logic (`betting.ts`)

Validates and processes all betting actions:

```typescript
interface BettingOptions {
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
  minBet: number;
  minRaise: number;
  maxBet: number;           // Player's chip count
  callAmount: number;
}
```

**Rules Enforced**:
- Minimum bet = big blind
- Minimum raise = last raise amount or big blind
- All-in when player has insufficient chips
- No string betting (bet amount must be declared)

**Betting Round Completion**:
- All active players have acted
- All active players have equal bets (or are all-in)
- Only one active player remains

### 4. Pot Management (`potManager.ts`)

Handles main pots and side pots for all-in scenarios:

**Side Pot Algorithm**:
1. Sort players by total bet amount (ascending)
2. Create pot levels at each bet threshold
3. Each pot includes players who bet at least that amount
4. Distribute pots to best hand at each level

**Example**: 
- Player A: All-in for 100
- Player B: All-in for 200  
- Player C: Bets 300

**Result**:
- Main pot: 300 (100 × 3 players) - eligible: A, B, C
- Side pot 1: 200 (100 × 2 players) - eligible: B, C
- Side pot 2: 100 (100 × 1 player) - eligible: C

### 5. Table Management (`table.ts`)

Main orchestrator class that:
- Manages game state transitions
- Processes player actions
- Handles player joins/leaves
- Manages dealer button rotation
- Enforces action timeouts
- Coordinates all engine modules

## Key Algorithms

### Dealer Button Rotation

```typescript
// Find next active player clockwise
function getNextActivePlayerIndex(currentIndex: number): number {
  for (let i = 1; i <= maxPlayers; i++) {
    const nextIndex = (currentIndex + i) % maxPlayers;
    if (seats[nextIndex].player?.isActive) {
      return nextIndex;
    }
  }
  return -1;
}
```

### Blind Positioning

- **Heads-up**: Dealer = small blind, other player = big blind
- **Multi-way**: Small blind = left of dealer, big blind = left of small blind

### Action Order

- **Pre-flop**: Left of big blind acts first
- **Post-flop**: Left of dealer acts first

### Hand Comparison

Hands are compared by:
1. Hand rank (flush beats straight)
2. Primary value (ace-high flush beats king-high flush)  
3. Kickers in order (ace-king high card beats ace-queen)

## Error Handling

The engine validates all inputs and throws descriptive errors:

- Invalid player actions (e.g., betting when should call)
- Insufficient chips for action
- Acting out of turn
- Invalid bet amounts
- Game state violations

## Testing Strategy

The engine includes comprehensive unit tests:

1. **Hand Evaluation**: All hand types, edge cases, tie-breakers
2. **Pot Management**: Side pots, distributions, edge cases  
3. **Betting Logic**: All actions, limits, validations
4. **Integration**: Full game scenarios

**Test Coverage**:
- Happy path scenarios
- Edge cases (ties, all-ins, disconnections)
- Error conditions
- Deterministic outcomes

## Performance Considerations

- **Hand Evaluation**: O(1) for 5 cards, O(C(n,5)) for 6-7 cards
- **Side Pot Calculation**: O(n log n) where n = number of players
- **Memory**: Minimal state, no unnecessary object creation
- **Determinism**: Same seed produces identical game outcomes

## Security Features

- **Server Authority**: All game logic runs on server
- **Input Validation**: Zod schemas validate all client inputs
- **Action Validation**: Double-check all actions are legal
- **State Integrity**: Immutable operations where possible
- **Anti-Cheat**: No client-side game state

## Extension Points

The engine is designed for easy extension:

1. **New Game Variants**: Omaha, Stud, etc.
2. **Tournament Support**: Blind levels, elimination
3. **Statistics**: Hand histories, player stats
4. **AI Players**: Bot integration points
5. **Custom Rules**: Antes, kill pots, etc.

## Example Usage

```typescript
// Create a table
const table = new Table('table-1', 5, 10, 20);

// Add players  
table.addPlayer('player-1', 'Alice', undefined, 1000);
table.addPlayer('player-2', 'Bob', undefined, 1000);

// Game starts automatically with 2+ players

// Process actions
table.processAction('player-1', 'call');
table.processAction('player-2', 'raise', 40);
table.processAction('player-1', 'call');

// Get current state
const state = table.getState();
console.log(state.stage); // 'flop'
console.log(state.communityCards.length); // 3
```

This architecture ensures a robust, testable, and maintainable poker engine that can handle all Texas Hold'em scenarios correctly.
