import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  TableState, 
  PlayerState, 
  ConnectionState, 
  UIState, 
  ActionRequest, 
  ChatMessage, 
  GameToast,
  PlayerAction 
} from './types';
import socketManager from './socket';

interface TableStore extends Omit<TableState, 'id'>, Omit<PlayerState, 'id'>, ConnectionState, UIState {
  id: string;
  // Connection actions
  connect: () => void;
  disconnect: () => void;
  setConnectionState: (state: Partial<ConnectionState>) => void;

  // Player actions
  joinTable: (tableId: string, name: string, avatarUrl?: string) => Promise<boolean>;
  leaveTable: () => Promise<boolean>;
  setPlayer: (player: Partial<PlayerState>) => void;

  // Game actions
  performAction: (action: PlayerAction, amount?: number) => Promise<boolean>;
  fold: () => Promise<boolean>;
  check: () => Promise<boolean>;
  call: () => Promise<boolean>;
  bet: (amount: number) => Promise<boolean>;
  raise: (amount: number) => Promise<boolean>;

  // UI actions
  setActionRequest: (request?: ActionRequest) => void;
  setBetAmount: (amount: number) => void;
  setRaiseAmount: (amount: number) => void;
  setSelectedAction: (action?: PlayerAction) => void;
  toggleChat: () => void;
  addChatMessage: (message: ChatMessage) => void;
  sendChatMessage: (message: string) => Promise<boolean>;
  addToast: (toast: Omit<GameToast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Table state updates
  updateTableState: (state: TableState) => void;
  reset: () => void;
}

const DEFAULT_TABLE_STATE: TableState = {
  id: '',
  stage: 'waiting_for_players',
  seats: [],
  communityCards: [],
  pots: [],
  dealerIndex: -1,
  smallBlindIndex: -1,
  bigBlindIndex: -1,
  currentPlayerIndex: -1,
  bettingRound: {
    currentBet: 0,
    minRaise: 0,
    lastRaiseAmount: 0,
    lastRaiserIndex: -1,
    actionIndex: -1,
    isComplete: false,
    actions: [],
  },
  handNumber: 0,
  blinds: { small: 5, big: 10 },
  maxPlayers: 5,
  isHandActive: false,
};

const DEFAULT_PLAYER_STATE: PlayerState = {
  isJoined: false,
};

const DEFAULT_CONNECTION_STATE: ConnectionState = {
  isConnected: false,
  isConnecting: false,
};

const DEFAULT_UI_STATE: UIState = {
  showActionBar: false,
  betAmount: 0,
  raiseAmount: 0,
  showChat: false,
  chatMessages: [],
  toasts: [],
};

export const useTableStore = create<TableStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...DEFAULT_TABLE_STATE,
    ...DEFAULT_PLAYER_STATE,
    ...DEFAULT_CONNECTION_STATE,
    ...DEFAULT_UI_STATE,

    // Connection actions
    connect: () => {
      console.clear();
      console.log('🚀 Starting connection...');
      
      const state = get();
      if (state.isConnected || state.isConnecting) return;

      set({ isConnecting: true, error: undefined });

      try {
        socketManager.connect();
        
        // Setup event listeners
        socketManager.onConnectionState({
          onConnect: () => {
            set({ isConnected: true, isConnecting: false, error: undefined });
          },
          onDisconnect: (reason) => {
            set({ isConnected: false, isConnecting: false });
            get().addToast({
              type: 'warning',
              title: 'Disconnected',
              message: `Connection lost: ${reason}`,
            });
          },
          onError: (error) => {
            set({ isConnected: false, isConnecting: false, error: error.message });
            get().addToast({
              type: 'error',
              title: 'Connection Error',
              message: 'Failed to connect to server',
            });
          },
        });

        socketManager.onTableState((tableState) => {
          console.log('📊 Table state received:', tableState);
          get().updateTableState(tableState);
        });

        socketManager.onActionRequest((request) => {
          console.log('🔥 RECEIVED ACTION REQUEST:', request);
          get().setActionRequest(request);
        });

        socketManager.onActionResult((result) => {
          get().addToast({
            type: 'info',
            title: 'Action',
            message: `${result.action} ${result.amount || ''}`.trim(),
            duration: 2000,
          });
        });

        socketManager.onChatMessage((message) => {
          get().addChatMessage(message);
        });

        socketManager.onPlayerJoined((data) => {
          get().addToast({
            type: 'success',
            title: 'Player Joined',
            message: `${data.name} joined the table`,
            duration: 3000,
          });
        });

        socketManager.onPlayerLeft((data) => {
          const state = get();
          const player = state.seats.find(seat => 
            !seat.isEmpty && seat.player?.id === data.playerId
          )?.player;
          
          if (player) {
            get().addToast({
              type: 'info',
              title: 'Player Left',
              message: `${player.name} left the table`,
              duration: 3000,
            });
          }
        });

      } catch (error) {
        set({ 
          isConnected: false, 
          isConnecting: false, 
          error: error instanceof Error ? error.message : 'Connection failed' 
        });
      }
    },

    disconnect: () => {
      socketManager.disconnect();
      set({ isConnected: false, isConnecting: false });
    },

    setConnectionState: (connectionState) => {
      set(connectionState);
    },

