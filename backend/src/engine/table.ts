import { 
  TableState, 
  Player, 
  Seat, 
  GameStage, 
  PlayerAction,
  BettingRound,
  Pot,
  ActionRequest,
  ShowdownResult,
  ShowdownPlayer,
  Card
} from './types';
import { Deck } from './deck';
import { evaluateHand, getBestHand, compareHands } from './handEvaluator';
import { 
  getBettingOptions, 
  applyPlayerAction, 
  isBettingRoundComplete, 
  getNextPlayerToAct,
  resetBettingRound 
} from './betting';
import { 
  calculateSidePots, 
  distributePots, 
  createMainPot, 
  needsSidePots,
  applyPotDistributions,
  resetPlayerBetsForNewHand 
} from './potManager';

export class Table {
  private state: TableState;
  private deck: Deck;
  private actionTimer?: NodeJS.Timeout;
  private readonly ACTION_TIMEOUT_MS = 20000; // 20 seconds
  
  // Centralized notifier to broadcast state changes
  private notifyStateChange(): void {
    if (this.eventCallbacks.onStateChange) {
      this.eventCallbacks.onStateChange();
    }
  }
  private eventCallbacks: {
    onStateChange?: () => void;
    onActionRequest?: (request: ActionRequest) => void;
  } = {};

  constructor(
    id: string, 
    maxPlayers: number = 5, 
    smallBlind: number = 5, 
    bigBlind: number = 10
  ) {
    this.deck = new Deck();
    this.state = {
      id,
      stage: 'waiting_for_players',
      seats: Array.from({ length: maxPlayers }, (_, i) => ({
        index: i,
        player: null,
        isEmpty: true,
      })),
      communityCards: [],
      pots: [],
      dealerIndex: 0,
      smallBlindIndex: 1,
      bigBlindIndex: 2,
      currentPlayerIndex: -1,
      bettingRound: {
        currentBet: 0,
        minRaise: bigBlind,
        lastRaiseAmount: bigBlind,
        lastRaiserIndex: -1,
        actionIndex: -1,
        isComplete: false,
        actions: [],
      },
      handNumber: 0,
      blinds: { small: smallBlind, big: bigBlind },
      maxPlayers,
      isHandActive: false,
    };
  }

  /**
   * Get current table state (for broadcasting)
   */
  getState(): TableState {
    return { ...this.state };
  }

  /**
   * Set event callbacks for socket communication
   */
  setEventCallbacks(callbacks: {
    onStateChange?: () => void;
    onActionRequest?: (request: ActionRequest) => void;
  }): void {
    this.eventCallbacks = callbacks;
  }

  /**
   * Add a player to the table
   */
  addPlayer(id: string, name: string, avatarUrl?: string, chips: number = 1000): boolean {
    if (this.getPlayerCount() >= this.state.maxPlayers) {
      return false;
    }

    // Find first empty seat
    const emptySeatIndex = this.state.seats.findIndex(seat => seat.isEmpty);
    if (emptySeatIndex === -1) {
      return false;
    }

    const player: Player = {
      id,
      name,
      avatarUrl,
      chips,
      holeCards: [],
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      currentBet: 0,
      totalBetThisHand: 0,
      isFolded: false,
      isAllIn: false,
      isActive: true,
      seatIndex: emptySeatIndex,
      lastAction: undefined,
    };

    this.state.seats[emptySeatIndex] = {
      index: emptySeatIndex,
      player,
      isEmpty: false,
    };

    // If this is the first player, make them dealer
    if (this.getPlayerCount() === 1) {
      player.isDealer = true;
      this.state.dealerIndex = emptySeatIndex;
    }

    // Start game if we have enough players
    if (this.getPlayerCount() >= 2 && this.state.stage === 'waiting_for_players') {
      this.startNewHand();
    }

    // Notify state change
    this.notifyStateChange();

    return true;
  }

