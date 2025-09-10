// Core game types for Texas Hold'em Poker Engine

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandEvaluation {
  rank: HandRank;
  value: number; // Numeric value for comparison (higher is better)
  bestFive: Card[]; // Best 5-card hand
  kickers: number[]; // Kicker values for tie-breaking
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerActionData {
  playerId: string;
  action: PlayerAction;
  amount: number;
  timestamp: number;
}

export type GameStage = 
  | 'waiting_for_players'
  | 'starting_hand'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'payouts'
  | 'hand_cleanup';

export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  chips: number;
  holeCards: Card[];
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  currentBet: number;
  totalBetThisHand: number;
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean; // Still in the game
  seatIndex: number;
  lastAction?: PlayerAction;
  timeLeft?: number; // Action timeout
}

export interface Seat {
  index: number;
  player: Player | null;
  isEmpty: boolean;
}

export interface Pot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs eligible for this pot
  isMainPot: boolean;
}

export interface BettingRound {
  currentBet: number;
  minRaise: number;
  lastRaiseAmount: number;
  lastRaiserIndex: number;
  actionIndex: number; // Current player to act
  isComplete: boolean;
  actions: PlayerActionData[];
}

export interface TableState {
  id: string;
  stage: GameStage;
  seats: Seat[];
  communityCards: Card[];
  pots: Pot[];
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentPlayerIndex: number;
  bettingRound: BettingRound;
  handNumber: number;
  blinds: {
    small: number;
    big: number;
  };
  maxPlayers: number;
  isHandActive: boolean;
  lastAction?: PlayerActionData;
  winners?: Array<{
    playerId: string;
    amount: number;
    handRank: HandRank;
    bestFive: Card[];
  }>;
}

// Socket event types
export interface JoinTableData {
  tableId: string;
  name: string;
}

export interface ActionData {
  amount?: number;
}

export interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: number;
}

// Client-safe versions (no hidden information)
export interface ClientPlayer extends Omit<Player, 'holeCards'> {
  holeCards: Card[] | null; // null for other players, actual cards for self
  hasCards: boolean;
}

export interface ClientTableState extends Omit<TableState, 'seats'> {
  seats: Array<{
    index: number;
    player: ClientPlayer | null;
    isEmpty: boolean;
  }>;
}

// Action request sent to current player
export interface ActionRequest {
  playerId: string;
  minBet: number;
  minRaise: number;
  maxBet: number; // Player's chip count
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
  callAmount: number;
  timeLeftMs: number;
}

// Showdown result
export interface ShowdownPlayer {
  playerId: string;
  handRank: HandRank;
  handValue: number;
  bestFive: Card[];
  holeCards: Card[];
  evaluation: HandEvaluation;
}

export interface ShowdownResult {
  players: ShowdownPlayer[];
  winners: Array<{
    playerId: string;
    rank: number;
  }>;
}
