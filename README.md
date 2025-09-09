# Multiplayer Texas Hold'em Poker

A real-time multiplayer Texas Hold'em poker web application built with React, Node.js, TypeScript, and Socket.IO.

## Features

- **Real-time multiplayer gameplay** - Up to 5 players per table
- **Complete Texas Hold'em implementation** - All rules, betting rounds, and hand rankings
- **Server-authoritative game engine** - Secure, deterministic gameplay
- **Modern, responsive UI** - Clean poker table interface with animations
- **Side pot support** - Handles all-in scenarios correctly
- **Comprehensive hand evaluation** - All poker hands with proper tie-breaking
- **Live chat** - Communicate with other players
- **Auto-seating** - Players are seated evenly around the table

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Zustand** for state management
- **Socket.IO Client** for real-time communication
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript** throughout
- **Socket.IO** for WebSocket communication
- **Zod** for schema validation
- **Pure TypeScript game engine** (no framework dependencies)

### Development Tools
- **ESLint** and **Prettier** for code quality
- **Vitest** for unit testing
- **Concurrently** for running both servers

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multiplayer-poker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start both frontend and backend**
   ```bash
   npm run dev
   ```

This will start:
- Backend server on `http://localhost:4000`
- Frontend development server on `http://localhost:5173`

### Individual Commands

**Backend only:**
```bash
npm run dev --workspace=backend
```

**Frontend only:**
```bash
npm run dev --workspace=frontend
```

**Run tests:**
```bash
npm run test --workspace=backend
```

**Build for production:**
```bash
npm run build
```

## Game Rules

### Texas Hold'em Basics

1. **Setup**: Each player receives 2 hole cards (private)
2. **Blinds**: Small blind and big blind are posted
3. **Betting Rounds**: 
   - Pre-flop (after hole cards)
   - Flop (3 community cards)
   - Turn (4th community card) 
   - River (5th community card)
4. **Showdown**: Best 5-card hand wins

### Betting Actions
- **Fold**: Discard hand and forfeit
- **Check**: Pass action (no bet required)
- **Call**: Match the current bet
- **Bet**: Make the first bet in a round
- **Raise**: Increase the current bet
- **All-in**: Bet all remaining chips

### Hand Rankings (High to Low)
1. Royal Flush (A-K-Q-J-10 suited)
2. Straight Flush (5 consecutive suited cards)
3. Four of a Kind
4. Full House (3 of a kind + pair)
5. Flush (5 suited cards)
6. Straight (5 consecutive cards)
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

## Architecture

### Game Engine (`backend/src/engine/`)

The poker engine is built as pure TypeScript modules for maximum testability:

- **`table.ts`** - Main game state machine
- **`handEvaluator.ts`** - Poker hand evaluation and comparison
- **`deck.ts`** - Card deck with shuffling
- **`betting.ts`** - Betting logic and validation
- **`potManager.ts`** - Side pot calculation and distribution
- **`cards.ts`** - Card utilities and helpers

### Server (`backend/src/server/`)

- **`index.ts`** - Express server setup
- **`sockets.ts`** - Socket.IO event handlers
- **`tableRegistry.ts`** - Table management
- **`validators.ts`** - Zod schemas for validation

### Frontend (`frontend/src/`)

- **`components/`** - React UI components
- **`state/`** - Zustand store and Socket.IO client
- **`styles/`** - TailwindCSS styles

## API Reference

### Socket Events

#### Client → Server
```typescript
// Join a table
socket.emit('player:join', { 
  tableId: string, 
  name: string, 
  avatarUrl?: string 
})

// Leave table
socket.emit('player:leave', { tableId: string })

// Game actions
socket.emit('action:fold', {})
socket.emit('action:check', {})
socket.emit('action:call', {})
socket.emit('action:bet', { amount: number })
socket.emit('action:raise', { amount: number })

// Chat
socket.emit('chat:send', { message: string })
```

#### Server → Client
```typescript
// Game state updates
socket.on('table:state', (state: TableState) => {})
socket.on('action:request', (request: ActionRequest) => {})
socket.on('action:result', (result: ActionResult) => {})

// Game events
socket.on('hand:stage', (data: { stage: string, communityCards: Card[] }) => {})
socket.on('hand:showdown', (data: ShowdownResult) => {})
socket.on('pot:update', (data: PotUpdate) => {})

// Player events
socket.on('player:joined', (data: { playerId: string, name: string }) => {})
socket.on('player:left', (data: { playerId: string }) => {})

// Chat
socket.on('chat:new', (message: ChatMessage) => {})
```

### HTTP Endpoints

```
GET /health - Health check
GET /api/tables - List available tables
GET /api/tables/:id - Get table info
POST /api/tables - Create new table
```

## Environment Variables

### Backend
```env
PORT=4000                    # Server port
CLIENT_URL=http://localhost:5173  # Frontend URL for CORS
```

### Frontend
```env
VITE_WS_URL=http://localhost:4000  # Backend WebSocket URL
```

## Development

### Project Structure
```
multiplayer-poker/
├── backend/
│   ├── src/
│   │   ├── engine/          # Pure game logic
│   │   ├── server/          # Express + Socket.IO
│   │   └── __tests__/       # Unit tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── state/          # Zustand store
│   │   └── styles/         # TailwindCSS
│   └── package.json
└── package.json            # Root workspace config
```

### Testing

Run the comprehensive test suite:
```bash
npm test
```

Tests cover:
- Hand evaluation and comparison
- Side pot calculation
- Betting logic validation
- Edge cases and error handling

### Code Quality

```bash
npm run lint    # ESLint
npm run format  # Prettier
```

## Deployment

### Production Build
```bash
npm run build
```

### Docker (Optional)
```dockerfile
# Example Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server/index.js"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Texas Hold'em rules implementation
- Socket.IO for real-time communication
- TailwindCSS for beautiful styling
- Vitest for testing framework
