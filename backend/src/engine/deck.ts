import { Card, Suit, Rank } from './types';
import { SUITS, RANKS, createCard } from './cards';

export class Deck {
  private cards: Card[] = [];
  private dealtCards: Card[] = [];

  constructor() {
    this.reset();
  }

  /**
   * Reset deck to full 52 cards
   */
  reset(): void {
    this.cards = [];
    this.dealtCards = [];
    
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(createCard(suit, rank));
      }
    }
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   */
  shuffle(rng: () => number = Math.random): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Deal one card from the top of the deck
   */
  dealCard(): Card {
    if (this.cards.length === 0) {
      throw new Error('Cannot deal from empty deck');
    }
    
    const card = this.cards.pop()!;
    this.dealtCards.push(card);
    return card;
  }

  /**
   * Deal multiple cards
   */
  dealCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.dealCard());
    }
    return cards;
  }

  /**
   * Get remaining cards count
   */
  getRemainingCount(): number {
    return this.cards.length;
  }

  /**
   * Get dealt cards count
   */
  getDealtCount(): number {
    return this.dealtCards.length;
  }

  /**
   * Check if deck is empty
   */
  isEmpty(): boolean {
    return this.cards.length === 0;
  }

  /**
   * Peek at the top card without dealing it
   */
  peekTop(): Card | null {
    return this.cards.length > 0 ? this.cards[this.cards.length - 1] : null;
  }

  /**
   * Get all dealt cards (for testing/debugging)
   */
  getDealtCards(): Card[] {
    return [...this.dealtCards];
  }

  /**
   * Get remaining cards (for testing/debugging)
   */
  getRemainingCards(): Card[] {
    return [...this.cards];
  }

  /**
   * Create a deck from specific cards (for testing)
   */
  static fromCards(cards: Card[]): Deck {
    const deck = new Deck();
    deck.cards = [...cards];
    deck.dealtCards = [];
    return deck;
  }

  /**
   * Create a deck with predetermined order (for testing)
   */
  static createTestDeck(cardStrings: string[]): Deck {
    const deck = new Deck();
    deck.cards = [];
    deck.dealtCards = [];
    
    // Parse card strings and add to deck
    for (const cardStr of cardStrings) {
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
      
      deck.cards.push(createCard(suit, rank));
    }
    
    return deck;
  }
}