  /**
   * Remove a player from the table
   */
  removePlayer(playerId: string): boolean {
    const seatIndex = this.state.seats.findIndex(
      seat => !seat.isEmpty && seat.player!.id === playerId
    );

    if (seatIndex === -1) {
      return false;
    }

    this.state.seats[seatIndex] = {
      index: seatIndex,
      player: null,
      isEmpty: true,
    };

    // Handle ongoing game state
    if (this.state.isHandActive) {
      this.handlePlayerLeaving(seatIndex);
    }

    // Stop game if not enough players
    if (this.getPlayerCount() < 2) {
      this.state.stage = 'waiting_for_players';
      this.state.isHandActive = false;
      this.clearActionTimer();
    }

    return true;
  }

  /**
   * Process a player action
   */
  processAction(playerId: string, action: PlayerAction, amount: number = 0): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    // Validate it's the player's turn
    if (this.state.currentPlayerIndex !== player.seatIndex) {
      return false;
    }

    // Validate game state
    if (!this.isActionStage() || !this.state.isHandActive) {
      return false;
    }

    // Process the action
    const result = applyPlayerAction(
      player, 
      action, 
      amount, 
      this.state.bettingRound, 
      this.state.blinds.big
    );

    if (!result.success) {
      return false;
    }

    // Clear action timer
    this.clearActionTimer();

    // Update last action
    this.state.lastAction = {
      playerId,
      action,
      amount,
      timestamp: Date.now(),
    };

    // If all remaining active players are all-in, instantly reveal remaining community cards
    const activeNotFolded = this.getActivePlayers().filter(p => !p.isFolded);
    const everyoneAllIn = activeNotFolded.length >= 2 && activeNotFolded.every(p => p.isAllIn);
    if (everyoneAllIn) {
      this.clearActionTimer();
      this.revealRemainingToShowdown();
    } else {
      // Otherwise proceed with normal betting flow
      if (isBettingRoundComplete(this.getActivePlayers(), this.state.bettingRound)) {
        this.completeBettingRound();
      } else {
        this.moveToNextPlayer();
      }
    }

    // Notify state change
    if (this.eventCallbacks.onStateChange) {
      this.eventCallbacks.onStateChange();
    }

