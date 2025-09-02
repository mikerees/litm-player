/**
 * Session Manager for LitMPlayer
 * Handles game session creation, management, and player tracking
 */

const PersistenceManager = require('./persistence');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxPlayersPerSession = 10;
    this.sessionTimeout = 3600000; // 1 hour in milliseconds
    this.persistence = new PersistenceManager();
    this.autoSaveInterval = 30000; // 30 seconds
    this.autoSaveTimers = new Map();
    
    // Start auto-save cleanup
    this.startAutoSaveCleanup();
  }

  /**
   * Create a new game session
   * @param {string} sessionId - Unique session identifier
   * @param {Object} options - Session configuration options
   * @returns {Object} The created session
   */
  async createSession(sessionId, options = {}) {
    if (this.sessions.has(sessionId)) {
      throw new Error('Session already exists');
    }

    const session = {
      id: sessionId,
      name: options.name || `Session ${sessionId}`,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      players: new Map(),
      maxPlayers: options.maxPlayers || this.maxPlayersPerSession,
      isActive: true,
      settings: {
        allowSpectators: options.allowSpectators || false,
        autoSave: options.autoSave !== false, // Default to true
        ...options.settings
      }
    };

    this.sessions.set(sessionId, session);
    
    // Start auto-save if enabled
    if (session.settings.autoSave) {
      this.startAutoSave(sessionId);
    }
    
    console.log(`🎮 Created new session: ${sessionId}`);
    
    return session;
  }

  /**
   * Load an existing session from storage
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} The loaded session or null
   */
  async loadSession(sessionId) {
    try {
      const savedData = await this.persistence.loadCompleteSession(sessionId);
      if (!savedData) return null;

      const session = savedData.session;
      const gameState = savedData.gameState;

      // Restore session to memory
      this.sessions.set(sessionId, session);
      
      // Start auto-save if enabled
      if (session.settings.autoSave) {
        this.startAutoSave(sessionId);
      }
      
      console.log(`📂 Loaded existing session: ${sessionId}`);
      console.log(`   - Session data: ${!!session}`);
      console.log(`   - Game state data: ${!!gameState}`);
      console.log(`   - Game objects count: ${gameState?.gameObjects?.length || 0}`);
      
      return { session, gameState };
    } catch (error) {
      console.error(`Error loading session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get or create session (loads existing if available)
   * @param {string} sessionId - Session identifier
   * @param {Object} options - Session options for new sessions
   * @returns {Object} Session data
   */
  async getOrCreateSession(sessionId, options = {}) {
    // Try to load existing session first
    const existingData = await this.loadSession(sessionId);
    if (existingData) {
      return existingData;
    }

    // Create new session if none exists
    const session = await this.createSession(sessionId, options);
    return { session, gameState: null };
  }

  /**
   * Add a player to a session
   * @param {string} sessionId - Session identifier
   * @param {Object} player - Player object
   * @returns {Object} Updated session
   */
  addPlayerToSession(sessionId, player) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.players.size >= session.maxPlayers) {
      throw new Error('Session is full');
    }

    // Check if player with same ID already exists
    if (session.players.has(player.id)) {
      throw new Error('Player already in session');
    }

    // Check if a player with the same name already exists and handle reconnection
    const existingPlayer = Array.from(session.players.values()).find(p => p.name === player.name);
    if (existingPlayer) {
      // Remove the existing player entry completely
      session.players.delete(existingPlayer.id);
      
      // Create a new player entry with the new socket ID
      const updatedPlayer = {
        ...existingPlayer,
        id: player.id, // Use the new socket ID
        isGM: player.isGM, // Update GM status if changed
        joinedAt: new Date().toISOString() // Update join time
      };
      session.players.set(player.id, updatedPlayer);
      session.lastActivity = new Date().toISOString();
      session.isActive = true;

      console.log(`👤 Reconnected player ${player.name} to session ${sessionId} (replaced old connection)`);
      return session;
    }

    // Add new player to session
    session.players.set(player.id, player);
    session.lastActivity = new Date().toISOString();
    session.isActive = true;

    console.log(`👤 Added new player ${player.name} to session ${sessionId}`);
    
    return session;
  }

  /**
   * Remove a player from a session
   * @param {string} sessionId - Session identifier
   * @param {string} playerId - Player identifier
   * @returns {Object|null} The removed player or null
   */
  removePlayerFromSession(sessionId, playerId) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const player = session.players.get(playerId);
    if (!player) return null;

    session.players.delete(playerId);
    session.lastActivity = new Date().toISOString();

    // If no players left, mark session as inactive
    if (session.players.size === 0) {
      session.isActive = false;
      console.log(`🔚 Session ${sessionId} is now inactive (no players)`);
    }

    console.log(`👋 Removed player ${player.name} from session ${sessionId}`);
    
    return player;
  }

  /**
   * Get a session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session object or null
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of active sessions
   */
  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  /**
   * Get all sessions (including inactive)
   * @returns {Array} Array of all sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Get player by ID from any session
   * @param {string} playerId - Player identifier
   * @returns {Object|null} Player object or null
   */
  getPlayer(playerId) {
    for (const session of this.sessions.values()) {
      const player = session.players.get(playerId);
      if (player) return player;
    }
    return null;
  }

  /**
   * Get player name by ID
   * @param {string} sessionId - Session identifier
   * @param {string} playerId - Player identifier
   * @returns {string|null} Player name or null
   */
  getPlayerName(sessionId, playerId) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    
    const player = session.players.get(playerId);
    return player ? player.name : null;
  }

  /**
   * Update session activity
   * @param {string} sessionId - Session identifier
   */
  updateSessionActivity(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
    }
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session identifier
   */
  async deleteSession(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return;

    // Stop auto-save
    this.stopAutoSave(sessionId);

    // Remove from memory
    this.sessions.delete(sessionId);

    // Delete from storage
    await this.persistence.deleteSessionData(sessionId);

    console.log(`🗑️ Deleted session: ${sessionId}`);
  }

  /**
   * Save session data
   * @param {string} sessionId - Session identifier
   * @param {Object} gameState - Game state to save with session
   */
  async saveSession(sessionId, gameState = null) {
    const session = this.getSession(sessionId);
    if (!session) return;

    await this.persistence.saveCompleteSession(sessionId, session, gameState);
  }

  /**
   * Get all saved sessions from storage
   * @returns {Array} Array of saved session metadata
   */
  async getSavedSessions() {
    return await this.persistence.getAllSessions();
  }

  /**
   * Get players who have participated in a session
   * @param {string} sessionId - Session identifier
   * @returns {Array} Array of player names
   */
  async getSessionPlayers(sessionId) {
    return await this.persistence.getSessionPlayers(sessionId);
  }

  /**
   * Start auto-save for a session
   * @param {string} sessionId - Session identifier
   */
  startAutoSave(sessionId) {
    // Don't start auto-save if it's already running
    if (this.autoSaveTimers.has(sessionId)) {
      console.log(`⚠️ Auto-save already running for session ${sessionId}`);
      return;
    }
    
    this.stopAutoSave(sessionId); // Clear any existing timer
    
    const timer = setInterval(async () => {
      const session = this.getSession(sessionId);
      if (session && session.settings.autoSave) {
        // Note: gameState will be passed by the caller
        console.log(`🔄 Auto-saving session ${sessionId}`);
      }
    }, this.autoSaveInterval);
    
    this.autoSaveTimers.set(sessionId, timer);
    console.log(`🔄 Started auto-save for session ${sessionId}`);
  }

  /**
   * Stop auto-save for a session
   * @param {string} sessionId - Session identifier
   */
  stopAutoSave(sessionId) {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  /**
   * Start auto-save cleanup process
   */
  startAutoSaveCleanup() {
    setInterval(() => {
      // Clean up auto-save timers for sessions that no longer exist
      for (const [sessionId, timer] of this.autoSaveTimers.entries()) {
        if (!this.sessions.has(sessionId)) {
          clearInterval(timer);
          this.autoSaveTimers.delete(sessionId);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions() {
    const now = Date.now();
    const inactiveSessions = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.lastActivity).getTime();
      if (now - lastActivity > this.sessionTimeout) {
        inactiveSessions.push(sessionId);
      }
    }

    inactiveSessions.forEach(sessionId => {
      console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
      this.sessions.delete(sessionId);
      this.stopAutoSave(sessionId);
    });
  }

  /**
   * Clean up disconnected players
   * @param {string} sessionId - Session identifier
   * @param {Set} activeSocketIds - Set of currently active socket IDs
   */
  cleanupDisconnectedPlayers(sessionId, activeSocketIds) {
    const session = this.getSession(sessionId);
    if (!session) return;

    const disconnectedPlayers = [];
    
    // Find players whose socket IDs are no longer active
    for (const [playerId, player] of session.players.entries()) {
      if (!activeSocketIds.has(playerId)) {
        disconnectedPlayers.push({ playerId, player });
      }
    }

    // Remove disconnected players
    disconnectedPlayers.forEach(({ playerId, player }) => {
      session.players.delete(playerId);
      console.log(`🧹 Cleaned up disconnected player ${player.name} from session ${sessionId}`);
    });

    // Update session status if no players left
    if (session.players.size === 0) {
      session.isActive = false;
      console.log(`🔚 Session ${sessionId} is now inactive (no players)`);
    }
  }

  /**
   * Get session statistics
   * @param {string} sessionId - Session identifier
   * @returns {Object} Session statistics
   */
  async getSessionStats(sessionId) {
    return await this.persistence.getSessionStats(sessionId);
  }
}

module.exports = SessionManager;
