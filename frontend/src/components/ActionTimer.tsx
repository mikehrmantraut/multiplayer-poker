import React from 'react';
import { clsx } from 'clsx';

interface ActionTimerProps {
  timeLeftMs: number;
  maxTimeMs?: number;
  className?: string;
}

export const ActionTimer: React.FC<ActionTimerProps> = ({
  timeLeftMs,
  maxTimeMs = 20000,
  className,
}) => {
  const percentage = Math.max(0, (timeLeftMs / maxTimeMs) * 100);
  const seconds = Math.ceil(timeLeftMs / 1000);

  return (
    <div className={clsx('flex items-center justify-center space-x-3', className)}>
      <div className="w-64 bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-1000"
          style={{ 
            width: `${percentage}%` 
          }}
        />
      </div>
      <div className="text-sm text-gray-300 font-medium min-w-[24px]">
        {seconds}s
      </div>
    </div>
  );
};

export default ActionTimer;
