import React from 'react';
import { Card as CardType, Suit } from '@/state/types';
import { clsx } from 'clsx';

interface CardProps {
  card?: CardType;
  isHidden?: boolean;
  size?: 'small' | 'normal' | 'large';
  className?: string;
  animate?: boolean;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  isHidden = false, 
  size = 'normal',
  className,
  animate = false 
}) => {
  const sizeClasses = {
    small: 'card-small',
    normal: 'card',
    large: 'card-large',
  };

  if (isHidden || !card) {
    return (
      <div 
        className={clsx(
          sizeClasses[size],
          'card-back',
          animate && 'animate-deal',
          className
        )}
      >
        <div className="text-white opacity-60">🂠</div>
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  return (
    <div 
      className={clsx(
        sizeClasses[size],
        suitColor === 'red' ? 'card-red' : 'card-black',
        animate && 'animate-deal',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="text-center leading-none">
          <div className="font-bold">{card.rank}</div>
          <div className="text-lg leading-none">{suitSymbol}</div>
        </div>
      </div>
    </div>
  );
};

interface CardSlotProps {
  children?: React.ReactNode;
  className?: string;
  size?: 'small' | 'normal' | 'large';
}

export const CardSlot: React.FC<CardSlotProps> = ({ 
  children, 
  className,
  size = 'normal' 
}) => {
  const sizeClasses = {
    small: 'w-8 h-11',
    normal: 'w-12 h-16',
    large: 'w-16 h-22',
  };

  return (
    <div 
      className={clsx(
        sizeClasses[size],
        'border-2 border-dashed border-gray-600 rounded-lg',
        'flex items-center justify-center',
        'transition-colors duration-200',
        !children && 'hover:border-gray-500',
        className
      )}
    >
      {children}
    </div>
  );
};

interface HoleCardsProps {
  cards: CardType[];
  isOwn?: boolean;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}

export const HoleCards: React.FC<HoleCardsProps> = ({ 
  cards, 
  isOwn = false, 
  size = 'normal',
  className 
}) => {
  return (
    <div className={clsx('flex space-x-1', className)}>
      {[0, 1].map((index) => (
        <Card
          key={index}
          card={cards[index]}
          isHidden={!isOwn && cards.length > index}
          size={size}
          animate={cards.length > index}
        />
      ))}
    </div>
  );
};

interface CommunityCardsProps {
  cards: CardType[];
  maxCards?: number;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({ 
  cards, 
  maxCards = 5, 
  size = 'normal',
  className 
}) => {
  return (
    <div className={clsx('flex space-x-2', className)}>
      {Array.from({ length: maxCards }).map((_, index) => (
        <CardSlot key={index} size={size}>
          {cards[index] && (
            <Card 
              card={cards[index]} 
              size={size}
              animate={true}
            />
          )}
        </CardSlot>
      ))}
    </div>
  );
};

export default Card;
