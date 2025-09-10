import React from 'react';
import { clsx } from 'clsx';
import { ClientPlayer } from '@/state/types';
import { HoleCards } from './Card';
import { ChipCount, BettingChips } from './Chips';
import { SeatBadges } from './SeatBadges';

interface PlayerSeatProps {
  player: ClientPlayer | null;
  isEmpty: boolean;
  isCurrentPlayer?: boolean;
  isMyTurn?: boolean;
  onJoinSeat?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isEmpty,
  isCurrentPlayer = false,
  isMyTurn = false,
  onJoinSeat,
  className,
  style,
}) => {
  if (isEmpty || !player) {
    return (
      <div 
        className={clsx(
          'player-seat empty',
          'flex flex-col items-center justify-center',
          'hover:bg-gray-700/50 transition-colors cursor-pointer',
          className
        )}
        style={style}
        onClick={onJoinSeat}
      >
        <div className="text-gray-400 text-sm font-medium">Empty Seat</div>
        <div className="text-gray-500 text-xs">Click to join</div>
      </div>
    );
  }

  return (
    <div 
      className={clsx(
        'player-seat',
        isCurrentPlayer && 'active',
        isMyTurn && 'current-turn',
        player.isFolded && 'folded',
        className
      )}
      style={style}
    >
      {/* Betting chips (positioned above seat) */}
      {player.currentBet > 0 && (
        <BettingChips 
          amount={player.currentBet}
          playerName={player.name}
          className="top-0 left-1/2 -translate-y-full"
          animate={!!player.lastAction}
        />
      )}

      {/* Player info */}
      <div className="flex flex-col items-center space-y-2">
        {/* Avatar and badges */}
        <div className="relative">
          <img 
            src={player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&size=48`}
            alt={player.name}
            className={clsx(
              'w-12 h-12 rounded-full border-2',
              isCurrentPlayer ? 'border-green-400' : 'border-gray-400',
              player.isFolded && 'grayscale opacity-60'
            )}
          />
          
          <SeatBadges 
            isDealer={player.isDealer}
            isSmallBlind={player.isSmallBlind}
            isBigBlind={player.isBigBlind}
          />

          {/* Turn indicator */}
          {isMyTurn && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-pulse">
              <div className="absolute inset-0.5 bg-yellow-400 rounded-full"></div>
            </div>
          )}
        </div>

        {/* Player name */}
        <div className={clsx(
          'text-center font-semibold',
          isCurrentPlayer ? 'text-green-400' : 'text-white',
          player.isFolded && 'opacity-60'
        )}>
          <div className="text-sm truncate max-w-[100px]" title={player.name}>
            {player.name}
          </div>
          {player.isAllIn && (
            <div className="text-xs text-red-400 font-bold">ALL IN</div>
          )}
        </div>

        {/* Hole cards */}
        <HoleCards 
          cards={player.holeCards || []}
          isOwn={isCurrentPlayer}
          size="small"
          className={clsx(
            'transition-opacity duration-300',
            !player.hasCards && 'opacity-30'
          )}
        />

        {/* Chip count */}
        <ChipCount 
          amount={player.chips}
          size="small"
          showStack={false}
          className={clsx(
            'transition-opacity duration-300',
            player.isFolded && 'opacity-60'
          )}
        />

        {/* Last action */}
        {player.lastAction && !player.isFolded && (
          <div className={clsx(
            'text-xs px-2 py-1 rounded-full border',
            getActionStyle(player.lastAction)
          )}>
            {getActionText(player.lastAction, player.currentBet)}
          </div>
        )}

        {/* Action timer */}
        {isMyTurn && player.timeLeft !== undefined && (
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div 
              className="bg-yellow-500 h-1 rounded-full transition-all duration-1000"
              style={{ 
                width: `${Math.max(0, (player.timeLeft / 20000) * 100)}%` 
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function getActionStyle(action: string): string {
  switch (action) {
    case 'fold':
      return 'bg-red-900/20 border-red-500 text-red-400';
    case 'check':
      return 'bg-blue-900/20 border-blue-500 text-blue-400';
    case 'call':
      return 'bg-green-900/20 border-green-500 text-green-400';
    case 'bet':
    case 'raise':
      return 'bg-yellow-900/20 border-yellow-500 text-yellow-400';
    case 'all-in':
      return 'bg-purple-900/20 border-purple-500 text-purple-400';
    default:
      return 'bg-gray-900/20 border-gray-500 text-gray-400';
  }
}

function getActionText(action: string, amount: number): string {
  switch (action) {
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return 'Call';
    case 'bet':
      return `Bet ${amount}`;
    case 'raise':
      return `Raise ${amount}`;
    case 'all-in':
      return 'All In';
    default:
      return action;
  }
}

// Helper component for positioning seats around the table
interface TableSeatsProps {
  seats: Array<{
    index: number;
    player: ClientPlayer | null;
    isEmpty: boolean;
  }>;
  currentPlayerId?: string;
  currentPlayerIndex: number;
  onJoinSeat?: (seatIndex: number) => void;
}

export const TableSeats: React.FC<TableSeatsProps> = ({
  seats,
  currentPlayerId,
  currentPlayerIndex,
  onJoinSeat,
}) => {
  // Seat positions around the table (for up to 5 players)
  const seatPositions = [
    { top: '15%', left: '25%' }, // Seat 0: Top-left
    { top: '15%', left: '75%' }, // Seat 1: Top-right
    { top: '50%', left: '85%' }, // Seat 2: Right
    { top: '85%', left: '50%' }, // Seat 3: Bottom
    { top: '50%', left: '15%' }, // Seat 4: Left
  ];

  return (
    <>
      {seats.map((seat) => {
        const position = seatPositions[seat.index] || seatPositions[0];
        const isCurrentPlayer = seat.player?.id === currentPlayerId;
        const isMyTurn = currentPlayerIndex === seat.index;

        return (
          <PlayerSeat
            key={seat.index}
            player={seat.player}
            isEmpty={seat.isEmpty}
            isCurrentPlayer={isCurrentPlayer}
            isMyTurn={isMyTurn}
            onJoinSeat={() => onJoinSeat?.(seat.index)}
            className="absolute"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -50%)',
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
};

export default PlayerSeat;
