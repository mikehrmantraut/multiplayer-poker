import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { setupSocketHandlers } from './sockets';
import { initializeDefaultTable, tableRegistry } from './tableRegistry';

// Environment variables
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Create Express app
const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = tableRegistry.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats,
  });
});

// Get available tables
app.get('/api/tables', (req, res) => {
  const availableTables = tableRegistry.getAvailableTables();
  res.json({
    tables: availableTables,
  });
});

// Get table info
app.get('/api/tables/:tableId', (req, res) => {
  const { tableId } = req.params;
  const table = tableRegistry.getTable(tableId);
  
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const state = table.getState();
  const playerCount = state.seats.filter(seat => !seat.isEmpty).length;
  
  res.json({
    tableId,
    playerCount,
    maxPlayers: state.maxPlayers,
    stage: state.stage,
    isHandActive: state.isHandActive,
    blinds: state.blinds,
  });
});

// Create new table
app.post('/api/tables', (req, res) => {
  const { maxPlayers = 5, smallBlind = 5, bigBlind = 10 } = req.body;
  
  // Validate parameters
  if (maxPlayers < 2 || maxPlayers > 10) {
    return res.status(400).json({ error: 'Max players must be between 2 and 10' });
  }
  
  if (smallBlind < 1 || bigBlind < smallBlind * 2) {
    return res.status(400).json({ error: 'Invalid blind structure' });
  }
  
  const tableId = tableRegistry.createTable(maxPlayers, smallBlind, bigBlind);
  
  res.status(201).json({
    tableId,
    message: 'Table created successfully',
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Setup Socket.IO
const io = setupSocketHandlers(server);

// Initialize default table
const defaultTableId = initializeDefaultTable();

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Poker server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🃏 Default table created: ${defaultTableId}`);
  console.log(`🌐 Client URL: ${CLIENT_URL}`);
  
  // Log table stats every minute
  setInterval(() => {
    const stats = tableRegistry.getStats();
    console.log(`📊 Tables: ${stats.totalTables}, Players: ${stats.totalPlayers}, Active: ${stats.activeTables}`);
  }, 60000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
