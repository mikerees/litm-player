/**
 * WebSocket Handler for LitMPlayer
 * Manages real-time communication between clients and server
 */

class WebSocketHandler {
  constructor(io, sessionManager, gameStateManager) {
    this.io = io;
    this.sessionManager = sessionManager;
    this.gameStateManager = gameStateManager;
    this.socketSessions = new Map(); // socket.id -> sessionId
    
    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.io event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New connection: ${socket.id}`);
      
      // Send connection confirmation
      socket.emit('connected', { 
        message: 'Connected to LitMPlayer server',
        timestamp: new Date().toISOString()
      });

      // Handle join session
      socket.on('join-session', async (data) => {
        await this.handleJoinSession(socket, data);
      });

      // Handle leave session
      socket.on('leave-session', (data) => {
        this.handleLeaveSession(socket, data);
      });

      // Handle chat messages
      socket.on('chat-message', (data) => {
        this.handleChatMessage(socket, data);
      });

      // Handle game actions
      socket.on('game-action', async (data) => {
        await this.handleGameAction(socket, data);
      });

      // Handle dice rolls
      socket.on('roll-dice', async (data) => {
        await this.handleDiceRoll(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle get saved sessions
      socket.on('get-saved-sessions', async () => {
        await this.handleGetSavedSessions(socket);
      });

      // Handle get session players
      socket.on('get-session-players', async (data) => {
        await this.handleGetSessionPlayers(socket, data);
      });

      // Handle get current game state (for reconnection scenarios)
      socket.on('get-current-game-state', async (data) => {
        await this.handleGetCurrentGameState(socket, data);
      });
    });
  }

  /**
   * Handle joining a session
   */
  async handleJoinSession(socket, data) {
    try {
      const { sessionId, playerName, isGM = false } = data;

      if (!sessionId || !playerName) {
        socket.emit('error', { message: 'Session ID and player name are required' });
        return;
      }

      // Get or create session (loads existing if available)
      const { session, gameState } = await this.sessionManager.getOrCreateSession(sessionId, {
        name: `Session ${sessionId}`,
        autoSave: true
      });

      // Clean up any disconnected players before adding the new one
      const activeSocketIds = new Set(Array.from(this.socketSessions.keys()));
      this.sessionManager.cleanupDisconnectedPlayers(sessionId, activeSocketIds);

      // Create player object
      const player = {
        id: socket.id,
        name: playerName,
        isGM: isGM,
        joinedAt: new Date().toISOString()
      };

      // Debug: Log current players before adding
      console.log(`🔍 Before adding ${playerName}: ${session.players.size} players in session`);
      session.players.forEach((p, id) => {
        console.log(`  - ${p.name} (${id}) - GM: ${p.isGM}`);
      });

      // Add player to session
      this.sessionManager.addPlayerToSession(sessionId, player);

      // Debug: Log current players after adding
      console.log(`🔍 After adding ${playerName}: ${session.players.size} players in session`);
      session.players.forEach((p, id) => {
        console.log(`  - ${p.name} (${id}) - GM: ${p.isGM}`);
      });

      // Join socket room
      socket.join(sessionId);
      this.socketSessions.set(socket.id, sessionId);
      console.log(`🔗 Socket ${socket.id} mapped to session ${sessionId}`);

      // If we loaded existing game state, restore it to the GameStateManager
      if (gameState) {
        console.log(`🔄 Restoring game state for session ${sessionId}:`, {
          gameObjectsCount: gameState.gameObjects?.length || 0,
          currentScene: gameState.currentScene,
          activeChallenge: gameState.activeChallenge
        });
        this.gameStateManager.restoreSessionState(sessionId, gameState);
      }

      // Get current game state (either restored or empty)
      const currentGameState = this.gameStateManager.getSessionState(sessionId);
      console.log(`📊 Current game state for session ${sessionId}:`, {
        gameObjectsCount: currentGameState?.gameObjects?.length || 0,
        currentScene: currentGameState?.currentScene,
        activeChallenge: currentGameState?.activeChallenge
      });

      // Send session joined confirmation
      socket.emit('session-joined', {
        session: this.convertSessionForClient(session),
        player: player,
        gameState: currentGameState
      });

      // Notify other players
      socket.to(sessionId).emit('player-joined', {
        player: player,
        session: this.convertSessionForClient(session)
      });

      // Update session activity
      this.sessionManager.updateSessionActivity(sessionId);

      console.log(`👤 ${playerName} joined session ${sessionId}`);
      console.log(`📊 Current socket sessions:`, Array.from(this.socketSessions.entries()));

    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Convert session to client-safe format (Map to Array)
   * @param {Object} session - Server session object
   * @returns {Object} Client-safe session object
   */
  convertSessionForClient(session) {
    return {
      ...session,
      players: Array.from(session.players.values())
    };
  }

  /**
   * Handle leaving a session
   */
  handleLeaveSession(socket, data) {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    // Save session data before leaving
    this.saveSessionData(sessionId);

    // Remove player from session
    const player = this.sessionManager.removePlayerFromSession(sessionId, socket.id);
    
    // Leave socket room
    socket.leave(sessionId);
    this.socketSessions.delete(socket.id);

    if (player) {
      // Send confirmation to the leaving player
      socket.emit('session-left', {
        playerName: player.name,
        sessionId: sessionId
      });

      // Notify other players
      socket.to(sessionId).emit('player-left', {
        playerName: player.name,
        playerId: player.id,
        session: this.convertSessionForClient(this.sessionManager.getSession(sessionId))
      });

      console.log(`👋 ${player.name} left session ${sessionId}`);
    }
  }

  /**
   * Handle chat messages
   */
  handleChatMessage(socket, data) {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    const { message } = data;
    if (!message || typeof message !== 'string') return;

    const playerName = this.sessionManager.getPlayerName(sessionId, socket.id);
    if (!playerName) return;

    const chatMessage = {
      id: Date.now().toString(),
      playerName: playerName,
      message: message,
      timestamp: new Date().toISOString()
    };

    // Add to game state
    this.gameStateManager.addChatMessage(sessionId, chatMessage);

    // Broadcast to all players in session
    this.io.to(sessionId).emit('chat-message', chatMessage);

    // Update session activity
    this.sessionManager.updateSessionActivity(sessionId);
  }

  /**
   * Handle game actions
   */
  async handleGameAction(socket, data) {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    try {
      // Validate the action first
      const isValid = this.gameStateManager.validateAction(sessionId, data);
      if (!isValid) {
        socket.emit('error', { message: 'Invalid game action' });
        return;
      }

      // Debug: Log before action
      if (data.type === 'create_object' && data.objectType === 'character') {
        console.log(`🎭 Creating character: ${data.contents.characterName} for player: ${data.contents.playerName}`);
        this.gameStateManager.debugGameObjects(sessionId);
      }
      
      if (data.type === 'create_object' && data.objectType === 'scene') {
        console.log(`🎬 Creating scene: ${data.contents.name} with description: ${data.contents.description}`);
        this.gameStateManager.debugGameObjects(sessionId);
      }
      
      if (data.type === 'create_object' && data.objectType === 'fellowship') {
        console.log(`🤝 Creating fellowship with theme cards:`, data.contents);
        this.gameStateManager.debugGameObjects(sessionId);
      }
      
      if (data.type === 'update_object' && data.objectType === 'fellowship') {
        console.log(`🤝 Updating fellowship with theme cards:`, data.contents);
        this.gameStateManager.debugGameObjects(sessionId);
      }

      // Apply action to game state
      const updatedGameState = this.gameStateManager.applyAction(sessionId, data);
      
      // Debug: Log after action
      if (data.type === 'create_object' && data.objectType === 'character') {
        console.log(`✅ Character created successfully`);
        this.gameStateManager.debugGameObjects(sessionId);
      }
      
      if (data.type === 'create_object' && data.objectType === 'scene') {
        console.log(`✅ Scene created successfully`);
        this.gameStateManager.debugGameObjects(sessionId);
      }
      
      if (data.type === 'create_object' && data.objectType === 'fellowship') {
        console.log(`✅ Fellowship created successfully`);
        this.gameStateManager.debugGameObjects(sessionId);
      }
      
      if (data.type === 'update_object' && data.objectType === 'fellowship') {
        console.log(`✅ Fellowship updated successfully`);
        this.gameStateManager.debugGameObjects(sessionId);
      }
      
      // Broadcast updated game state
      this.io.to(sessionId).emit('game-state-updated', { gameState: updatedGameState });
      
      // Save session data
      this.saveSessionData(sessionId);
      
      // Update session activity
      this.sessionManager.updateSessionActivity(sessionId);
      
    } catch (error) {
      console.error('Error handling game action:', error);
      socket.emit('error', { message: 'Failed to process game action' });
    }
  }

  /**
   * Handle dice rolls
   */
  async handleDiceRoll(socket, data) {
    console.log(`🎲 Dice roll request from socket ${socket.id}`);
    console.log(`📊 Current socket sessions:`, Array.from(this.socketSessions.entries()));
    
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) {
      console.log('❌ No session ID found for socket', socket.id);
      console.log('🔍 Available socket sessions:', Array.from(this.socketSessions.keys()));
      return;
    }

    console.log('🎲 Server received dice roll request:', data);

    try {
      const { relevantObjectIds = [], selectedTags = [], modifier = 0 } = data;
      
      if (!Array.isArray(relevantObjectIds)) {
        console.log('❌ Invalid relevant object IDs:', relevantObjectIds);
        socket.emit('error', { message: 'Invalid relevant object IDs' });
        return;
      }

      // Create roll action with selected tags information
      const rollAction = {
        type: 'roll_dice',
        relevantObjectIds: relevantObjectIds,
        selectedTags: selectedTags,
        modifier: modifier,
        playerId: socket.id,
        playerName: this.sessionManager.getPlayerName(sessionId, socket.id)
      };

      console.log('🎲 Created roll action:', rollAction);

      // Validate the action
      const isValid = this.gameStateManager.validateAction(sessionId, rollAction);
      if (!isValid) {
        console.log('❌ Invalid dice roll action');
        socket.emit('error', { message: 'Invalid dice roll action' });
        return;
      }

      console.log('✅ Dice roll action validated');

      // Apply the dice roll
      const updatedGameState = this.gameStateManager.applyDiceRoll(sessionId, rollAction);
      
      console.log('✅ Dice roll applied, updated game state:', updatedGameState);
      
      // Get the last roll from the updated game state
      const lastRoll = updatedGameState.lastRoll;
      
      console.log('🎲 Last roll result:', lastRoll);
      
      // Broadcast dice roll result
      this.io.to(sessionId).emit('dice-rolled', lastRoll);
      console.log('📤 Broadcasted dice roll result to session', sessionId);
      
      // Broadcast updated game state
      this.io.to(sessionId).emit('game-state-updated', { gameState: updatedGameState });
      console.log('📤 Broadcasted updated game state to session', sessionId);
      
      // Save session data
      this.saveSessionData(sessionId);
      
      // Update session activity
      this.sessionManager.updateSessionActivity(sessionId);
      
      console.log('✅ Dice roll processing complete');
      
    } catch (error) {
      console.error('❌ Error handling dice roll:', error);
      socket.emit('error', { message: 'Failed to process dice roll' });
    }
  }

  /**
   * Handle get saved sessions
   */
  async handleGetSavedSessions(socket) {
    try {
      const sessions = await this.sessionManager.getSavedSessions();
      socket.emit('saved-sessions', { sessions });
    } catch (error) {
      console.error('Error getting saved sessions:', error);
      socket.emit('error', { message: 'Failed to get saved sessions' });
    }
  }

  /**
   * Handle get session players
   */
  async handleGetSessionPlayers(socket, data) {
    try {
      const { sessionId } = data;
      if (!sessionId) {
        socket.emit('error', { message: 'Session ID is required' });
        return;
      }

      const players = await this.sessionManager.getSessionPlayers(sessionId);
      socket.emit('session-players', { sessionId, players });
    } catch (error) {
      console.error('Error getting session players:', error);
      socket.emit('error', { message: 'Failed to get session players' });
    }
  }

  /**
   * Handle get current game state (for reconnection scenarios)
   */
  async handleGetCurrentGameState(socket, data) {
    try {
      console.log('🔄 handleGetCurrentGameState called with data:', data);
      const { sessionId, playerName } = data;
      
      if (!sessionId || !playerName) {
        console.log('❌ Validation failed:', { sessionId, playerName });
        socket.emit('error', { message: 'Session ID and player name are required' });
        return;
      }

      console.log(`🔄 Reconnection request for session ${sessionId}, player ${playerName}`);

      // Get current session and game state
      const session = this.sessionManager.getSession(sessionId);
      if (!session) {
        console.log(`❌ Session not found for ID: ${sessionId}`);
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      console.log(`✅ Session found:`, {
        sessionId: session.id,
        playersCount: session.players.size,
        players: Array.from(session.players.values()).map(p => ({ id: p.id, name: p.name }))
      });

      const gameState = this.gameStateManager.getSessionState(sessionId);
      if (!gameState) {
        console.log(`❌ Game state not found for session: ${sessionId}`);
        socket.emit('error', { message: 'Game state not found' });
        return;
      }

      console.log(`✅ Game state found:`, {
        gameObjectsCount: gameState.gameObjects?.length || 0,
        currentScene: gameState.currentScene,
        activeChallenge: gameState.activeChallenge
      });

      // Check if player is already in the session
      const playersArray = Array.from(session.players.values());
      console.log(`🔍 Looking for player "${playerName}" in players:`, playersArray.map(p => ({ id: p.id, name: p.name })));
      
      const existingPlayer = playersArray.find(p => p.name === playerName);
      if (!existingPlayer) {
        console.log(`➕ Player "${playerName}" not found, adding to session`);
        // Add player to session if they don't exist
        const player = {
          id: socket.id,
          name: playerName,
          isGM: false, // Default to non-GM for reconnections
          joinedAt: new Date().toISOString()
        };
        
        this.sessionManager.addPlayerToSession(sessionId, player);
        this.socketSessions.set(socket.id, sessionId);
        
        console.log(`✅ Player ${playerName} reconnected to session ${sessionId}`);
      } else {
        console.log(`🔄 Player "${playerName}" found, updating socket ID from ${existingPlayer.id} to ${socket.id}`);
        // Update existing player's socket ID
        existingPlayer.id = socket.id;
        this.socketSessions.set(socket.id, sessionId);
        console.log(`✅ Existing player ${playerName} reconnected to session ${sessionId}`);
      }

      // Send current game state
      const finalPlayer = existingPlayer || playersArray.find(p => p.name === playerName);
      console.log(`📤 Sending current-game-state to socket ${socket.id}:`, {
        sessionId: session.id,
        player: finalPlayer ? { id: finalPlayer.id, name: finalPlayer.name } : 'NOT FOUND',
        gameStateObjects: gameState.gameObjects?.length || 0
      });
      
      socket.emit('current-game-state', {
        session: this.convertSessionForClient(session),
        player: finalPlayer,
        gameState: gameState
      });

      // Notify other players about reconnection
      socket.to(sessionId).emit('player-joined', {
        playerName: playerName,
        playerId: socket.id,
        session: this.convertSessionForClient(session)
      });

    } catch (error) {
      console.error('Error handling reconnection:', error);
      socket.emit('error', { message: 'Failed to reconnect to session' });
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(socket) {
    const sessionId = this.socketSessions.get(socket.id);
    if (sessionId) {
      // Save session data before disconnecting
      this.saveSessionData(sessionId);

      // Remove player from session
      const player = this.sessionManager.removePlayerFromSession(sessionId, socket.id);
      
      // Notify other players
      if (player) {
        socket.to(sessionId).emit('player-disconnected', {
          playerName: player.name,
          playerId: player.id,
          session: this.convertSessionForClient(this.sessionManager.getSession(sessionId))
        });
      }

      this.socketSessions.delete(socket.id);
      console.log(`🔌 ${socket.id} disconnected from session ${sessionId}`);
    }
  }

  /**
   * Save session data
   */
  async saveSessionData(sessionId) {
    try {
      const session = this.sessionManager.getSession(sessionId);
      const gameState = this.gameStateManager.getSessionState(sessionId);
      
      console.log(`💾 Saving session data for ${sessionId}:`, {
        sessionExists: !!session,
        autoSave: session?.settings?.autoSave,
        gameObjectsCount: gameState?.gameObjects?.length || 0,
        scenes: gameState?.gameObjects?.filter(obj => obj.type === 'scene').map(s => ({ id: s.id, name: s.contents.name })) || []
      });
      
      if (session && session.settings.autoSave) {
        await this.sessionManager.saveSession(sessionId, gameState);
        console.log(`✅ Session data saved for ${sessionId}`);
      } else {
        console.log(`⚠️ Session data not saved for ${sessionId} (no session or autoSave disabled)`);
      }
    } catch (error) {
      console.error(`Error saving session data for ${sessionId}:`, error);
    }
  }

  /**
   * Get session ID from socket
   */
  getSessionIdFromSocket(socket) {
    return this.socketSessions.get(socket.id);
  }

  /**
   * Broadcast to all players in a session
   */
  broadcastToSession(sessionId, event, data) {
    this.io.to(sessionId).emit(event, data);
  }

  /**
   * Send to specific player
   */
  sendToPlayer(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }
}

module.exports = WebSocketHandler;
