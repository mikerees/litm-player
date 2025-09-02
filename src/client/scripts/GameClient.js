/**
 * Main Game Client for LitMPlayer
 * Orchestrates all modular components and manages the overall game state
 */

// Import all managers and systems
import { WebSocketManager } from './managers/WebSocketManager.js';
import { UIManager } from './managers/UIManager.js';
import { ModalManager } from './managers/ModalManager.js';
import { SessionManager } from './managers/SessionManager.js';
import { ChatManager } from './managers/ChatManager.js';
import { DataManager } from './managers/DataManager.js';


import { TagSystem } from './systems/TagSystem.js';
import { DiceSystem } from './systems/DiceSystem.js';
import { CharacterManager } from './systems/CharacterManager.js';
import { SceneManager } from './systems/SceneManager.js';
import { ChallengeManager } from './systems/ChallengeManager.js';
import { FellowshipManager } from './systems/FellowshipManager.js';

// Import utilities
import { escapeHtml } from './utils/helpers.js';

export class GameClient {
  constructor() {
    // Core state
    this.currentSession = null;
    this.currentPlayer = null;
    this.gameState = null;
    this.sessionJoinComplete = false;

    // Initialize all managers and systems
    this.initializeComponents();

    // Wait for DOM to be loaded before setting up event listeners
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
      });
    } else {
      this.setupEventListeners();
    }

    // Initialize WebSocket connection
    this.webSocketManager.initializeSocket();
  }

  /**
   * Initialize all component managers and systems
   */
  initializeComponents() {
    // Initialize managers
    this.webSocketManager = new WebSocketManager(this);
    this.uiManager = new UIManager(this);
    this.modalManager = new ModalManager(this);
    this.sessionManager = new SessionManager(this);
    this.chatManager = new ChatManager(this);
    this.dataManager = new DataManager(this);


    // Initialize systems
    this.tagSystem = new TagSystem(this);
    this.diceSystem = new DiceSystem(this);
    this.characterManager = new CharacterManager(this);
    this.sceneManager = new SceneManager(this);
    this.challengeManager = new ChallengeManager(this);
    this.fellowshipManager = new FellowshipManager(this);
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    console.log('🎯 Setting up event listeners...');
    
    // Welcome screen events
    this.setupWelcomeScreenEvents();
    
    // Game screen events
    this.setupGameScreenEvents();
    
    // Global events
    this.setupGlobalEvents();
    
    console.log('✅ Event listeners setup complete');
  }

  /**
   * Setup welcome screen event listeners
   */
  setupWelcomeScreenEvents() {
    // Join session button
    const joinBtn = document.getElementById('join-session-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => this.sessionManager.handleJoinSession());
    }

    // Create session button
    const createBtn = document.getElementById('create-session-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.sessionManager.handleCreateSession());
    }

    // Enter key on session ID or player name
    const sessionIdInput = document.getElementById('session-id');
    const playerNameInput = document.getElementById('player-name');
    
    if (sessionIdInput) {
      sessionIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sessionManager.handleJoinSession();
        }
      });
    }
    
    if (playerNameInput) {
      playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sessionManager.handleJoinSession();
        }
      });
    }
  }

  /**
   * Setup game screen event listeners
   */
  setupGameScreenEvents() {
    console.log('🎯 Setting up game screen event listeners...');
    
    // Leave session button
    const leaveBtn = document.getElementById('leave-session-btn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => this.sessionManager.handleLeaveSession());
    }

    // Chat events
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatInput = document.getElementById('chat-input');
    
    if (sendChatBtn) {
      sendChatBtn.addEventListener('click', () => this.chatManager.handleSendChat());
    }
    
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.chatManager.handleSendChat();
        }
      });
    }



    // Dice roll button
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    if (rollDiceBtn) {
      rollDiceBtn.addEventListener('click', () => this.diceSystem.handleRollDice());
    }

    // Character creation button
    const createCharacterBtn = document.getElementById('create-character-btn');
    if (createCharacterBtn) {
      createCharacterBtn.addEventListener('click', () => this.characterManager.showCharacterCreation());
    }

    // Scene management button
    const manageScenesBtn = document.getElementById('manage-scenes-btn');
    if (manageScenesBtn) {
      manageScenesBtn.addEventListener('click', () => this.sceneManager.showSceneManagement());
    }

    // Present challenge button
    const presentChallengeBtn = document.getElementById('present-challenge-btn');
    console.log('🎯 Looking for present challenge button:', presentChallengeBtn);
    console.log('🎯 ChallengeManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.challengeManager)));
    if (presentChallengeBtn) {
      console.log('🎯 Setting up present challenge button event listener');
      presentChallengeBtn.addEventListener('click', (e) => {
        console.log('🎯 Present challenge button clicked!');
        e.preventDefault();
        this.challengeManager.showChallengePresentation();
      });
    } else {
      console.log('❌ Present challenge button not found');
      // List all buttons to debug
      const allButtons = document.querySelectorAll('button');
      console.log('🎯 All buttons found:', Array.from(allButtons).map(btn => ({ id: btn.id, text: btn.textContent })));
    }

    // Character form events
    const characterForm = document.getElementById('character-form');
    if (characterForm) {
      characterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.characterManager.handleSaveCharacter();
      });
    }

    // Character form dynamic buttons
    this.setupCharacterFormButtons();

    // Scene form events
    const sceneForm = document.getElementById('scene-form');
    if (sceneForm) {
      sceneForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sceneManager.handleSaveScene();
      });
    }

    // Challenge form events
    const challengeForm = document.getElementById('challenge-form');
    if (challengeForm) {
      challengeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.challengeManager.handleSaveChallenge();
      });
    }

    // Scene edit form events
    const sceneEditForm = document.getElementById('scene-edit-form');
    if (sceneEditForm) {
      sceneEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sceneManager.handleSaveSceneEdit();
      });
    }

    // Scene management modal events
    const closeSceneManagementBtn = document.getElementById('close-scene-management');
    if (closeSceneManagementBtn) {
      closeSceneManagementBtn.addEventListener('click', () => this.sceneManager.hideSceneManagement());
    }

    const createNewSceneBtn = document.getElementById('create-new-scene-btn');
    if (createNewSceneBtn) {
      createNewSceneBtn.addEventListener('click', () => this.sceneManager.showSceneCreation());
    }

    // Click outside modal to close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('scene-management-overlay')) {
        this.sceneManager.hideSceneManagement();
      }
    });

    // Click outside challenges dropdown to close
    document.addEventListener('click', (e) => {
      const dropdown = document.querySelector('.challenges-dropdown');
      const presentChallengeBtn = document.getElementById('present-challenge-btn');
      
      if (dropdown && dropdown.style.display !== 'none' && !dropdown.contains(e.target) && !presentChallengeBtn?.contains(e.target)) {
        this.challengeManager.hideChallengePresentation();
      }
    });
  }

  /**
   * Setup character form dynamic buttons
   */
  setupCharacterFormButtons() {
    // Promise circle selection
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('promise-circle')) {
        const circles = e.target.parentNode.querySelectorAll('.promise-circle');
        const selectedValue = parseInt(e.target.dataset.value);
        
        circles.forEach((circle, index) => {
          if (index < selectedValue) {
            circle.classList.add('selected');
          } else {
            circle.classList.remove('selected');
          }
        });
      }
    });

    // Add companion button
    const addCompanionBtn = document.getElementById('add-companion-btn');
    if (addCompanionBtn) {
      addCompanionBtn.addEventListener('click', () => {
        this.characterManager.addCompanionPair();
      });
    }

    // Add quintessence button
    const addQuintessenceBtn = document.getElementById('add-quintessence-btn');
    if (addQuintessenceBtn) {
      addQuintessenceBtn.addEventListener('click', () => {
        this.characterManager.addQuintessenceInput();
      });
    }

    // Add backpack item button
    const addBackpackBtn = document.getElementById('add-backpack-btn');
    if (addBackpackBtn) {
      addBackpackBtn.addEventListener('click', () => {
        this.characterManager.addBackpackInput();
      });
    }

    // Add status button
    const addStatusBtn = document.getElementById('add-status-btn');
    if (addStatusBtn) {
      addStatusBtn.addEventListener('click', () => {
        this.characterManager.addStatusInput();
      });
    }

    // Add theme card button
    const addThemeBtn = document.getElementById('add-theme-btn');
    if (addThemeBtn) {
      addThemeBtn.addEventListener('click', () => {
        this.characterManager.addThemeCard();
      });
    }

    // Cancel character button
    const cancelCharacterBtn = document.getElementById('cancel-character-btn');
    if (cancelCharacterBtn) {
      cancelCharacterBtn.addEventListener('click', () => {
        this.characterManager.hideCharacterCreation();
      });
    }
  }

  /**
   * Setup global event listeners
   */
  setupGlobalEvents() {
    // Error close button
    const errorCloseBtn = document.getElementById('error-close');
    if (errorCloseBtn) {
      errorCloseBtn.addEventListener('click', () => this.uiManager.hideError());
    }

    // Click outside context menus to hide them
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tag-context-menu')) {
        this.tagSystem.hideAllContextMenus();
      }
    });
  }

  /**
   * Update connection status
   * @param {string} text - Status text
   * @param {string} status - Status type
   */
  updateConnectionStatus(text, status) {
    this.uiManager.updateConnectionStatus(text, status);
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.uiManager.showError(message);
  }

  /**
   * Update the entire game UI based on current state
   */
  updateGameUI() {
    if (!this.gameState) return;

    // Update characters list
    const characters = this.gameState.gameObjects?.filter(obj => obj.type === 'character') || [];
    this.characterManager.updateCharactersList(characters);

    // Update fellowship
    const fellowship = this.gameState.gameObjects?.find(obj => obj.type === 'fellowship') || null;
    if (fellowship) {
        this.fellowshipManager.updateFellowship(fellowship.contents);
    }

    // Update current scene
    const currentScene = this.sceneManager.getCurrentScene();
    this.sceneManager.updateCurrentScene(currentScene);

    // Update active challenge
    const activeChallenge = this.challengeManager.getActiveChallenge();
    this.challengeManager.updateActiveChallenge(activeChallenge);

    // Update chat messages
    if (this.gameState.chat) {
      this.chatManager.updateChatMessages(this.gameState.chat);
    }

    // Update dice results
    if (this.gameState.diceRolls) {
      this.uiManager.updateDiceResults(this.gameState.diceRolls);
    }

    // Update players list
    this.sessionManager.updatePlayersList();
    
    // Update scene management modal if it's visible
    const sceneManagementOverlay = document.getElementById('scene-management-overlay');
    if (sceneManagementOverlay && !sceneManagementOverlay.classList.contains('hidden')) {
      this.sceneManager.populateSceneManagement();
    }
  }

  // WebSocket event handlers
  handleSessionJoined(data) {
    console.log('🎯 handleSessionJoined called with data:', data);
    // Store reconnection information for potential WebSocket reconnections
    if (data.sessionId && data.playerName) {
      this.webSocketManager.setCurrentSessionAndPlayer(data.sessionId, data.playerName);
    } else {
      console.warn('⚠️ handleSessionJoined: Missing sessionId or playerName:', { sessionId: data.sessionId, playerName: data.playerName });
    }
    
    this.sessionManager.handleSessionJoined(data);
  }

  handlePlayerJoined(data) {
    this.sessionManager.handlePlayerJoined(data);
  }

  handlePlayerLeft(data) {
    this.sessionManager.handlePlayerLeft(data);
  }

  handleSessionLeft() {
    // Clear reconnection information when leaving session
    this.webSocketManager.currentSessionId = null;
    this.webSocketManager.currentPlayerName = null;
    this.webSocketManager.wasConnected = false;
    console.log('📝 Cleared reconnection info - session left');
  }

  handlePlayerDisconnected(data) {
    this.sessionManager.handlePlayerDisconnected(data);
  }

  handleGameStateUpdate(data) {
    console.log('🔄 Game state update received:', data);
    this.gameState = data.gameState;
    this.updateGameUI();
  }

  handleCurrentGameState(data) {
    console.log('🔄 Current game state received (reconnection/refresh):', data);
    // This is a full state refresh after reconnection or manual refresh
    this.gameState = data.gameState;
    this.currentSession = data.session;
    this.currentPlayer = data.player;
    this.sessionJoinComplete = true;
    
    // Force a complete UI refresh
    this.updateGameUI();
    
    // Determine if this was a reconnection or manual refresh
    const wasReconnection = this.webSocketManager.reconnectionTimeout;
    
    if (wasReconnection) {
      // Show reconnection success message
      this.updateConnectionStatus('Reconnected', 'online');
      
      // Clear reconnection timeout
      clearTimeout(this.webSocketManager.reconnectionTimeout);
      this.webSocketManager.reconnectionTimeout = null;
      
      console.log('✅ Successfully reconnected and refreshed game state');
    } else {
      // Show refresh success message
      this.updateConnectionStatus('Game state refreshed', 'online');
      console.log('✅ Game state manually refreshed');
    }
    
    // Remove reconnecting class from status bar
    const statusBar = document.getElementById('connection-status');
    if (statusBar) {
      statusBar.classList.remove('reconnecting');
    }
  }

  handleChatMessage(data) {
    this.chatManager.handleChatMessage(data);
  }

  handleDiceRoll(data) {
    this.diceSystem.handleDiceRoll(data);
  }

  handleSavedSessions(data) {
    this.sessionManager.handleSavedSessions(data);
  }

  handleSessionPlayers(data) {
    this.sessionManager.handleSessionPlayers(data);
  }

  // Utility methods
  escapeHtml(text) {
    return escapeHtml(text);
  }

  // Global access methods for HTML onclick handlers
  selectSavedSession(sessionId) {
    this.sessionManager.selectSavedSession(sessionId);
  }

  loadSessionPlayers(sessionId) {
    this.sessionManager.loadSessionPlayers(sessionId);
  }

  /**
   * Manually refresh game state (useful for debugging or manual refresh)
   */
  refreshGameState() {
    console.log('🔄 Manual game state refresh requested');
    
    // Check if we have session information in WebSocketManager
    if (!this.webSocketManager.currentSessionId || !this.webSocketManager.currentPlayerName) {
      // Try to get session info from GameClient as fallback
      if (this.currentSession && this.currentPlayer) {
        console.log('🔄 Using GameClient session info as fallback');
        this.webSocketManager.setCurrentSessionAndPlayer(
          this.currentSession.id || this.currentSession.sessionId,
          this.currentPlayer.name
        );
      } else {
        console.log('⚠️ Cannot refresh: No active session');
        this.uiManager.showError('Cannot refresh: No active session. Please join a session first.');
        return;
      }
    }
    
    if (this.webSocketManager.isSocketConnected()) {
      // Show refreshing status
      this.uiManager.showReconnectionStatus('Refreshing game state...');
      
      // Request current game state
      this.webSocketManager.getCurrentGameState();
    } else {
      console.log('⚠️ Cannot refresh: WebSocket not connected');
      this.uiManager.showError('Cannot refresh: WebSocket not connected');
    }
  }
}

// Create global instance
window.gameClient = new GameClient();
