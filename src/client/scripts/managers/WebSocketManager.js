/**
 * WebSocket Manager for LitMPlayer Game Client
 * Handles all WebSocket communication with the server
 */

import { SOCKET_EVENTS, CLIENT_EVENTS } from '../utils/constants.js';

export class WebSocketManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.socket = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.wasConnected = false; // Track if we were previously connected
    this.currentSessionId = null; // Track current session for reconnection
    this.currentPlayerName = null; // Track current player for reconnection
  }

  /**
   * Initialize WebSocket connection
   */
  initializeSocket() {
    this.socket = io();
    
    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('Connected to server');
      this.isConnected = true;
      this.connectionStatus = 'connected';
      this.gameClient.updateConnectionStatus('Connected', 'online');
      
      // Check if this is a reconnection
      if (this.wasConnected && this.currentSessionId && this.currentPlayerName) {
        console.log('🔄 Reconnection detected, requesting current game state...');
        this.handleReconnection();
      } else {
        // First connection, load saved sessions
        this.loadSavedSessions();
      }
      
      this.wasConnected = true;
    });

    // Set up window focus/blur detection for reconnection handling
    this.setupWindowFocusDetection();

    this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.gameClient.sessionJoinComplete = false; // Reset session join flag on disconnect
      this.gameClient.updateConnectionStatus('Disconnected', 'offline');
    });

    this.socket.on(SOCKET_EVENTS.CONNECTED, (data) => {
      console.log('Server connection confirmed:', data);
    });

    this.socket.on(SOCKET_EVENTS.SESSION_JOINED, (data) => {
      console.log('Joined session:', data);
      this.gameClient.handleSessionJoined(data);
    });

    this.socket.on(SOCKET_EVENTS.SESSION_LEFT, (data) => {
      console.log('Left session:', data);
      this.gameClient.handleSessionLeft();
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data) => {
      console.log('Player joined:', data);
      this.gameClient.handlePlayerJoined(data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, (data) => {
      console.log('Player left:', data);
      this.gameClient.handlePlayerLeft(data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, (data) => {
      console.log('Player disconnected:', data);
      this.gameClient.handlePlayerDisconnected(data);
    });

    this.socket.on(SOCKET_EVENTS.GAME_STATE_UPDATED, (data) => {
      console.log('Game state updated:', data);
      this.gameClient.handleGameStateUpdate(data);
    });

    this.socket.on(SOCKET_EVENTS.CURRENT_GAME_STATE, (data) => {
      console.log('Current game state received (reconnection):', data);
      this.gameClient.handleCurrentGameState(data);
    });

    this.socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (data) => {
      console.log('Chat message received:', data);
      this.gameClient.handleChatMessage(data);
    });

    this.socket.on(SOCKET_EVENTS.DICE_ROLLED, (data) => {
      console.log('Dice rolled:', data);
      this.gameClient.handleDiceRoll(data);
    });

    this.socket.on(SOCKET_EVENTS.SAVED_SESSIONS, (data) => {
      console.log('Saved sessions received:', data);
      this.gameClient.handleSavedSessions(data);
    });

    this.socket.on(SOCKET_EVENTS.SESSION_PLAYERS, (data) => {
      console.log('Session players received:', data);
      this.gameClient.handleSessionPlayers(data);
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (data) => {
      console.error('Server error:', data);
      this.gameClient.showError(data.message);
      
      // If this is a reconnection error, remove reconnecting status and clear timeout
      if (this.currentSessionId && this.currentPlayerName) {
        const statusBar = document.getElementById('connection-status');
        if (statusBar) {
          statusBar.classList.remove('reconnecting');
        }
        
        // Clear reconnection timeout if it exists
        if (this.reconnectionTimeout) {
          clearTimeout(this.reconnectionTimeout);
          this.reconnectionTimeout = null;
        }
      }
    });
  }

  /**
   * Load saved sessions from server
   */
  loadSavedSessions() {
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.GET_SAVED_SESSIONS);
    }
  }

  /**
   * Join a session
   * @param {Object} data - Session join data
   */
  joinSession(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.JOIN_SESSION, data);
    }
  }

  /**
   * Leave current session
   */
  leaveSession() {
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.LEAVE_SESSION);
    }
  }

  /**
   * Send game action to server
   * @param {Object} action - Game action to send
   */
  sendGameAction(action) {
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.GAME_ACTION, action);
    }
  }

  /**
   * Send chat message
   * @param {Object} data - Chat message data
   */
  sendChatMessage(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.CHAT_MESSAGE, data);
    }
  }

  /**
   * Send dice roll request
   * @param {Object} data - Dice roll data
   */
  sendDiceRoll(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.ROLL_DICE, data);
    }
  }

  /**
   * Get session players
   * @param {Object} data - Session data
   */
  getSessionPlayers(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.GET_SESSION_PLAYERS, data);
    }
  }

  /**
   * Get current game state from server (for reconnection scenarios)
   */
  getCurrentGameState() {
    console.log('🔄 Requesting current game state...', {
      sessionId: this.currentSessionId,
      playerName: this.currentPlayerName,
      isConnected: this.isConnected,
      hasSocket: !!this.socket
    });
    
    if (this.socket && this.isConnected) {
      this.socket.emit(CLIENT_EVENTS.GET_CURRENT_GAME_STATE, {
        sessionId: this.currentSessionId,
        playerName: this.currentPlayerName
      });
    } else {
      console.error('⚠️ Cannot get current game state: WebSocket not connected');
    }
  }

  /**
   * Set up window focus/blur detection for reconnection handling
   */
  setupWindowFocusDetection() {
    let focusTimeout;
    let blurTimeout;

    // When window loses focus, set a timeout to check connection
    window.addEventListener('blur', () => {
      console.log('📱 Window lost focus');
      // Clear any existing focus timeout
      if (focusTimeout) {
        clearTimeout(focusTimeout);
        focusTimeout = null;
      }
    });

    // When window regains focus, check connection and refresh state if needed
    window.addEventListener('focus', () => {
      console.log('📱 Window regained focus');
      
      // Clear any existing blur timeout
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }

      // Set a small delay to allow WebSocket to stabilize
      focusTimeout = setTimeout(() => {
        this.handleWindowFocus();
      }, 1000);
    });

    // When page becomes visible (tab switching, etc.)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📱 Page became visible');
        // Set a small delay to allow WebSocket to stabilize
        focusTimeout = setTimeout(() => {
          this.handleWindowFocus();
        }, 1000);
      }
    });
  }

  /**
   * Handle window focus - check connection and refresh state if needed
   */
  handleWindowFocus() {
    // Only proceed if we have session information and are supposed to be connected
    if (!this.currentSessionId || !this.currentPlayerName) {
      return;
    }

    // Check if socket is connected
    if (!this.isConnected || !this.socket) {
      console.log('🔄 Window focus detected but WebSocket disconnected, attempting reconnection...');
      // The socket will automatically reconnect, and our connect handler will detect it's a reconnection
      return;
    }

    // Check if we need to refresh the game state
    // This helps with cases where the connection is alive but we might have missed updates
    if (this.isConnected && this.currentSessionId && this.currentPlayerName) {
      console.log('🔄 Window focus detected, checking if state refresh is needed...');
      
      // Show reconnection status to user
      this.gameClient.uiManager.showReconnectionStatus('Refreshing game state...');
      
      // Request current game state to ensure we have the latest
      this.getCurrentGameState();
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean} Connection status
   */
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  /**
   * Get connection status
   * @returns {string} Connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Handle reconnection logic
   */
  handleReconnection() {
    if (this.currentSessionId && this.currentPlayerName) {
      console.log(`🔄 Rejoining session: ${this.currentSessionId} as ${this.currentPlayerName}`);
      
      // Show reconnection status to user
      this.gameClient.uiManager.showReconnectionStatus('Reconnecting to session...');
      
      // Set a timeout for reconnection
      const reconnectionTimeout = setTimeout(() => {
        console.log('⚠️ Reconnection timeout, removing reconnecting status');
        const statusBar = document.getElementById('connection-status');
        if (statusBar) {
          statusBar.classList.remove('reconnecting');
        }
        this.gameClient.uiManager.updateConnectionStatus('Reconnection failed', 'offline');
      }, 10000); // 10 second timeout
      
      // Store timeout reference for cleanup
      this.reconnectionTimeout = reconnectionTimeout;
      
      this.socket.emit(CLIENT_EVENTS.JOIN_SESSION, {
        sessionId: this.currentSessionId,
        playerName: this.currentPlayerName,
      });
    } else {
      console.error('Reconnection failed: No session ID or player name available.');
    }
  }

  /**
   * Set current session ID and player name for reconnection
   * @param {string} sessionId - The session ID
   * @param {string} playerName - The player name
   */
  setCurrentSessionAndPlayer(sessionId, playerName) {
    console.log(`📝 setCurrentSessionAndPlayer called with:`, { sessionId, playerName });
    this.currentSessionId = sessionId;
    this.currentPlayerName = playerName;
    console.log(`📝 Storing reconnection info - Session ID: ${sessionId}, Player Name: ${playerName}`);
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
    }
  }
}
