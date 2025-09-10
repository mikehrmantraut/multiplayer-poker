import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { tableRegistry } from './tableRegistry';
import { sanitizeTableStateForClient, generatePlayerId, generateDefaultAvatar } from '../engine/utils';
import { 
  validateData,
  JoinTableSchema,
  LeaveTableSchema,
  BetActionSchema,
  RaiseActionSchema,
  CallActionSchema,
  CheckActionSchema,
  FoldActionSchema,
  ChatMessageSchema
} from './validators';
import { PlayerAction, ChatMessage, TableState } from '../engine/types';

interface SocketData {
  playerId?: string;
  playerName?: string;
  currentTableId?: string;
}


let globalIo: SocketIOServer;

export function setupSocketHandlers(server: HttpServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  globalIo = io; // Store reference globally

  // Map to track player connections
  const playerSockets = new Map<string, Socket>();

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);
    (socket as any).data = {} as SocketData;

    // Player joins a table
    socket.on('player:join', (data, callback) => {
      const validation = validateData(JoinTableSchema, data);
      
      if (!validation.success) {
        callback({ success: false, error: validation.error });
        return;
      }

      const { tableId, name, avatarUrl } = validation.data;
      const table = tableRegistry.getTable(tableId);
      
      if (!table) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      // Generate player ID and avatar if needed
      const playerId = generatePlayerId();
      const finalAvatarUrl = avatarUrl || generateDefaultAvatar(name);

      // Add player to table
      const success = table.addPlayer(playerId, name, finalAvatarUrl);
      
      if (!success) {
        callback({ success: false, error: 'Table is full or player already exists' });
        return;
      }

      // Update socket data
      (socket as any).data.playerId = playerId;
      (socket as any).data.playerName = name;
      (socket as any).data.currentTableId = tableId;

      // Track player socket
      playerSockets.set(playerId, socket);

      // Join socket room
      socket.join(`table:${tableId}`);

      // Send success response
      callback({ success: true, playerId });

      // Broadcast updated table state
      const tableState = table.getState();
      broadcastTableStateToRoom(io, `table:${tableId}`, tableState);

      // Send action request to current player if game is active
      const actionRequest = table.getActionRequest();
      if (actionRequest) {
        io.to(`table:${tableId}`).emit('action:request', actionRequest);
      }

      // Broadcast player joined
      socket.to(`table:${tableId}`).emit('player:joined', {
        playerId,
        name,
        avatarUrl: finalAvatarUrl,
      });

      console.log(`Player ${name} (${playerId}) joined table ${tableId}`);
    });

    // Player leaves table
    socket.on('player:leave', (data, callback) => {
      const validation = validateData(LeaveTableSchema, data);
      
      if (!validation.success) {
        callback({ success: false, error: validation.error });
        return;
      }

      const { tableId } = validation.data;
      const playerId = (socket as any).data.playerId;
      
      if (!playerId) {
        callback({ success: false, error: 'Not joined to any table' });
        return;
      }

      const table = tableRegistry.getTable(tableId);
      if (!table) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      // Remove player from table
      const success = table.removePlayer(playerId);
      
      if (success) {
        // Clean up socket data
        playerSockets.delete(playerId);
        socket.leave(`table:${tableId}`);
        
        // Clear socket data
        (socket as any).data.playerId = undefined;
        (socket as any).data.playerName = undefined;
        (socket as any).data.currentTableId = undefined;

        callback({ success: true });

        // Broadcast updated table state
        const tableState = table.getState();
        io.to(`table:${tableId}`).emit('table:state', sanitizeTableStateForClient(tableState));

        // Broadcast player left
        socket.to(`table:${tableId}`).emit('player:left', { playerId });

        console.log(`Player ${playerId} left table ${tableId}`);
      } else {
        callback({ success: false, error: 'Failed to leave table' });
      }
    });

    // Betting actions
    socket.on('action:fold', (data, callback) => {
      handlePlayerAction(socket, 'fold', 0, callback);
    });

    socket.on('action:check', (data, callback) => {
      const validation = validateData(CheckActionSchema, data);
      if (!validation.success) {
        callback({ success: false, error: validation.error });
        return;
      }
      handlePlayerAction(socket, 'check', 0, callback);
    });

    socket.on('action:call', (data, callback) => {
      const validation = validateData(CallActionSchema, data);
      if (!validation.success) {
        callback({ success: false, error: validation.error });
        return;
      }
      handlePlayerAction(socket, 'call', 0, callback);
    });

    socket.on('action:bet', (data, callback) => {
      const validation = validateData(BetActionSchema, data);
      if (!validation.success) {
        callback({ success: false, error: validation.error });
        return;
      }
      handlePlayerAction(socket, 'bet', validation.data.amount, callback);
    });

    socket.on('action:raise', (data, callback) => {
      const validation = validateData(RaiseActionSchema, data);
      if (!validation.success) {
        callback({ success: false, error: validation.error });
        return;
      }
      handlePlayerAction(socket, 'raise', validation.data.amount, callback);
    });

    // Chat messages
    socket.on('chat:send', (data, callback) => {
      const validation = validateData(ChatMessageSchema, data);
      
      if (!validation.success) {
        callback({ success: false, error: validation.error });
        return;
      }

      const playerId = (socket as any).data.playerId;
      const tableId = (socket as any).data.currentTableId;
      
      if (!playerId || !tableId) {
        callback({ success: false, error: 'Not joined to any table' });
        return;
      }

      const chatMessage: ChatMessage = {
        playerId,
        message: validation.data.message,
        timestamp: Date.now(),
      };

      // Broadcast chat message
      io.to(`table:${tableId}`).emit('chat:new', chatMessage);
      
      callback({ success: true });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      const playerId = (socket as any).data.playerId;
      const tableId = (socket as any).data.currentTableId;
      
      if (playerId && tableId) {
        const table = tableRegistry.getTable(tableId);
        if (table) {
          table.removePlayer(playerId);
          
          // Broadcast updated table state
          const tableState = table.getState();
          io.to(`table:${tableId}`).emit('table:state', sanitizeTableStateForClient(tableState));
          
          // Broadcast player left
          socket.to(`table:${tableId}`).emit('player:left', { playerId });
        }
        
        playerSockets.delete(playerId);
      }
    });
  });

  // Helper function to handle player actions
  function handlePlayerAction(
    socket: Socket,
    action: PlayerAction,
    amount: number,
    callback: (result: { success: boolean; error?: string }) => void
  ) {
      const playerId = (socket as any).data.playerId;
      const tableId = (socket as any).data.currentTableId;
    
    if (!playerId || !tableId) {
      callback({ success: false, error: 'Not joined to any table' });
      return;
    }

    const table = tableRegistry.getTable(tableId);
    if (!table) {
      callback({ success: false, error: 'Table not found' });
      return;
    }

    // Process the action
    const success = table.processAction(playerId, action, amount);
    
    if (success) {
      callback({ success: true });

      // Broadcast action result
      io.to(`table:${tableId}`).emit('action:result', {
        playerId,
        action,
        amount,
        timestamp: Date.now(),
      });

      // Broadcast updated table state
      const tableState = table.getState();
      broadcastTableStateToRoom(io, `table:${tableId}`, tableState);

      // Send action request to next player if needed
      const actionRequest = table.getActionRequest();
      if (actionRequest) {
        io.to(`table:${tableId}`).emit('action:request', actionRequest);
      }

      // Handle special events based on game stage
      const stage = tableState.stage;
      
      if (stage === 'flop' || stage === 'turn' || stage === 'river') {
        io.to(`table:${tableId}`).emit('hand:stage', {
          stage,
          communityCards: tableState.communityCards,
        });
      }
      
      if (stage === 'showdown' && tableState.winners) {
        // Send showdown results
        setTimeout(() => {
          io.to(`table:${tableId}`).emit('hand:showdown', {
            winners: tableState.winners,
            // Note: In a real implementation, you'd want to show all players' cards
          });
        }, 1000);
      }

      // Update pot display
      io.to(`table:${tableId}`).emit('pot:update', {
        mainPot: tableState.pots.find(p => p.isMainPot)?.amount || 0,
        sidePots: tableState.pots.filter(p => !p.isMainPot).map(p => p.amount),
        totalPot: tableState.pots.reduce((sum, p) => sum + p.amount, 0),
      });

    } else {
      callback({ success: false, error: 'Invalid action' });
    }
  }

  // Periodic table state broadcast (for action timers, etc.)
  setInterval(() => {
    for (const tableId of tableRegistry.getAllTableIds()) {
      const table = tableRegistry.getTable(tableId);
      if (table) {
        const tableState = table.getState();
        
        // Send action request if someone needs to act
        const actionRequest = table.getActionRequest();
        if (actionRequest) {
          io.to(`table:${tableId}`).emit('action:request', actionRequest);
        }
      }
    }
  }, 1000); // Every second

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return globalIo || null;
}

/**
 * Broadcast table state to all clients in a room with personalized data
 */
export function broadcastTableStateToRoom(io: SocketIOServer, room: string, tableState: TableState): void {
  // Get all sockets in the room
  const sockets = io.sockets.adapter.rooms.get(room);
  if (!sockets) return;

  // Send personalized state to each socket
  sockets.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) return;

    const socketData = (socket as any).data as SocketData;
    const clientPlayerId = socketData.playerId;
    
    // Send personalized table state
    socket.emit('table:state', sanitizeTableStateForClient(tableState, clientPlayerId));
  });
}