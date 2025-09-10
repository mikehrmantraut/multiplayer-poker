import React from 'react';
import { clsx } from 'clsx';

interface ChipProps {
  value: number;
  color?: 'white' | 'red' | 'green' | 'blue' | 'black' | 'purple' | 'orange' | 'yellow';
  size?: 'small' | 'normal' | 'large';
  className?: string;
}

const CHIP_COLORS = {
  white: 'chip-white',
  red: 'chip-red',
  green: 'chip-green',
  blue: 'chip-blue',
  black: 'chip-black',
  purple: 'bg-chip-purple border-purple-700 text-white',
  orange: 'bg-chip-orange border-orange-700 text-white',
  yellow: 'bg-chip-yellow border-yellow-700 text-black',
};

const CHIP_SIZES = {
  small: 'w-6 h-6 text-xs',
  normal: 'w-8 h-8 text-xs',
  large: 'w-10 h-10 text-sm',
};

// Get chip color based on value
function getChipColor(value: number): keyof typeof CHIP_COLORS {
  if (value >= 10000) return 'black';
  if (value >= 5000) return 'purple';
  if (value >= 1000) return 'orange';
  if (value >= 500) return 'blue';
  if (value >= 100) return 'green';
  if (value >= 25) return 'red';
  if (value >= 5) return 'yellow';
  return 'white';
}

export const Chip: React.FC<ChipProps> = ({ 
  value, 
  color, 
  size = 'normal', 
  className 
}) => {
  const chipColor = color || getChipColor(value);
  
  return (
    <div 
      className={clsx(
        'chip',
        CHIP_COLORS[chipColor],
        CHIP_SIZES[size],
        className
      )}
      title={`${value} chips`}
    >
      {value >= 10000 ? `${(value / 1000).toFixed(0)}K` : value}
    </div>
  );
};

interface ChipStackProps {
  amount: number;
  maxChips?: number;
  size?: 'small' | 'normal' | 'large';
  className?: string;
  animate?: boolean;
}

export const ChipStack: React.FC<ChipStackProps> = ({ 
  amount, 
  maxChips = 8, 
  size = 'normal',
  className,
  animate = false 
}) => {
  if (amount <= 0) return null;

  // Break down amount into chip denominations
  const denominations = [10000, 5000, 1000, 500, 100, 25, 5, 1];
  const chips: Array<{ value: number; count: number }> = [];
  let remaining = amount;

  for (const denom of denominations) {
    if (remaining >= denom) {
      const count = Math.floor(remaining / denom);
      chips.push({ value: denom, count });
      remaining -= count * denom;
    }
  }

  // Limit total chips displayed
  const displayChips: Array<{ value: number; count: number }> = [];
  let totalChips = 0;

  for (const chip of chips) {
    const chipsToAdd = Math.min(chip.count, maxChips - totalChips);
    if (chipsToAdd > 0) {
      displayChips.push({ value: chip.value, count: chipsToAdd });
      totalChips += chipsToAdd;
    }
    if (totalChips >= maxChips) break;
  }

  return (
    <div className={clsx('chip-stack', className)}>
      {displayChips.map(({ value, count }, stackIndex) =>
        Array.from({ length: count }).map((_, chipIndex) => (
          <Chip
            key={`${stackIndex}-${chipIndex}`}
            value={value}
            size={size}
            className={clsx(
              animate && 'animate-chip-move',
              chipIndex > 0 && '-mb-6'
            )}
            style={{
              animationDelay: animate ? `${(stackIndex * count + chipIndex) * 100}ms` : undefined,
            } as React.CSSProperties}
          />
        ))
      )}
      {totalChips >= maxChips && amount > getTotalValue(displayChips) && (
        <div className={clsx(
          'absolute -top-2 -right-2 bg-gray-700 text-white text-xs',
          'rounded-full w-6 h-6 flex items-center justify-center',
          'border border-gray-500'
        )}>
          +
        </div>
      )}
    </div>
  );
};

function getTotalValue(chips: Array<{ value: number; count: number }>): number {
  return chips.reduce((total, chip) => total + (chip.value * chip.count), 0);
}

interface ChipCountProps {
  amount: number;
  label?: string;
  size?: 'small' | 'normal' | 'large';
  className?: string;
  showStack?: boolean;
}

export const ChipCount: React.FC<ChipCountProps> = ({ 
  amount, 
  label,
  size = 'normal',
  className,
  showStack = true 
}) => {
  const formatAmount = (value: number): string => {
    if (value >= 1000000) {
      const millions = value / 1000000;
      return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    } else if (value >= 10000) {
      // Only use K format for 10K and above
      const thousands = value / 1000;
      return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    } else {
      // Show exact number for values under 10K
      return value.toString();
    }
  };

  const textSizes = {
    small: 'text-xs',
    normal: 'text-sm',
    large: 'text-base',
  };

  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      {showStack && amount > 0 && (
        <ChipStack amount={Math.min(amount, 1000)} size={size} maxChips={3} />
      )}
      <div className="text-center">
        {label && (
          <div className={clsx('text-gray-400 font-medium', textSizes[size])}>
            {label}
          </div>
        )}
        <div className={clsx(
          'font-mono font-bold text-white',
          textSizes[size]
        )}>
          {formatAmount(amount)}
        </div>
      </div>
    </div>
  );
};

interface BettingChipsProps {
  amount: number;
  playerName: string;
  className?: string;
  animate?: boolean;
}

export const BettingChips: React.FC<BettingChipsProps> = ({ 
  amount, 
  playerName, 
  className,
  animate = false 
}) => {
  if (amount <= 0) return null;

  return (
    <div className={clsx(
      'absolute flex flex-col items-center',
      'transform -translate-x-1/2 -translate-y-1/2',
      className
    )}>
      <ChipStack 
        amount={amount} 
        maxChips={5} 
        animate={animate}
        className="mb-1"
      />
      <div className="bg-gray-800 px-2 py-1 rounded text-xs text-white border border-gray-600">
        {amount}
      </div>
    </div>
  );
};

export default Chip;