    return true;
  }

  /**
   * Reveal all remaining community cards and move directly to showdown
   * when betting is effectively over (everyone all-in)
   */
  private revealRemainingToShowdown(): void {
    // Deal remaining streets without starting betting rounds
    switch (this.state.stage) {
      case 'preflop':
        // Flop
        this.deck.dealCard();
        this.state.communityCards = this.deck.dealCards(3);
        // Turn
        this.deck.dealCard();
        this.state.communityCards.push(this.deck.dealCard());
        // River
        this.deck.dealCard();
        this.state.communityCards.push(this.deck.dealCard());
        break;
      case 'flop':
        // Turn
        this.deck.dealCard();
        this.state.communityCards.push(this.deck.dealCard());
        // River
        this.deck.dealCard();
        this.state.communityCards.push(this.deck.dealCard());
        break;
      case 'turn':
        // River
        this.deck.dealCard();
        this.state.communityCards.push(this.deck.dealCard());
        break;
      default:
        break;
    }

    // Move directly to showdown
    this.startShowdown();

    // Notify state change after revealing
    if (this.eventCallbacks.onStateChange) {
      this.eventCallbacks.onStateChange();
    }
  }

  /**
   * Get action request for current player
   */
  getActionRequest(): ActionRequest | null {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || !this.isActionStage()) {
      return null;
    }

    const options = getBettingOptions(
      currentPlayer, 
      this.state.bettingRound, 
      this.state.blinds.big
    );

    return {
      playerId: currentPlayer.id,
      minBet: options.minBet,
      minRaise: options.minRaise,
      maxBet: options.maxBet,
      canCheck: options.canCheck,
      canCall: options.canCall,
      canBet: options.canBet,
      canRaise: options.canRaise,
      callAmount: options.callAmount,
      timeLeftMs: this.ACTION_TIMEOUT_MS,
    };
  }

  /**
   * Start a new hand
   */
  private startNewHand(): void {
    const players = this.getActivePlayers();
    console.log('🃏 Starting new hand with players:', players.length);
    
    if (players.length < 2) {
      console.log('❌ Not enough players to start hand');
      return;
    }

    // Reset for new hand
    this.state.handNumber++;
    this.state.isHandActive = true;
    this.state.stage = 'starting_hand';
    console.log('✅ Hand started, number:', this.state.handNumber);
    this.state.communityCards = [];
    this.state.pots = [];
    // Broadcast that a new hand is initializing and board cleared
    this.notifyStateChange();
    
    // Reset players
    resetPlayerBetsForNewHand(players);
    for (const player of players) {
      player.holeCards = [];
    }

    // Rotate dealer button
    this.rotateDealerButton();

    // Set blinds
    this.setBlinds();

    // Shuffle and deal
    this.deck.reset();
    this.deck.shuffle();
    this.dealHoleCards();

    // Start preflop betting
    this.state.stage = 'preflop';
    this.notifyStateChange();
    this.startBettingRound();
  }

  /**
   * Complete current betting round and move to next stage
   */
  private completeBettingRound(): void {
    const activePlayers = this.getActivePlayers().filter(p => !p.isFolded);
    
    // If only one player left, they win
    if (activePlayers.length <= 1) {
      this.handleSinglePlayerWin();
      return;
    }

    // Move to next stage
    switch (this.state.stage) {
      case 'preflop':
        this.dealFlop();
        break;
      case 'flop':
        this.dealTurn();
        break;
      case 'turn':
        this.dealRiver();
        break;
      case 'river':
        this.startShowdown();
        break;
      default:
        break;
    }
  }

  /**
   * Deal the flop (3 community cards)
   */
  private dealFlop(): void {
    this.deck.dealCard(); // Burn card
    this.state.communityCards = this.deck.dealCards(3);
    this.state.stage = 'flop';
    this.startBettingRound();
  }

  /**
   * Deal the turn (4th community card)
   */
  private dealTurn(): void {
    this.deck.dealCard(); // Burn card
    this.state.communityCards.push(this.deck.dealCard());
    this.state.stage = 'turn';
    this.startBettingRound();
  }

  /**
   * Deal the river (5th community card)
   */
  private dealRiver(): void {
    this.deck.dealCard(); // Burn card
    this.state.communityCards.push(this.deck.dealCard());
    this.state.stage = 'river';
    this.startBettingRound();
  }

  /**
   * Start showdown phase
   */
  private startShowdown(): void {
    this.state.stage = 'showdown';
    this.notifyStateChange();
    
    const showdownPlayers = this.getActivePlayers().filter(p => !p.isFolded);
    const results = this.evaluateShowdown(showdownPlayers);
    
    // Calculate and distribute pots
    this.distributePots(results);
    
    // Move to payouts stage
    this.state.stage = 'payouts';
    this.notifyStateChange();
    
    // Schedule hand cleanup
    setTimeout(() => {
      this.cleanupHand();
    }, 3000);
  }

  /**
   * Evaluate showdown and determine winners
   */
  private evaluateShowdown(players: Player[]): ShowdownResult {
    const showdownPlayers: ShowdownPlayer[] = [];
    
    for (const player of players) {
      const allCards = [...player.holeCards, ...this.state.communityCards];
      const evaluation = getBestHand(allCards);
      
      showdownPlayers.push({
        playerId: player.id,
        handRank: evaluation.rank,
        handValue: evaluation.value,
        bestFive: evaluation.bestFive,
        holeCards: player.holeCards,
        evaluation,
      });
    }

    // Sort by hand strength (best first)
    showdownPlayers.sort((a, b) => b.handValue - a.handValue);
    
    // Assign ranks (0 = best, 1 = second best, etc.)
    const winners: Array<{ playerId: string; rank: number }> = [];
    let currentRank = 0;
    let currentValue = showdownPlayers[0]?.handValue;
    
    for (const player of showdownPlayers) {
      if (player.handValue < currentValue) {
        currentRank++;
        currentValue = player.handValue;
      }
      winners.push({ playerId: player.playerId, rank: currentRank });
    }

    return { players: showdownPlayers, winners };
  }

  /**
   * Distribute pots to winners
   */
  private distributePots(showdownResult: ShowdownResult): void {
    // Calculate side pots
    const pots = needsSidePots(this.getActivePlayers()) 
      ? calculateSidePots(this.getActivePlayers())
      : createMainPot(this.getActivePlayers());
    
    this.state.pots = pots;

    // Distribute pots
    const distributions = distributePots(pots, showdownResult.winners);
    
    // Apply distributions
    applyPotDistributions(this.getActivePlayers(), distributions);

    // Set winners for display
    this.state.winners = distributions.map(d => {
      const player = showdownResult.players.find(p => p.playerId === d.playerId)!;
      return {
        playerId: d.playerId,
        amount: d.amount,
        handRank: player.handRank,
        bestFive: player.bestFive,
      };
    });
  }

  /**
   * Handle single player winning (everyone else folded)
   */
  private handleSinglePlayerWin(): void {
    const winner = this.getActivePlayers().find(p => !p.isFolded);
    if (!winner) return;

    const totalPot = this.getActivePlayers().reduce((sum, p) => sum + p.totalBetThisHand, 0);
    winner.chips += totalPot;

    this.state.winners = [{
      playerId: winner.id,
      amount: totalPot,
      handRank: 'high-card', // Unknown since no showdown
      bestFive: [],
    }];

    this.state.stage = 'payouts';
    this.notifyStateChange();
    setTimeout(() => this.cleanupHand(), 3000);
  }

  /**
   * Clean up after hand and start new one
   */
  private cleanupHand(): void {
    this.state.stage = 'hand_cleanup';
    this.state.isHandActive = false;
    this.state.winners = undefined;
    this.clearActionTimer();
    this.notifyStateChange();

    // Remove players with no chips
    for (const seat of this.state.seats) {
      if (!seat.isEmpty && seat.player!.chips <= 0) {
        seat.player = null;
        seat.isEmpty = true;
      }
    }

    // Start new hand if enough players
    if (this.getPlayerCount() >= 2) {
      setTimeout(() => this.startNewHand(), 2000);
    } else {
      this.state.stage = 'waiting_for_players';
      this.notifyStateChange();
    }
  }

  /**
   * Start a new betting round
   */
  private startBettingRound(): void {
    const isPreflop = this.state.stage === 'preflop';
    console.log('🎰 Starting betting round, stage:', this.state.stage, 'isPreflop:', isPreflop);
    
    resetBettingRound(this.state.bettingRound, this.getActivePlayers(), isPreflop);
    
    // Find first player to act (left of dealer for post-flop, left of big blind for preflop)
    const startIndex = isPreflop 
      ? this.getNextActivePlayerIndex(this.state.bigBlindIndex)
      : this.getNextActivePlayerIndex(this.state.dealerIndex);
    
    this.state.currentPlayerIndex = startIndex;
    console.log('👤 Current player to act:', startIndex);
    
    this.startActionTimer();
    
    // Trigger action request callback
    if (this.eventCallbacks.onActionRequest) {
      const actionRequest = this.getActionRequest();
      if (actionRequest) {
        console.log('🎯 Sending action request:', actionRequest);
        this.eventCallbacks.onActionRequest(actionRequest);
      }
    }
  }

  /**
   * Move to next player in betting round
   */
  private moveToNextPlayer(): void {
    const nextIndex = getNextPlayerToAct(
      this.getActivePlayers(),
      this.state.currentPlayerIndex,
      this.state.bettingRound
    );

    if (nextIndex === -1) {
      this.completeBettingRound();
    } else {
      this.state.currentPlayerIndex = nextIndex;
      this.startActionTimer();
    }
  }

  /**
   * Start action timer for current player
   */
  private startActionTimer(): void {
    this.clearActionTimer();
    
    // Send action request to current player
    const actionRequest = this.getActionRequest();
    if (actionRequest && this.eventCallbacks.onActionRequest) {
      this.eventCallbacks.onActionRequest(actionRequest);
    }
    
    this.actionTimer = setTimeout(() => {
      // Auto-fold on timeout
      const currentPlayer = this.getCurrentPlayer();
      if (currentPlayer) {
        this.processAction(currentPlayer.id, 'fold');
      }
    }, this.ACTION_TIMEOUT_MS);
  }

  /**
   * Clear action timer
   */
  private clearActionTimer(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = undefined;
    }
  }

  // Helper methods
  private getActivePlayers(): Player[] {
    return this.state.seats
      .filter(seat => !seat.isEmpty && seat.player!.isActive)
      .map(seat => seat.player!);
  }

  private getPlayer(playerId: string): Player | null {
    const seat = this.state.seats.find(
      seat => !seat.isEmpty && seat.player!.id === playerId
    );
    return seat?.player || null;
  }

  private getCurrentPlayer(): Player | null {
    if (this.state.currentPlayerIndex < 0 || this.state.currentPlayerIndex >= this.state.seats.length) {
      return null;
    }
    const seat = this.state.seats[this.state.currentPlayerIndex];
    return seat?.isEmpty ? null : seat.player;
  }

  private getPlayerCount(): number {
    return this.state.seats.filter(seat => !seat.isEmpty).length;
  }

  private isActionStage(): boolean {
    return ['preflop', 'flop', 'turn', 'river'].includes(this.state.stage);
  }

  private rotateDealerButton(): void {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) return;

    // Clear current positions
    for (const player of activePlayers) {
      player.isDealer = false;
      player.isSmallBlind = false;
      player.isBigBlind = false;
    }

    // Set new dealer (next active player after current dealer)
    this.state.dealerIndex = this.getNextActivePlayerIndex(this.state.dealerIndex);
    const dealer = this.state.seats[this.state.dealerIndex].player!;
    dealer.isDealer = true;

    // Set blinds
    if (activePlayers.length === 2) {
      // Heads up: dealer is small blind
      dealer.isSmallBlind = true;
      this.state.smallBlindIndex = this.state.dealerIndex;
      this.state.bigBlindIndex = this.getNextActivePlayerIndex(this.state.dealerIndex);
      this.state.seats[this.state.bigBlindIndex].player!.isBigBlind = true;
    } else {
      // Multi-way: small blind is next, big blind is after that
      this.state.smallBlindIndex = this.getNextActivePlayerIndex(this.state.dealerIndex);
      this.state.bigBlindIndex = this.getNextActivePlayerIndex(this.state.smallBlindIndex);
      
      this.state.seats[this.state.smallBlindIndex].player!.isSmallBlind = true;
      this.state.seats[this.state.bigBlindIndex].player!.isBigBlind = true;
    }
  }

  private setBlinds(): void {
    const smallBlindPlayer = this.state.seats[this.state.smallBlindIndex].player!;
    const bigBlindPlayer = this.state.seats[this.state.bigBlindIndex].player!;

    // Post small blind
    const sbAmount = Math.min(this.state.blinds.small, smallBlindPlayer.chips);
    smallBlindPlayer.currentBet = sbAmount;
    smallBlindPlayer.totalBetThisHand = sbAmount;
    smallBlindPlayer.chips -= sbAmount;

    // Post big blind
    const bbAmount = Math.min(this.state.blinds.big, bigBlindPlayer.chips);
    bigBlindPlayer.currentBet = bbAmount;
    bigBlindPlayer.totalBetThisHand = bbAmount;
    bigBlindPlayer.chips -= bbAmount;

    // Set betting round state
    this.state.bettingRound.currentBet = bbAmount;
  }

  private dealHoleCards(): void {
    const activePlayers = this.getActivePlayers();
    
    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      for (const player of activePlayers) {
        player.holeCards.push(this.deck.dealCard());
      }
    }
  }

  private getNextActivePlayerIndex(currentIndex: number): number {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 0) return -1;

    for (let i = 1; i <= this.state.maxPlayers; i++) {
      const nextIndex = (currentIndex + i) % this.state.maxPlayers;
      const seat = this.state.seats[nextIndex];
      
      if (!seat.isEmpty && seat.player!.isActive) {
        return nextIndex;
      }
    }

    return -1;
  }

  private handlePlayerLeaving(seatIndex: number): void {
    // If it was their turn, move to next player
    if (this.state.currentPlayerIndex === seatIndex) {
      this.moveToNextPlayer();
    }

    // Adjust dealer positions if necessary
    if (this.state.dealerIndex === seatIndex) {
      this.state.dealerIndex = this.getNextActivePlayerIndex(seatIndex);
    }
    if (this.state.smallBlindIndex === seatIndex) {
      this.state.smallBlindIndex = this.getNextActivePlayerIndex(seatIndex);
    }
    if (this.state.bigBlindIndex === seatIndex) {
      this.state.bigBlindIndex = this.getNextActivePlayerIndex(seatIndex);
    }
  }
}
