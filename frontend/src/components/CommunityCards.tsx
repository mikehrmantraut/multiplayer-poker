import React from 'react';
import { clsx } from 'clsx';
import { Card, CardSlot } from './Card';
import { Card as CardType } from '@/state/types';

interface CommunityCardsProps {
  cards: CardType[];
  maxCards?: number;
  size?: 'small' | 'normal' | 'large';
  className?: string;
  showLabels?: boolean;
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards,
  maxCards = 5,
  size = 'normal',
  className,
  showLabels = false,
}) => {
  const labels = ['Flop', 'Flop', 'Flop', 'Turn', 'River'];

  return (
    <div className={clsx('flex flex-col items-center space-y-2', className)}>
      <div className="flex space-x-2">
        {Array.from({ length: maxCards }).map((_, index) => (
          <div key={index} className="flex flex-col items-center space-y-1">
            <CardSlot size={size}>
              {cards[index] && (
                <Card 
                  card={cards[index]} 
                  size={size}
                  animate={true}
                />
              )}
            </CardSlot>
            {showLabels && index < labels.length && (
              <div className="text-xs text-gray-400 font-medium">
                {labels[index]}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {cards.length > 0 && (
        <div className="text-sm text-gray-300 font-medium">
          Community Cards
        </div>
      )}
    </div>
  );
};

export default CommunityCards;
