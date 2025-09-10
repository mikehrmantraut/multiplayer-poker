import { io, Socket } from 'socket.io-client';
import { 
  TableState, 
  ActionRequest, 
  ChatMessage, 
  JoinTableData, 
  SocketResponse 
} from './types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    console.log(`Connecting to ${WS_URL}...`);
    
    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after maximum attempts');
    });
  }

  // Game actions
  joinTable(data: JoinTableData): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('player:join', data, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  leaveTable(tableId: string): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('player:leave', { tableId }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  fold(): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('action:fold', {}, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  check(): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('action:check', {}, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  call(): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('action:call', {}, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  bet(amount: number): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('action:bet', { amount }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  raise(amount: number): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('action:raise', { amount }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  sendChatMessage(message: string): Promise<SocketResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.socket.emit('chat:send', { message }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  // Event listeners
  onTableState(callback: (state: TableState) => void): void {
    console.log('🔧 Setting up table:state listener');
    this.socket?.on('table:state', (state) => {
      console.log('📊 Raw table:state received:', state);
      callback(state);
    });
  }

  onActionRequest(callback: (request: ActionRequest) => void): void {
    console.log('🔧 Setting up action:request listener');
    this.socket?.on('action:request', (request) => {
      console.log('🎯 Raw action:request received:', request);
      callback(request);
    });
  }

  onActionResult(callback: (result: any) => void): void {
    this.socket?.on('action:result', callback);
  }

  onHandStage(callback: (data: { stage: string; communityCards: any[] }) => void): void {
    this.socket?.on('hand:stage', callback);
  }

  onHandShowdown(callback: (data: any) => void): void {
    this.socket?.on('hand:showdown', callback);
  }

  onPotUpdate(callback: (data: { mainPot: number; sidePots: number[]; totalPot: number }) => void): void {
    this.socket?.on('pot:update', callback);
  }

  onPlayerJoined(callback: (data: { playerId: string; name: string; avatarUrl?: string }) => void): void {
    this.socket?.on('player:joined', callback);
  }

  onPlayerLeft(callback: (data: { playerId: string }) => void): void {
    this.socket?.on('player:left', callback);
  }

  onChatMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.on('chat:new', callback);
  }

  onConnectionState(callbacks: {
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onError?: (error: any) => void;
  }): void {
    if (callbacks.onConnect) {
      this.socket?.on('connect', callbacks.onConnect);
    }
    if (callbacks.onDisconnect) {
      this.socket?.on('disconnect', callbacks.onDisconnect);
    }
    if (callbacks.onError) {
      this.socket?.on('connect_error', callbacks.onError);
    }
  }

  // Remove listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  removeListener(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}

// Singleton instance
export const socketManager = new SocketManager();
export default socketManager;
