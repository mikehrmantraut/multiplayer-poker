import React from 'react';
import { clsx } from 'clsx';

interface SeatBadgesProps {
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  className?: string;
}

export const SeatBadges: React.FC<SeatBadgesProps> = ({
  isDealer,
  isSmallBlind,
  isBigBlind,
  className,
}) => {
  const badges = [];

  if (isDealer) {
    badges.push({
      key: 'dealer',
      text: 'D',
      className: 'bg-yellow-500 text-black',
      title: 'Dealer',
    });
  }

  if (isSmallBlind) {
    badges.push({
      key: 'sb',
      text: 'SB',
      className: 'bg-blue-500 text-white',
      title: 'Small Blind',
    });
  }

  if (isBigBlind) {
    badges.push({
      key: 'bb',
      text: 'BB',
      className: 'bg-red-500 text-white',
      title: 'Big Blind',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={clsx('absolute top-0 right-0 flex space-x-1', className)}>
      {badges.map((badge, index) => (
        <div
          key={badge.key}
          className={clsx(
            'w-6 h-6 rounded-full border-2 border-white',
            'flex items-center justify-center',
            'text-xs font-bold shadow-lg',
            badge.className
          )}
          title={badge.title}
          style={{
            zIndex: 10 + index,
          }}
        >
          {badge.text}
        </div>
      ))}
    </div>
  );
};

export default SeatBadges;