    // Player actions
    joinTable: async (tableId, name, avatarUrl) => {
      try {
        const response = await socketManager.joinTable({ tableId, name, avatarUrl });
        
        if (response.success && response.playerId) {
          console.log('🎮 Player joined successfully:', {
            playerId: response.playerId,
            name,
            tableId
          });
          
          set({
            id: response.playerId,
            name,
            avatarUrl,
            isJoined: true,
            currentTableId: tableId,
          });
          
          get().addToast({
            type: 'success',
            title: 'Joined Table',
            message: `Welcome to the table, ${name}!`,
          });
          
          return true;
        } else {
          get().addToast({
            type: 'error',
            title: 'Join Failed',
            message: response.error || 'Failed to join table',
          });
          return false;
        }
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Join Failed',
          message: 'Network error while joining table',
        });
        return false;
      }
    },

    leaveTable: async () => {
      const state = get();
      if (!state.currentTableId) return false;

      try {
        const response = await socketManager.leaveTable(state.currentTableId);
        
        if (response.success) {
          set({
            ...DEFAULT_PLAYER_STATE,
            ...DEFAULT_TABLE_STATE,
            ...DEFAULT_UI_STATE,
            isConnected: state.isConnected,
            isConnecting: state.isConnecting,
          });
          
          get().addToast({
            type: 'info',
            title: 'Left Table',
            message: 'You have left the table',
          });
          
          return true;
        } else {
          get().addToast({
            type: 'error',
            title: 'Leave Failed',
            message: response.error || 'Failed to leave table',
          });
          return false;
        }
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Leave Failed',
          message: 'Network error while leaving table',
        });
        return false;
      }
    },

    setPlayer: (player) => {
      set(player);
    },

    // Game actions
    performAction: async (action, amount = 0) => {
      const actions = {
        fold: () => get().fold(),
        check: () => get().check(),
        call: () => get().call(),
        bet: () => get().bet(amount),
        raise: () => get().raise(amount),
        'all-in': () => get().raise(get().seats.find(s => s.player?.id === get().id)?.player?.chips || 0),
      };

      return actions[action]?.() || false;
    },

    fold: async () => {
      try {
        const response = await socketManager.fold();
        if (!response.success) {
          get().addToast({
            type: 'error',
            title: 'Action Failed',
            message: response.error || 'Failed to fold',
          });
        }
        return response.success;
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Action Failed',
          message: 'Network error',
        });
        return false;
      }
    },

    check: async () => {
      try {
        const response = await socketManager.check();
        if (!response.success) {
          get().addToast({
            type: 'error',
            title: 'Action Failed',
            message: response.error || 'Failed to check',
          });
        }
        return response.success;
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Action Failed',
          message: 'Network error',
        });
        return false;
      }
    },

    call: async () => {
      try {
        const response = await socketManager.call();
        if (!response.success) {
          get().addToast({
            type: 'error',
            title: 'Action Failed',
            message: response.error || 'Failed to call',
          });
        }
        return response.success;
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Action Failed',
          message: 'Network error',
        });
        return false;
      }
    },

    bet: async (amount) => {
      try {
        const response = await socketManager.bet(amount);
        if (!response.success) {
          get().addToast({
            type: 'error',
            title: 'Action Failed',
            message: response.error || 'Failed to bet',
          });
        }
        return response.success;
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Action Failed',
          message: 'Network error',
        });
        return false;
      }
    },

    raise: async (amount) => {
      try {
        const response = await socketManager.raise(amount);
        if (!response.success) {
          get().addToast({
            type: 'error',
            title: 'Action Failed',
            message: response.error || 'Failed to raise',
          });
        }
        return response.success;
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Action Failed',
          message: 'Network error',
        });
        return false;
      }
    },

    // UI actions
    setActionRequest: (request) => {
      const currentId = get().id;
      console.log('🎯 ActionRequest received:', { 
        request, 
        currentPlayerId: currentId, 
        shouldShow: !!request && request?.playerId === currentId 
      });
      
      set({ 
        actionRequest: request, 
        showActionBar: !!request && request?.playerId === currentId,
      });
    },

    setBetAmount: (amount) => {
      set({ betAmount: amount });
    },

    setRaiseAmount: (amount) => {
      set({ raiseAmount: amount });
    },

    setSelectedAction: (action) => {
      set({ selectedAction: action });
    },

    toggleChat: () => {
      set((state) => ({ showChat: !state.showChat }));
    },

    addChatMessage: (message) => {
      set((state) => ({
        chatMessages: [...state.chatMessages.slice(-49), message], // Keep last 50 messages
      }));
    },

    sendChatMessage: async (message) => {
      try {
        const response = await socketManager.sendChatMessage(message);
        return response.success;
      } catch (error) {
        get().addToast({
          type: 'error',
          title: 'Chat Failed',
          message: 'Failed to send message',
        });
        return false;
      }
    },

    addToast: (toast) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast = { ...toast, id };
      
      set((state) => ({
        toasts: [...state.toasts, newToast],
      }));

      // Auto-remove toast after duration
      const duration = toast.duration || 5000;
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter(toast => toast.id !== id),
      }));
    },

    clearToasts: () => {
      set({ toasts: [] });
    },

    // Table state updates
    updateTableState: (tableState) => {
      set(tableState);
    },

    reset: () => {
      set({
        ...DEFAULT_TABLE_STATE,
        ...DEFAULT_PLAYER_STATE,
        ...DEFAULT_UI_STATE,
        isConnected: get().isConnected,
        isConnecting: get().isConnecting,
      });
    },
  }))
);

// Auto-connect on store creation
useTableStore.getState().connect();
