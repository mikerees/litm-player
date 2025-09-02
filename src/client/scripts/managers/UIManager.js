/**
 * UI Manager for LitMPlayer Game Client
 * Manages screen transitions and global UI elements
 */

import { ELEMENT_IDS, CSS_CLASSES } from '../utils/constants.js';
import { getElement, setText, addClass, removeClass, showElement, hideElement, setHTML, escapeHtml } from '../utils/helpers.js';

export class UIManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
  }

  /**
   * Show welcome screen
   */
  showWelcomeScreen() {
    addClass(ELEMENT_IDS.WELCOME_SCREEN, CSS_CLASSES.ACTIVE);
    removeClass(ELEMENT_IDS.GAME_SCREEN, CSS_CLASSES.ACTIVE);
    
    this.gameClient.currentSession = null;
    this.gameClient.currentPlayer = null;
    this.gameClient.gameState = null;
    this.gameClient.sessionJoinComplete = false; // Reset session join flag
  }

  /**
   * Show game screen
   */
  showGameScreen() {
    removeClass(ELEMENT_IDS.WELCOME_SCREEN, CSS_CLASSES.ACTIVE);
    addClass(ELEMENT_IDS.GAME_SCREEN, CSS_CLASSES.ACTIVE);
  }

  /**
   * Update connection status
   * @param {string} text - Status text
   * @param {string} status - Status type
   */
  updateConnectionStatus(text, status) {
    setText(ELEMENT_IDS.STATUS_TEXT, text);
    
    const indicator = getElement(ELEMENT_IDS.CONNECTION_INDICATOR);
    if (indicator) {
      indicator.className = `indicator ${status}`;
    }
  }

  /**
   * Show reconnection status
   * @param {string} message - Reconnection message
   */
  showReconnectionStatus(message) {
    // Show a temporary reconnection message
    this.showNotification(`🔄 ${message}`);
    
    // Update connection status to show reconnecting
    this.updateConnectionStatus(message, 'connecting');
    
    // Add reconnecting class to status bar for visual feedback
    const statusBar = getElement('connection-status');
    if (statusBar) {
      statusBar.classList.add('reconnecting');
    }
  }

  /**
   * Show loading overlay
   * @param {boolean} show - Whether to show loading
   */
  showLoading(show) {
    const overlay = getElement(ELEMENT_IDS.LOADING_OVERLAY);
    if (overlay) {
      if (show) {
        removeClass(ELEMENT_IDS.LOADING_OVERLAY, CSS_CLASSES.HIDDEN);
      } else {
        addClass(ELEMENT_IDS.LOADING_OVERLAY, CSS_CLASSES.HIDDEN);
      }
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {string} type - Error type
   */
  showError(message, type = 'error') {
    const errorContainer = getElement(ELEMENT_IDS.ERROR_CONTAINER);
    const errorText = getElement(ELEMENT_IDS.ERROR_TEXT);
    
    if (errorContainer && errorText) {
      setText(ELEMENT_IDS.ERROR_TEXT, message);
      removeClass(ELEMENT_IDS.ERROR_CONTAINER, CSS_CLASSES.HIDDEN);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.hideError();
      }, 5000);
    }
  }

  /**
   * Hide error message
   */
  hideError() {
    addClass(ELEMENT_IDS.ERROR_CONTAINER, CSS_CLASSES.HIDDEN);
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   */
  showNotification(message) {
    // Simple notification - could be enhanced with a proper notification system
    console.log('Notification:', message);
  }

  /**
   * Update session info display
   * @param {Object} session - Session data
   */
  updateSessionInfo(session) {
    if (!session) return;

    setText(ELEMENT_IDS.SESSION_NAME, session.name || 'Unknown');
    
    const playerCount = Array.isArray(session.players) 
      ? session.players.length 
      : session.players?.size || 0;
    setText(ELEMENT_IDS.PLAYER_COUNT, `Players: ${playerCount}`);
  }

  /**
   * Update players list
   * @param {Array} players - Array of player objects
   */
  updatePlayersList(players = []) {
    const playersList = getElement(ELEMENT_IDS.PLAYERS_LIST);
    if (!playersList) return;

    playersList.innerHTML = '';
    
    players.forEach(player => {
      const playerItem = document.createElement('div');
      playerItem.className = `player-item ${player.isGM ? 'gm' : ''}`;
      
      playerItem.innerHTML = `
        <div>
          <div class="player-name">${player.name}</div>
          <div class="player-status">${player.isGM ? 'Narrator' : 'Player'}</div>
        </div>
        <div class="player-indicator online"></div>
      `;
      
      playersList.appendChild(playerItem);
    });

    // Update narrator class on body for narrator-only elements
    this.updateNarratorClass();
  }

  /**
   * Update narrator class on body
   */
  updateNarratorClass() {
    const body = document.body;
    const currentPlayer = this.gameClient.sessionManager.getCurrentPlayer();
    
    if (currentPlayer && currentPlayer.isGM) {
      body.classList.add('narrator');
    } else {
      body.classList.remove('narrator');
    }
  }

  /**
   * Update chat messages
   * @param {Array} messages - Array of chat messages
   */
  updateChatMessages(messages = []) {
    const chatMessages = getElement(ELEMENT_IDS.CHAT_MESSAGES);
    if (!chatMessages) return;

    chatMessages.innerHTML = '';
    
    messages.forEach(message => {
      this.addChatMessage(message);
    });
  }

  /**
   * Add a chat message to the UI
   * @param {Object} message - Chat message object
   */
  addChatMessage(message) {
    const chatMessages = getElement(ELEMENT_IDS.CHAT_MESSAGES);
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    messageElement.innerHTML = `
      <div class="chat-author">${message.playerName}</div>
      <div class="chat-text">${escapeHtml(message.message)}</div>
      <div class="chat-timestamp">${timestamp}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

    /**
   * Update notes list
   * @param {Array} notes - Array of note objects
   */
  updateNotesList(notes = []) {
    const notesList = getElement(ELEMENT_IDS.NOTES_LIST);
    if (!notesList) return;

    notesList.innerHTML = '';
    
    notes.forEach(note => {
      this.addNote(note);
    });
  }

  /**
   * Add a note to the UI
   * @param {Object} note - Note object
   */
  addNote(note) {
    const notesList = getElement(ELEMENT_IDS.NOTES_LIST);
    if (!notesList) return;

    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    
    const timestamp = new Date(note.timestamp).toLocaleString();
    
    noteElement.innerHTML = `
      <div class="note-text">${escapeHtml(note.text)}</div>
      <div class="note-meta">
        <span>${note.author}</span>
        <span>${timestamp}</span>
      </div>
    `;
    
    notesList.appendChild(noteElement);
  }

  /**
   * Update dice results
   * @param {Array} diceRolls - Array of dice roll objects
   */
  updateDiceResults(diceRolls = []) {
    const diceResults = getElement(ELEMENT_IDS.DICE_RESULTS);
    if (!diceResults) return;

    diceResults.innerHTML = '';
    
    diceRolls.forEach(roll => {
      this.addDiceResult(roll);
    });
  }

  /**
   * Add a dice result to the UI
   * @param {Object} rollData - Dice roll data
   */
  addDiceResult(rollData) {
    const diceResults = getElement(ELEMENT_IDS.DICE_RESULTS);
    if (!diceResults) return;

    // Remove 'most-recent' class from any existing rolls
    const existingRolls = diceResults.querySelectorAll('.dice-result');
    existingRolls.forEach(roll => roll.classList.remove(CSS_CLASSES.MOST_RECENT));

    const resultElement = document.createElement('div');
    resultElement.className = `dice-result ${CSS_CLASSES.MOST_RECENT}`;
    
    const modifierText = rollData.modifier > 0 ? `+${rollData.modifier}` : 
                        rollData.modifier < 0 ? `${rollData.modifier}` : '';
    
    // Handle both old and new data structures
    const rolls = rollData.rolls || (rollData.result ? rollData.result.rolls : []);
    const total = rollData.total || (rollData.result ? rollData.result.total : 0);
    
    // Build tag description from selected tags if available
    let tagDescription = '';
    if (rollData.selectedTags && rollData.selectedTags.length > 0) {
      const tagDescriptions = rollData.selectedTags.map(tag => {
        if (tag.effect === 'burn') {
          return `${tag.tag} (BURNED)`;
        } else if (tag.effect === 'positive') {
          return `+${tag.tag}`;
        } else if (tag.effect === 'negative') {
          return `-${tag.tag}`;
        }
        return tag.tag;
      });
      tagDescription = tagDescriptions.join(' vs ');
    }
    
    resultElement.innerHTML = `
      <div class="dice-roll-header">
        <strong>${rollData.playerName}</strong> rolled ${rollData.dice || '2d6'}${modifierText} = 
        <strong class="dice-total recent">${total}</strong>
      </div>
      <div class="dice-roll-details">
        <small>Rolls: [${rolls.join(', ')}]</small>
        ${rollData.description ? `<br><small>${rollData.description}</small>` : ''}
        ${tagDescription ? `<br><small>${tagDescription}</small>` : ''}
      </div>
    `;
    
    // Prepend the new result at the top
    diceResults.insertBefore(resultElement, diceResults.firstChild);
    
    // Scroll to top to show the new result
    diceResults.scrollTop = 0;
  }

  /**
   * Update saved sessions display
   * @param {Array} sessions - Array of saved sessions
   */
  updateSavedSessionsDisplay(sessions = []) {
    const savedSessionsContainer = getElement('saved-sessions');
    if (!savedSessionsContainer) return;

    if (sessions.length === 0) {
      setHTML('saved-sessions', '<p style="color: #558b2f; font-style: italic;">No saved sessions found</p>');
      return;
    }

    const sessionsHTML = sessions.map(session => `
      <div class="saved-session-item" onclick="gameClient.selectSavedSession('${session.sessionId}')">
        <div class="session-info">
                     <h4>${escapeHtml(session.name)}</h4>
          <p>Session ID: ${session.sessionId}</p>
          <p>Players: ${session.playerCount}</p>
          <p>Last saved: ${new Date(session.lastSaved).toLocaleString()}</p>
        </div>
        <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); gameClient.loadSessionPlayers('${session.sessionId}')">
          Load Players
        </button>
      </div>
    `).join('');

    setHTML('saved-sessions', sessionsHTML);
  }

  /**
   * Update player autocomplete
   * @param {Array} players - Array of player names
   */
  updatePlayerAutocomplete(players = []) {
    const playerNameField = getElement('player-name');
    if (!playerNameField) return;

    // Create datalist for autocomplete
    let datalist = getElement('player-autocomplete');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'player-autocomplete';
      playerNameField.setAttribute('list', 'player-autocomplete');
      playerNameField.parentNode.appendChild(datalist);
    }

    // Clear existing options
    datalist.innerHTML = '';

    // Add player names as options
    players.forEach(playerName => {
      const option = document.createElement('option');
      option.value = playerName;
      datalist.appendChild(option);
    });
  }
}
