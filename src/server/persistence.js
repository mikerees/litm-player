/**
 * Data Persistence Manager for LitMPlayer
 * Handles saving and loading session data to/from JSON files
 */

const fs = require('fs').promises;
const path = require('path');

class PersistenceManager {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.sessionsDir = path.join(this.dataDir, 'sessions');
    this.ensureDataDirectories();
  }

  /**
   * Ensure data directories exist
   */
  async ensureDataDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directories:', error);
    }
  }

  /**
   * Save session data to file
   * @param {string} sessionId - Session identifier
   * @param {Object} sessionData - Complete session data
   */
  async saveSessionData(sessionId, sessionData) {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      const dataToSave = {
        sessionId,
        lastSaved: new Date().toISOString(),
        ...sessionData
      };
      
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
      console.log(`💾 Saved session data for ${sessionId}`);
    } catch (error) {
      console.error(`Error saving session data for ${sessionId}:`, error);
    }
  }

  /**
   * Load session data from file
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session data or null if not found
   */
  async loadSessionData(sessionId) {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const sessionData = JSON.parse(data);
      console.log(`📂 Loaded session data for ${sessionId}`);
      return sessionData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📂 No saved data found for session ${sessionId}`);
        return null;
      }
      console.error(`Error loading session data for ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get list of all saved sessions
   * @returns {Array} Array of session metadata
   */
  async getAllSessions() {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const sessionData = await this.loadSessionData(sessionId);
          if (sessionData) {
            sessions.push({
              sessionId,
              name: sessionData.session?.name || sessionId,
              created: sessionData.session?.created,
              lastSaved: sessionData.lastSaved,
              playerCount: sessionData.session?.players?.size || 0,
              isActive: sessionData.session?.isActive || false
            });
          }
        }
      }
      
      return sessions.sort((a, b) => new Date(b.lastSaved) - new Date(a.lastSaved));
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return [];
    }
  }

  /**
   * Get list of players who have participated in a session
   * @param {string} sessionId - Session identifier
   * @returns {Array} Array of player names
   */
  async getSessionPlayers(sessionId) {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      if (!sessionData || !sessionData.session) return [];
      
      const players = [];
      if (sessionData.session.players) {
        // Handle both Map and Array formats
        const playerList = sessionData.session.players instanceof Map 
          ? Array.from(sessionData.session.players.values())
          : Array.isArray(sessionData.session.players) 
            ? sessionData.session.players 
            : Object.values(sessionData.session.players);
        
        players.push(...playerList.map(p => p.name).filter(Boolean));
      }
      
      return [...new Set(players)]; // Remove duplicates
    } catch (error) {
      console.error(`Error getting players for session ${sessionId}:`, error);
      return [];
    }
  }

  /**
   * Delete session data
   * @param {string} sessionId - Session identifier
   */
  async deleteSessionData(sessionId) {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted session data for ${sessionId}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`🗑️ No data to delete for session ${sessionId}`);
        return;
      }
      console.error(`Error deleting session data for ${sessionId}:`, error);
    }
  }

  /**
   * Save complete session state (session + game state)
   * @param {string} sessionId - Session identifier
   * @param {Object} session - Session data
   * @param {Object} gameState - Game state data
   */
  async saveCompleteSession(sessionId, session, gameState) {
    const sessionData = {
      session: this.serializeSession(session),
      gameState: this.serializeGameState(gameState)
    };
    
    await this.saveSessionData(sessionId, sessionData);
  }

  /**
   * Load complete session state
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Complete session data or null
   */
  async loadCompleteSession(sessionId) {
    const data = await this.loadSessionData(sessionId);
    if (!data) return null;
    
    return {
      session: this.deserializeSession(data.session),
      gameState: this.deserializeGameState(data.gameState)
    };
  }

  /**
   * Serialize session data for storage
   * @param {Object} session - Session object
   * @returns {Object} Serialized session
   */
  serializeSession(session) {
    if (!session) return null;
    
    return {
      ...session,
      players: session.players instanceof Map 
        ? Array.from(session.players.entries())
        : session.players
    };
  }

  /**
   * Deserialize session data from storage
   * @param {Object} sessionData - Serialized session data
   * @returns {Object} Deserialized session
   */
  deserializeSession(sessionData) {
    if (!sessionData) return null;
    
    const session = { ...sessionData };
    
    // Convert players array back to Map
    if (Array.isArray(session.players)) {
      session.players = new Map(session.players);
    }
    
    return session;
  }

  /**
   * Serialize game state for storage
   * @param {Object} gameState - Game state object
   * @returns {Object} Serialized game state
   */
  serializeGameState(gameState) {
    if (!gameState) return null;
    
    return {
      ...gameState,
      // Keep only last 20 chat messages and 5 dice rolls for persistence
      chat: gameState.chat ? gameState.chat.slice(-20) : [],
      diceRolls: gameState.diceRolls ? gameState.diceRolls.slice(-5) : [],
      notes: gameState.notes ? gameState.notes.slice(-10) : []
    };
  }

  /**
   * Deserialize game state from storage
   * @param {Object} gameStateData - Serialized game state data
   * @returns {Object} Deserialized game state
   */
  deserializeGameState(gameStateData) {
    if (!gameStateData) return null;
    
    return {
      ...gameStateData,
      // Ensure arrays exist
      chat: gameStateData.chat || [],
      diceRolls: gameStateData.diceRolls || [],
      notes: gameStateData.notes || [],
      gameObjects: gameStateData.gameObjects || []
    };
  }

  /**
   * Auto-save session data (called periodically)
   * @param {string} sessionId - Session identifier
   * @param {Object} session - Session data
   * @param {Object} gameState - Game state data
   */
  async autoSave(sessionId, session, gameState) {
    try {
      await this.saveCompleteSession(sessionId, session, gameState);
    } catch (error) {
      console.error(`Auto-save failed for session ${sessionId}:`, error);
    }
  }

  /**
   * Get session statistics
   * @param {string} sessionId - Session identifier
   * @returns {Object} Session statistics
   */
  async getSessionStats(sessionId) {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      if (!sessionData) return null;
      
      return {
        sessionId,
        totalChatMessages: sessionData.gameState?.chat?.length || 0,
        totalDiceRolls: sessionData.gameState?.diceRolls?.length || 0,
        totalNotes: sessionData.gameState?.notes?.length || 0,
        totalGameObjects: sessionData.gameState?.gameObjects?.length || 0,
        lastSaved: sessionData.lastSaved,
        created: sessionData.session?.created
      };
    } catch (error) {
      console.error(`Error getting stats for session ${sessionId}:`, error);
      return null;
    }
  }
}

module.exports = PersistenceManager;
