import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { ActionRequest, PlayerAction } from '@/state/types';

interface ActionBarProps {
  actionRequest?: ActionRequest;
  onAction: (action: PlayerAction, amount?: number) => void;
  className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  actionRequest,
  onAction,
  className,
}) => {
  const [betAmount, setBetAmount] = useState(0);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [selectedAction, setSelectedAction] = useState<PlayerAction | null>(null);

  // Update amounts when action request changes
  useEffect(() => {
    if (actionRequest) {
      setBetAmount(actionRequest.minBet);
      setRaiseAmount(actionRequest.minRaise);
    }
  }, [actionRequest]);

  if (!actionRequest) {
    return null;
  }

  const handleAction = (action: PlayerAction) => {
    let amount = 0;
    
    if (action === 'bet') {
      amount = betAmount;
    } else if (action === 'raise') {
      amount = raiseAmount;
    }

    onAction(action, amount);
    setSelectedAction(null);
  };

  const handleQuickBet = (multiplier: number) => {
    if (actionRequest.canBet) {
      const amount = Math.min(actionRequest.minBet * multiplier, actionRequest.maxBet);
      setBetAmount(amount);
    } else if (actionRequest.canRaise) {
      const amount = Math.min(actionRequest.minRaise * multiplier, actionRequest.maxBet);
      setRaiseAmount(amount);
    }
  };

  return (
    <div className={clsx('action-bar', className)}>
      <div className="max-w-4xl mx-auto">
        {/* Action info */}
        <div className="text-center mb-4">
          <div className="text-sm text-gray-300 mb-1">Your turn to act</div>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            {actionRequest.canCall && (
              <span>Call: {actionRequest.callAmount}</span>
            )}
            {actionRequest.canBet && (
              <span>Min Bet: {actionRequest.minBet}</span>
            )}
            {actionRequest.canRaise && (
              <span>Min Raise: {actionRequest.minRaise}</span>
            )}
            <span>Max: {actionRequest.maxBet}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          {/* Fold */}
          <button
            onClick={() => handleAction('fold')}
            className="action-button danger"
            disabled={selectedAction === 'fold'}
          >
            Fold
          </button>

          {/* Check */}
          {actionRequest.canCheck && (
            <button
              onClick={() => handleAction('check')}
              className="action-button secondary"
              disabled={selectedAction === 'check'}
            >
              Check
            </button>
          )}

          {/* Call */}
          {actionRequest.canCall && (
            <button
              onClick={() => handleAction('call')}
              className="action-button primary"
              disabled={selectedAction === 'call'}
            >
              Call {actionRequest.callAmount}
            </button>
          )}

          {/* Bet */}
          {actionRequest.canBet && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleAction('bet')}
                className="action-button primary"
                disabled={betAmount < actionRequest.minBet || betAmount > actionRequest.maxBet}
              >
                Bet {betAmount}
              </button>
            </div>
          )}

          {/* Raise */}
          {actionRequest.canRaise && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleAction('raise')}
                className="action-button primary"
                disabled={raiseAmount < actionRequest.minRaise || raiseAmount > actionRequest.maxBet}
              >
                Raise {raiseAmount}
              </button>
            </div>
          )}

          {/* All In */}
          <button
            onClick={() => handleAction('raise')}
            className="action-button danger"
            disabled={actionRequest.maxBet <= 0}
          >
            All In ({actionRequest.maxBet})
          </button>
        </div>

        {/* Betting controls */}
        {(actionRequest.canBet || actionRequest.canRaise) && (
          <div className="flex flex-col items-center space-y-3">
            {/* Amount input */}
            <div className="flex items-center space-x-4">
              {actionRequest.canBet && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-300">Bet:</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    min={actionRequest.minBet}
                    max={actionRequest.maxBet}
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-white"
                  />
                </div>
              )}

              {actionRequest.canRaise && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-300">Raise:</label>
                  <input
                    type="number"
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    min={actionRequest.minRaise}
                    max={actionRequest.maxBet}
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-white"
                  />
                </div>
              )}
            </div>

            {/* Quick bet buttons */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Quick:</span>
              {[0.5, 1, 2, 3].map((multiplier) => (
                <button
                  key={multiplier}
                  onClick={() => handleQuickBet(multiplier)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 text-gray-300"
                >
                  {multiplier === 0.5 ? '½' : `${multiplier}x`}
                </button>
              ))}
            </div>

            {/* Range slider */}
            {actionRequest.canBet && (
              <div className="w-full max-w-xs">
                <input
                  type="range"
                  min={actionRequest.minBet}
                  max={actionRequest.maxBet}
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {actionRequest.canRaise && (
              <div className="w-full max-w-xs">
                <input
                  type="range"
                  min={actionRequest.minRaise}
                  max={actionRequest.maxBet}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* Timer */}
        <div className="mt-4 flex justify-center">
          <div className="w-64 bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-1000"
              style={{ 
                width: `${Math.max(0, (actionRequest.timeLeftMs / 20000) * 100)}%` 
              }}
            />
          </div>
          <div className="ml-2 text-sm text-gray-300">
            {Math.ceil(actionRequest.timeLeftMs / 1000)}s
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
