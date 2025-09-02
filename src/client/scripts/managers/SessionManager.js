/**
 * Session Manager for LitMPlayer Game Client
 * Handles session joining, leaving, and player management
 */

import { generateSessionId } from '../utils/helpers.js';

export class SessionManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.savedSessions = [];
    this.sessionPlayers = [];
  }

  /**
   * Handle joining a session
   */
  handleJoinSession() {
    const sessionId = document.getElementById('session-id').value.trim();
    const playerName = document.getElementById('player-name').value.trim();
    const isGM = document.getElementById('is-gm').checked;

    if (!sessionId || !playerName) {
      this.gameClient.uiManager.showError('Please enter both session ID and player name');
      return;
    }

    console.log('🔗 Attempting to join session:', { sessionId, playerName, isGM });
    this.gameClient.uiManager.showLoading(true);

    this.gameClient.webSocketManager.joinSession({
      sessionId: sessionId,
      playerName: playerName,
      isGM: isGM
    });
  }

  /**
   * Handle creating a new session
   */
  handleCreateSession() {
    const sessionId = generateSessionId();
    const playerName = document.getElementById('player-name').value.trim();
    
    if (!playerName) {
      this.gameClient.uiManager.showError('Please enter your name first');
      return;
    }

    document.getElementById('session-id').value = sessionId;
    document.getElementById('is-gm').checked = true;
    
    this.gameClient.uiManager.showError(`New session created: ${sessionId}. You are the Narrator.`, 'info');
  }

  /**
   * Handle leaving the current session
   */
  handleLeaveSession() {
    if (this.gameClient.webSocketManager.isSocketConnected() && this.gameClient.currentSession) {
      this.gameClient.webSocketManager.leaveSession();
      
      // Clear reconnection information when leaving session
      this.gameClient.handleSessionLeft();
      
      this.gameClient.uiManager.showWelcomeScreen();
    }
  }

  /**
   * Handle saved sessions response
   * @param {Object} data - Saved sessions data
   */
  handleSavedSessions(data) {
    this.savedSessions = data.sessions || [];
    this.gameClient.uiManager.updateSavedSessionsDisplay(this.savedSessions);
  }

  /**
   * Select a saved session
   * @param {string} sessionId - Session ID to select
   */
  selectSavedSession(sessionId) {
    document.getElementById('session-id').value = sessionId;
    this.loadSessionPlayers(sessionId);
  }

  /**
   * Load players for a session
   * @param {string} sessionId - Session ID
   */
  loadSessionPlayers(sessionId) {
    if (this.gameClient.webSocketManager.isSocketConnected()) {
      this.gameClient.webSocketManager.getSessionPlayers({ sessionId });
    }
  }

  /**
   * Handle session players response
   * @param {Object} data - Session players data
   */
  handleSessionPlayers(data) {
    this.sessionPlayers = data.players || [];
    this.gameClient.uiManager.updatePlayerAutocomplete(this.sessionPlayers);
  }

  /**
   * Handle session joined event
   * @param {Object} data - Session joined data
   */
  handleSessionJoined(data) {
    console.log('🎉 Session joined event received:', data);
    this.gameClient.currentSession = data.session;
    this.gameClient.currentPlayer = data.player;
    this.gameClient.gameState = data.gameState;
    
    console.log('📊 Current session state:', {
      sessionJoinComplete: this.gameClient.sessionJoinComplete,
      currentSession: this.gameClient.currentSession,
      currentPlayer: this.gameClient.currentPlayer,
      gameState: this.gameClient.gameState
    });
    
    // Log detailed game state information
    if (this.gameClient.gameState) {
      console.log('📊 Game state details:', {
        gameObjectsCount: this.gameClient.gameState.gameObjects?.length || 0,
        currentScene: this.gameClient.gameState.currentScene,
        activeChallenge: this.gameClient.gameState.activeChallenge,
        scenes: this.gameClient.gameState.gameObjects?.filter(obj => obj.type === 'scene').map(s => ({ id: s.id, name: s.contents.name })) || [],
        characters: this.gameClient.gameState.gameObjects?.filter(obj => obj.type === 'character').map(c => ({ id: c.id, name: c.contents.characterName })) || []
      });
    }
    
    this.gameClient.uiManager.showGameScreen();
    this.gameClient.updateGameUI();
    this.gameClient.uiManager.showLoading(false);
    
    // Add a small delay to ensure server-side processing is complete
    setTimeout(() => {
      this.gameClient.sessionJoinComplete = true; // Mark session join as complete
      console.log('✅ Session join complete, dice rolls now allowed');
    }, 100);
  }

  /**
   * Handle player joined event
   * @param {Object} data - Player joined data
   */
  handlePlayerJoined(data) {
    // Update session data if provided
    if (data.session) {
      this.gameClient.currentSession = data.session;
    }
    
    this.updatePlayersList();
    this.gameClient.uiManager.showNotification(`${data.player.name} joined the session`);
  }

  /**
   * Handle player left event
   * @param {Object} data - Player left data
   */
  handlePlayerLeft(data) {
    // Update session data if provided
    if (data.session) {
      this.gameClient.currentSession = data.session;
    }
    
    this.updatePlayersList();
    this.gameClient.uiManager.showNotification(`${data.playerName} left the session`);
  }

  /**
   * Handle player disconnected event
   * @param {Object} data - Player disconnected data
   */
  handlePlayerDisconnected(data) {
    // Update session data if provided
    if (data.session) {
      this.gameClient.currentSession = data.session;
    }
    
    this.updatePlayersList();
    this.gameClient.uiManager.showNotification(`${data.playerName} disconnected`);
  }

  /**
   * Update players list
   */
  updatePlayersList() {
    if (!this.gameClient.currentSession) return;

    // Handle different formats for players data
    let players = [];
    if (this.gameClient.currentSession.players) {
      if (Array.isArray(this.gameClient.currentSession.players)) {
        players = this.gameClient.currentSession.players;
      } else if (this.gameClient.currentSession.players.values && typeof this.gameClient.currentSession.players.values === 'function') {
        // It's a Map-like object
        players = Array.from(this.gameClient.currentSession.players.values());
      } else if (typeof this.gameClient.currentSession.players === 'object') {
        // It's a plain object, convert to array
        players = Object.values(this.gameClient.currentSession.players);
      }
    }
    
    this.gameClient.uiManager.updatePlayersList(players);
    this.gameClient.uiManager.updateSessionInfo(this.gameClient.currentSession);
  }

  /**
   * Get current session
   * @returns {Object|null} Current session
   */
  getCurrentSession() {
    return this.gameClient.currentSession;
  }

  /**
   * Get current player
   * @returns {Object|null} Current player
   */
  getCurrentPlayer() {
    return this.gameClient.currentPlayer;
  }

  /**
   * Check if current player is GM
   * @returns {boolean} Whether current player is GM
   */
  isCurrentPlayerGM() {
    return this.gameClient.currentPlayer?.isGM || false;
  }

  /**
   * Get saved sessions
   * @returns {Array} Array of saved sessions
   */
  getSavedSessions() {
    return this.savedSessions;
  }

  /**
   * Get session players
   * @returns {Array} Array of session players
   */
  getSessionPlayers() {
    return this.sessionPlayers;
  }
}
