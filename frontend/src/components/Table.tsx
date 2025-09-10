import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useTableStore } from '@/state/useTableStore';
import { CommunityCards } from './CommunityCards';
import { TableSeats } from './PlayerSeat';
import { ChipCount } from './Chips';
import { ActionBar } from './ActionBar';
import { ToastContainer } from './Toast';
import { MessageCircle, Users, Clock } from 'lucide-react';

interface JoinTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (name: string, avatarUrl?: string) => void;
}

const JoinTableModal: React.FC<JoinTableModalProps> = ({ isOpen, onClose, onJoin }) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim(), avatarUrl.trim() || undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-600">
        <h2 className="text-xl font-bold text-white mb-4">Join Table</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Player Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your name"
              maxLength={20}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Avatar URL (optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              disabled={!name.trim()}
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Table: React.FC = () => {
  const {
    // Table state
    seats,
    communityCards,
    pots,
    stage,
    handNumber,
    blinds,
    currentPlayerIndex,
    isHandActive,
    
    // Player state
    id: playerId,
    isJoined,
    
    // UI state
    actionRequest,
    showActionBar,
    toasts,
    
    // Actions
    joinTable,
    performAction,
    removeToast,
  } = useTableStore();

  const [showJoinModal, setShowJoinModal] = useState(false);

  // Calculate pot totals
  const mainPot = pots.find(p => p.isMainPot)?.amount || 0;
  const sidePots = pots.filter(p => !p.isMainPot);
  const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);

  // Get player count
  const playerCount = seats.filter(seat => !seat.isEmpty).length;

  const handleJoinTable = async (name: string, avatarUrl?: string) => {
    const success = await joinTable('default-table', name, avatarUrl);
    if (!success) {
      // Error handling is done in the store
    }
  };

  const handleJoinSeat = (seatIndex: number) => {
    if (!isJoined) {
      setShowJoinModal(true);
    }
  };

  const getStageDisplay = () => {
    switch (stage) {
      case 'waiting_for_players':
        return 'Waiting for players...';
      case 'preflop':
        return 'Pre-flop';
      case 'flop':
        return 'Flop';
      case 'turn':
        return 'Turn';
      case 'river':
        return 'River';
      case 'showdown':
        return 'Showdown';
      case 'payouts':
        return 'Payouts';
      default:
        return stage;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">Texas Hold'em Poker</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <Users className="w-4 h-4" />
              <span>{playerCount}/5 players</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              Blinds: {blinds.small}/{blinds.big}
            </div>
            {isHandActive && (
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Clock className="w-4 h-4" />
                <span>Hand #{handNumber}</span>
              </div>
            )}
            {!isJoined && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Join Table
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
        
        {/* Poker table */}
        <div className="relative h-full flex items-center justify-center p-8">
          <div className="poker-table w-full max-w-4xl h-96 relative">
            
            {/* Player seats */}
            <TableSeats
              seats={seats}
              currentPlayerId={playerId}
              currentPlayerIndex={currentPlayerIndex}
              onJoinSeat={handleJoinSeat}
            />

            {/* Table center */}
            <div className="table-center">
              {/* Community cards */}
              <CommunityCards 
                cards={communityCards}
                className="mb-4"
              />

              {/* Pot information */}
              <div className="text-center space-y-2">
                {totalPot > 0 && (
                  <div className="bg-gray-800/80 rounded-lg px-4 py-2 border border-gray-600">
                    <div className="text-lg font-bold text-yellow-400">
                      Pot: {totalPot}
                    </div>
                    {sidePots.length > 0 && (
                      <div className="text-sm text-gray-300">
                        Main: {mainPot} | Side: {sidePots.map(p => p.amount).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Game stage */}
                <div className="text-sm text-gray-400 font-medium">
                  {getStageDisplay()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {console.log('🎯 ActionBar render check:', { showActionBar, actionRequest, playerId })}
      {(showActionBar && actionRequest) || true ? (
        <ActionBar
          actionRequest={actionRequest || {
            playerId: playerId || '',
            minBet: 10,
            minRaise: 20,
            maxBet: 1000,
            canCheck: true,
            canCall: true,
            canBet: true,
            canRaise: true,
            callAmount: 10,
            timeLeftMs: 20000
          }}
          onAction={performAction}
        />
      ) : null}

      {/* Chat button */}
      <button className="fixed bottom-4 right-4 w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors">
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Modals and overlays */}
      <JoinTableModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinTable}
      />

      {/* Toast notifications */}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />

      {/* Connection status */}
      <div className="fixed top-4 left-4 text-sm">
        <div className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-gray-300">Connected</span>
        </div>
      </div>
    </div>
  );
};

export default Table;
