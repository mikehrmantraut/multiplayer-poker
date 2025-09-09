// Frontend types - mirrors backend types but client-safe
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

export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

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

export interface ClientPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  chips: number;
  holeCards: Card[] | null; // null for other players, actual cards for self
  hasCards: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  currentBet: number;
  totalBetThisHand: number;
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  seatIndex: number;
  lastAction?: PlayerAction;
  timeLeft?: number;
}

export interface Seat {
  index: number;
  player: ClientPlayer | null;
  isEmpty: boolean;
}

export interface Pot {
  amount: number;
  eligiblePlayers: string[];
  isMainPot: boolean;
}

export interface BettingRound {
  currentBet: number;
  minRaise: number;
  lastRaiseAmount: number;
  lastRaiserIndex: number;
  actionIndex: number;
  isComplete: boolean;
  actions: Array<{
    playerId: string;
    action: PlayerAction;
    amount: number;
    timestamp: number;
  }>;
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
  lastAction?: {
    playerId: string;
    action: PlayerAction;
    amount: number;
    timestamp: number;
  };
  winners?: Array<{
    playerId: string;
    amount: number;
    handRank: HandRank;
    bestFive: Card[];
  }>;
}

export interface ActionRequest {
  playerId: string;
  minBet: number;
  minRaise: number;
  maxBet: number;
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
  callAmount: number;
  timeLeftMs: number;
}

export interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: number;
}

export interface GameToast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
}

export interface PlayerState {
  id?: string;
  name?: string;
  avatarUrl?: string;
  isJoined: boolean;
  currentTableId?: string;
}

export interface UIState {
  showActionBar: boolean;
  actionRequest?: ActionRequest;
  betAmount: number;
  raiseAmount: number;
  selectedAction?: PlayerAction;
  showChat: boolean;
  chatMessages: ChatMessage[];
  toasts: GameToast[];
}

// Socket event types
export interface JoinTableData {
  tableId: string;
  name: string;
  avatarUrl?: string;
}

export interface ActionData {
  amount?: number;
}

export interface SocketResponse {
  success: boolean;
  error?: string;
  playerId?: string;
}

// UI Helper types
export interface SeatPosition {
  top: string;
  left: string;
  transform: string;
}
