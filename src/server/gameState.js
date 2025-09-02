/**
 * Game State Manager for LitMPlayer
 * Manages game state, dice rolls, and Legend in the Mist specific mechanics
 */

class GameStateManager {
  constructor(gameObjectManager) {
    this.gameObjectManager = gameObjectManager;
    this.sessionStates = new Map(); // sessionId -> gameState
  }

  /**
   * Get or create game state for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object} Game state object
   */
  getSessionState(sessionId) {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, this.createInitialState());
    }
    const state = this.sessionStates.get(sessionId);
    
    // Ensure gameObjects is always populated with actual objects
    state.gameObjects = this.gameObjectManager.getSessionObjects(sessionId);
    
    return state;
  }

  /**
   * Create initial game state
   * @returns {Object} Initial game state
   */
  createInitialState() {
    return {
      currentScene: null,
      activeChallenge: null,
      chat: [],
      diceRolls: [],
      notes: [],
      lastRoll: null,
      gameObjects: []
    };
  }

  /**
   * Update game state
   * @param {string} sessionId - Session identifier
   * @param {Object} updates - Object with fields to update
   * @returns {Object} Updated game state
   */
  updateSessionState(sessionId, updates) {
    const state = this.getSessionState(sessionId);
    Object.assign(state, updates);
    return state;
  }

  /**
   * Add a chat message to the game state
   * @param {string} sessionId - Session identifier
   * @param {Object} message - Chat message object
   */
  addChatMessage(sessionId, message) {
    const state = this.getSessionState(sessionId);
    state.chat.push(message);
    
    // Keep only last 100 messages
    if (state.chat.length > 100) {
      state.chat = state.chat.slice(-100);
    }
  }

  /**
   * Add a dice roll to the game state
   * @param {string} sessionId - Session identifier
   * @param {Object} rollData - Dice roll data
   */
  addDiceRoll(sessionId, rollData) {
    console.log('🎲 addDiceRoll called with rollData:', rollData);
    
    const state = this.getSessionState(sessionId);
    state.diceRolls.push(rollData);
    state.lastRoll = rollData;
    
    console.log('🎲 Updated state - diceRolls count:', state.diceRolls.length, 'lastRoll:', state.lastRoll);
    
    // Keep only last 50 rolls
    if (state.diceRolls.length > 50) {
      state.diceRolls = state.diceRolls.slice(-50);
    }
  }

  /**
   * Add a note to the game state
   * @param {string} sessionId - Session identifier
   * @param {Object} note - Note object
   */
  addNote(sessionId, note) {
    const state = this.getSessionState(sessionId);
    state.notes.push(note);
    
    // Keep only last 50 notes
    if (state.notes.length > 50) {
      state.notes = state.notes.slice(-50);
    }
  }

  /**
   * Set the current scene
   * @param {string} sessionId - Session identifier
   * @param {string} sceneObjectId - Scene object ID
   */
  setCurrentScene(sessionId, sceneObjectId) {
    const state = this.getSessionState(sessionId);
    state.currentScene = sceneObjectId;
  }

  /**
   * Set the active challenge
   * @param {string} sessionId - Session identifier
   * @param {string} challengeObjectId - Challenge object ID
   */
  setActiveChallenge(sessionId, challengeObjectId) {
    const state = this.getSessionState(sessionId);
    state.activeChallenge = challengeObjectId;
  }

  /**
   * Get current scene object
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Current scene object or null
   */
  getCurrentScene(sessionId) {
    const state = this.getSessionState(sessionId);
    if (!state.currentScene) return null;
    
    return this.gameObjectManager.getGameObject(sessionId, state.currentScene);
  }

  /**
   * Get active challenge object
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Active challenge object or null
   */
  getActiveChallenge(sessionId) {
    const state = this.getSessionState(sessionId);
    if (!state.activeChallenge) return null;
    
    return this.gameObjectManager.getGameObject(sessionId, state.activeChallenge);
  }

  /**
   * Calculate dice roll modifier for Legend in the Mist (2d6 + modifier)
   * @param {string} sessionId - Session identifier
   * @param {Array} relevantObjectIds - Array of relevant object IDs
   * @returns {Object} Roll information with modifier and relevant tags
   */
  calculateRollModifier(sessionId, relevantObjectIds) {
    const modifier = this.gameObjectManager.calculateModifier(sessionId, relevantObjectIds);
    const relevantTags = this.gameObjectManager.getRelevantTags(sessionId, relevantObjectIds);
    
    return {
      modifier: modifier,
      relevantTags: relevantTags,
      rollType: '2d6',
      description: this.generateRollDescription(modifier, relevantTags)
    };
  }

  /**
   * Generate a description of the roll and its modifiers
   * @param {number} modifier - Total modifier
   * @param {Object} relevantTags - Relevant tags information
   * @returns {string} Human-readable description
   */
  generateRollDescription(modifier, relevantTags) {
    let description = `2d6`;
    
    if (modifier !== 0) {
      description += modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
    }
    
    const tagCounts = {};
    for (const tagType in relevantTags) {
      if (relevantTags[tagType].length > 0) {
        tagCounts[tagType] = relevantTags[tagType].length;
      }
    }
    
    if (Object.keys(tagCounts).length > 0) {
      description += ` (from ${Object.keys(tagCounts).length} tag categories)`;
    }
    
    return description;
  }

  /**
   * Validate a game action
   * @param {string} sessionId - Session identifier
   * @param {Object} action - Action object
   * @returns {boolean} True if action is valid
   */
  validateAction(sessionId, action) {
    switch (action.type) {
      case 'create_object':
        return this.validateCreateObject(action);
      case 'update_object':
        return this.validateUpdateObject(sessionId, action);
      case 'delete_object':
        return this.validateDeleteObject(sessionId, action);
      case 'add_tag':
        return this.validateAddTag(sessionId, action);
      case 'remove_tag':
        return this.validateRemoveTag(sessionId, action);
      case 'roll_dice':
        return this.validateDiceRoll(action);
      case 'set_scene':
        return this.validateSetScene(sessionId, action);
      case 'set_challenge':
        return this.validateSetChallenge(sessionId, action);
      case 'set_active_challenge':
        return this.validateSetActiveChallenge(sessionId, action);
      case 'clear_active_challenge':
        return this.validateClearActiveChallenge(sessionId, action);
      case 'overcome_challenge':
        return this.validateOvercomeChallenge(sessionId, action);
      case 'toggle_overcome_challenge':
        return this.validateToggleOvercomeChallenge(sessionId, action);
      case 'add_note':
        return this.validateAddNote(action);
      default:
        return false;
    }
  }

  /**
   * Apply a game action to the state
   * @param {string} sessionId - Session identifier
   * @param {Object} action - Action object
   * @returns {Object} Updated game state
   */
  applyAction(sessionId, action) {
    switch (action.type) {
      case 'create_object':
        return this.applyCreateObject(sessionId, action);
      case 'update_object':
        return this.applyUpdateObject(sessionId, action);
      case 'delete_object':
        return this.applyDeleteObject(sessionId, action);
      case 'add_tag':
        return this.applyAddTag(sessionId, action);
      case 'remove_tag':
        return this.applyRemoveTag(sessionId, action);
      case 'roll_dice':
        return this.applyDiceRoll(sessionId, action);
      case 'set_scene':
        return this.applySetScene(sessionId, action);
      case 'set_challenge':
        return this.applySetChallenge(sessionId, action);
      case 'set_active_challenge':
        return this.applySetActiveChallenge(sessionId, action);
      case 'clear_active_challenge':
        return this.applyClearActiveChallenge(sessionId, action);
      case 'overcome_challenge':
        return this.applyOvercomeChallenge(sessionId, action);
      case 'toggle_overcome_challenge':
        return this.applyToggleOvercomeChallenge(sessionId, action);
      case 'add_note':
        return this.applyAddNote(sessionId, action);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Validation methods
  validateCreateObject(action) {
    return action.objectType && action.contents && typeof action.contents === 'object';
  }

  validateUpdateObject(sessionId, action) {
    return action.objectId && this.gameObjectManager.getGameObject(sessionId, action.objectId);
  }

  validateDeleteObject(sessionId, action) {
    return action.objectId && this.gameObjectManager.getGameObject(sessionId, action.objectId);
  }

  validateAddTag(sessionId, action) {
    return action.objectId && 
           action.tagType && 
           action.tagName && 
           (action.modifier === 1 || action.modifier === -1) &&
           this.gameObjectManager.getGameObject(sessionId, action.objectId);
  }

  validateRemoveTag(sessionId, action) {
    return action.objectId && 
           action.tagType && 
           action.tagName &&
           this.gameObjectManager.getGameObject(sessionId, action.objectId);
  }

  validateDiceRoll(action) {
    return action.relevantObjectIds && Array.isArray(action.relevantObjectIds);
  }

  validateSetScene(sessionId, action) {
    return !action.sceneObjectId || this.gameObjectManager.getGameObject(sessionId, action.sceneObjectId);
  }

  validateSetChallenge(sessionId, action) {
    return !action.challengeObjectId || this.gameObjectManager.getGameObject(sessionId, action.challengeObjectId);
  }

  validateSetActiveChallenge(sessionId, action) {
    return action.challengeId && action.sceneId && 
           this.gameObjectManager.getGameObject(sessionId, action.sceneId);
  }

  validateClearActiveChallenge(sessionId, action) {
    return true; // No validation needed for clearing
  }

  validateOvercomeChallenge(sessionId, action) {
    return action.challengeId && action.sceneId && 
           this.gameObjectManager.getGameObject(sessionId, action.sceneId);
  }

  validateToggleOvercomeChallenge(sessionId, action) {
    return action.challengeId && action.sceneId && 
           this.gameObjectManager.getGameObject(sessionId, action.sceneId);
  }

  validateAddNote(action) {
    return action.text && typeof action.text === 'string' && action.text.trim().length > 0;
  }

  // Application methods
  applyCreateObject(sessionId, action) {
    const gameObject = this.gameObjectManager.createGameObject(
      sessionId,
      action.objectType,
      action.contents,
      action.tags || {},
      action.createdBy
    );
    
    // Update the game state's gameObjects array
    const state = this.getSessionState(sessionId);
    state.gameObjects = this.gameObjectManager.getSessionObjects(sessionId);
    
    return state;
  }

  applyUpdateObject(sessionId, action) {
    // Create updates object from action data
    const updates = {
      contents: action.contents,
      tags: action.tags
    };
    
    this.gameObjectManager.updateGameObject(
      sessionId,
      action.objectId,
      updates,
      action.lastModifiedBy
    );
    
    // Update the game state's gameObjects array
    const state = this.getSessionState(sessionId);
    state.gameObjects = this.gameObjectManager.getSessionObjects(sessionId);
    
    return state;
  }

  applyDeleteObject(sessionId, action) {
    this.gameObjectManager.deleteGameObject(sessionId, action.objectId);
    
    // Update game state if deleted object was current scene or challenge
    const state = this.getSessionState(sessionId);
    if (state.currentScene === action.objectId) {
      state.currentScene = null;
    }
    if (state.activeChallenge === action.objectId) {
      state.activeChallenge = null;
    }
    
    // Update the game state's gameObjects array
    state.gameObjects = this.gameObjectManager.getSessionObjects(sessionId);
    
    return state;
  }

  applyAddTag(sessionId, action) {
    this.gameObjectManager.addTag(
      sessionId,
      action.objectId,
      action.tagType,
      action.tagName,
      action.modifier,
      action.addedBy
    );
    
    return this.getSessionState(sessionId);
  }

  applyRemoveTag(sessionId, action) {
    this.gameObjectManager.removeTag(
      sessionId,
      action.objectId,
      action.tagType,
      action.tagName,
      action.removedBy
    );
    
    return this.getSessionState(sessionId);
  }

  applyDiceRoll(sessionId, action) {
    console.log('🎲 applyDiceRoll called with action:', action);
    
    // Use the modifier provided by the client
    const modifier = action.modifier || 0;
    const selectedTags = action.selectedTags || [];
    
    console.log('🎲 Dice roll parameters - modifier:', modifier, 'selectedTags:', selectedTags);
    
    // Generate the actual dice roll (2d6)
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const total = roll1 + roll2 + modifier;
    
    console.log('🎲 Dice roll results - roll1:', roll1, 'roll2:', roll2, 'total:', total);
    
    // Create description from selected tags
    const positiveTags = selectedTags.filter(t => t.effect === 'positive').map(t => t.tag);
    const negativeTags = selectedTags.filter(t => t.effect === 'negative').map(t => t.tag);
    
    let description = '2d6';
    if (modifier > 0) {
      description += `+${modifier}`;
    } else if (modifier < 0) {
      description += `${modifier}`;
    }
    
    if (positiveTags.length > 0 || negativeTags.length > 0) {
      description += ` (${positiveTags.join(', ')}${negativeTags.length > 0 ? ' vs ' + negativeTags.join(', ') : ''})`;
    }
    
    const rollData = {
      id: Date.now().toString(),
      playerId: action.playerId,
      playerName: action.playerName,
      rolls: [roll1, roll2],
      modifier: modifier,
      total: total,
      relevantObjectIds: action.relevantObjectIds,
      selectedTags: selectedTags,
      description: description,
      timestamp: new Date().toISOString()
    };
    
    console.log('🎲 Created roll data:', rollData);
    
    this.addDiceRoll(sessionId, rollData);
    
    const sessionState = this.getSessionState(sessionId);
    console.log('🎲 Updated session state, lastRoll:', sessionState.lastRoll);
    
    return sessionState;
  }

  applySetScene(sessionId, action) {
    this.setCurrentScene(sessionId, action.sceneObjectId);
    return this.getSessionState(sessionId);
  }

  applySetChallenge(sessionId, action) {
    this.setActiveChallenge(sessionId, action.challengeObjectId);
    return this.getSessionState(sessionId);
  }

  applySetActiveChallenge(sessionId, action) {
    // Find the challenge in the scene and set it as active
    const scene = this.gameObjectManager.getGameObject(sessionId, action.sceneId);
    if (scene && scene.contents.challenges) {
      const challenge = scene.contents.challenges.find(c => c.id === action.challengeId);
      if (challenge) {
        this.setActiveChallenge(sessionId, challenge.id);
      }
    }
    return this.getSessionState(sessionId);
  }

  applyClearActiveChallenge(sessionId, action) {
    this.setActiveChallenge(sessionId, null);
    return this.getSessionState(sessionId);
  }

  applyOvercomeChallenge(sessionId, action) {
    // Mark challenge as overcome in the scene
    const scene = this.gameObjectManager.getGameObject(sessionId, action.sceneId);
    if (scene && scene.contents.challenges) {
      const challenge = scene.contents.challenges.find(c => c.id === action.challengeId);
      if (challenge) {
        challenge.overcome = true;
        challenge.overcomeAt = new Date().toISOString();
        
        // If this was the active challenge, clear it
        const state = this.getSessionState(sessionId);
        if (state.activeChallenge === challenge.id) {
          this.setActiveChallenge(sessionId, null);
        }
      }
    }
    return this.getSessionState(sessionId);
  }

  applyToggleOvercomeChallenge(sessionId, action) {
    // Toggle challenge overcome status in the scene
    const scene = this.gameObjectManager.getGameObject(sessionId, action.sceneId);
    if (scene && scene.contents.challenges) {
      const challenge = scene.contents.challenges.find(c => c.id === action.challengeId);
      if (challenge) {
        challenge.overcome = !challenge.overcome;
        
        if (challenge.overcome) {
          challenge.overcomeAt = new Date().toISOString();
          
          // If this was the active challenge, clear it
          const state = this.getSessionState(sessionId);
          if (state.activeChallenge === challenge.id) {
            this.setActiveChallenge(sessionId, null);
          }
        } else {
          // Reset overcome timestamp when toggling back to not overcome
          challenge.overcomeAt = null;
        }
      }
    }
    return this.getSessionState(sessionId);
  }

  applyAddNote(sessionId, action) {
    const note = {
      id: Date.now().toString(),
      text: action.text.trim(),
      author: action.author,
      timestamp: new Date().toISOString()
    };
    
    this.addNote(sessionId, note);
    return this.getSessionState(sessionId);
  }

  /**
   * Clean up game state for a session
   * @param {string} sessionId - Session identifier
   */
  cleanupSession(sessionId) {
    this.sessionStates.delete(sessionId);
    this.gameObjectManager.cleanupSession(sessionId);
    console.log(`🧹 Cleaned up game state for session ${sessionId}`);
  }

  /**
   * Get session data for API endpoints
   * @param {string} sessionId - Session identifier
   * @returns {Object} Session data
   */
  getSessionData(sessionId) {
    const state = this.getSessionState(sessionId);
    // Ensure gameObjects is populated with actual objects
    const gameObjects = this.gameObjectManager.getSessionObjects(sessionId);
    return {
      sessionId,
      currentScene: state.currentScene,
      activeChallenge: state.activeChallenge,
      chat: state.chat,
      diceRolls: state.diceRolls,
      notes: state.notes,
      lastRoll: state.lastRoll,
      gameObjects: gameObjects
    };
  }

  /**
   * Debug: Log current game objects count
   * @param {string} sessionId - Session identifier
   */
  debugGameObjects(sessionId) {
    const state = this.getSessionState(sessionId);
    const gameObjects = this.gameObjectManager.getSessionObjects(sessionId);
    console.log(`🔍 Session ${sessionId} - Game state objects: ${state.gameObjects.length}, Manager objects: ${gameObjects.length}`);
    if (gameObjects.length > 0) {
      gameObjects.forEach(obj => {
        const name = obj.contents.characterName || obj.contents.name || obj.contents.title || obj.id;
        console.log(`  - ${obj.type}: ${name}`);
      });
    }
  }

  /**
   * Restore session state from saved data
   * @param {string} sessionId - Session identifier
   * @param {Object} savedState - Saved game state
   */
  restoreSessionState(sessionId, savedState) {
    if (!savedState) return;

    const state = this.getSessionState(sessionId);
    
    // Restore all state properties
    Object.assign(state, {
      currentScene: savedState.currentScene || null,
      activeChallenge: savedState.activeChallenge || null,
      chat: savedState.chat || [],
      diceRolls: savedState.diceRolls || [],
      notes: savedState.notes || [],
      lastRoll: savedState.lastRoll || null,
      gameObjects: savedState.gameObjects || []
    });

    // Restore game objects to the game object manager
    if (savedState.gameObjects && Array.isArray(savedState.gameObjects)) {
      savedState.gameObjects.forEach(gameObject => {
        this.gameObjectManager.restoreGameObject(sessionId, gameObject);
      });
    }

    console.log(`📂 Restored game state for session ${sessionId}`);
  }
}

module.exports = GameStateManager;
