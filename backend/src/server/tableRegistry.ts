import { Table } from '../engine/table';
import { generateTableId } from '../engine/utils';

/**
 * Registry to manage all active tables
 */
export class TableRegistry {
  private tables: Map<string, Table> = new Map();

  /**
   * Create a new table
   */
  createTable(
    maxPlayers: number = 5, 
    smallBlind: number = 5, 
    bigBlind: number = 10,
    customId?: string
  ): string {
    const tableId = customId || generateTableId();
    const table = new Table(tableId, maxPlayers, smallBlind, bigBlind);
    this.tables.set(tableId, table);
    return tableId;
  }

  /**
   * Get a table by ID
   */
  getTable(tableId: string): Table | null {
    return this.tables.get(tableId) || null;
  }

  /**
   * Get all table IDs
   */
  getAllTableIds(): string[] {
    return Array.from(this.tables.keys());
  }

  /**
   * Get all tables
   */
  getAllTables(): Table[] {
    return Array.from(this.tables.values());
  }

  /**
   * Remove a table
   */
  removeTable(tableId: string): boolean {
    return this.tables.delete(tableId);
  }

  /**
   * Get table count
   */
  getTableCount(): number {
    return this.tables.size;
  }

  /**
   * Find tables with available seats
   */
  getAvailableTables(): Array<{ tableId: string; playerCount: number; maxPlayers: number }> {
    const availableTables: Array<{ tableId: string; playerCount: number; maxPlayers: number }> = [];
    
    for (const [tableId, table] of this.tables) {
      const state = table.getState();
      const playerCount = state.seats.filter(seat => !seat.isEmpty).length;
      
      if (playerCount < state.maxPlayers) {
        availableTables.push({
          tableId,
          playerCount,
          maxPlayers: state.maxPlayers,
        });
      }
    }
    
    return availableTables;
  }

  /**
   * Clean up empty tables periodically
   */
  cleanupEmptyTables(): void {
    const tablesToRemove: string[] = [];
    
    for (const [tableId, table] of this.tables) {
      const state = table.getState();
      const playerCount = state.seats.filter(seat => !seat.isEmpty).length;
      
      // Remove tables that have been empty for too long
      if (playerCount === 0 && state.stage === 'waiting_for_players') {
        tablesToRemove.push(tableId);
      }
    }
    
    for (const tableId of tablesToRemove) {
      this.removeTable(tableId);
      console.log(`Removed empty table: ${tableId}`);
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTables: number;
    totalPlayers: number;
    activeTables: number;
    waitingTables: number;
  } {
    let totalPlayers = 0;
    let activeTables = 0;
    let waitingTables = 0;
    
    for (const table of this.tables.values()) {
      const state = table.getState();
      const playerCount = state.seats.filter(seat => !seat.isEmpty).length;
      
      totalPlayers += playerCount;
      
      if (state.isHandActive) {
        activeTables++;
      } else if (state.stage === 'waiting_for_players') {
        waitingTables++;
      }
    }
    
    return {
      totalTables: this.tables.size,
      totalPlayers,
      activeTables,
      waitingTables,
    };
  }
}

// Singleton instance
export const tableRegistry = new TableRegistry();

// Create a default table on startup
export function initializeDefaultTable(): string {
  const defaultTableId = tableRegistry.createTable(5, 5, 10, 'default-table');
  console.log(`Created default table: ${defaultTableId}`);
  return defaultTableId;
}

// Cleanup task - run every 5 minutes
setInterval(() => {
  tableRegistry.cleanupEmptyTables();
}, 5 * 60 * 1000);
