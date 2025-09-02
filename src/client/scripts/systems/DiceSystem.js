/**
 * Dice System for LitMPlayer Game Client
 * Handles dice rolling mechanics and calculations
 */

import { calculateDiceRoll } from '../utils/helpers.js';

export class DiceSystem {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.isRolling = false; // Flag to prevent multiple rapid dice rolls
  }

  /**
   * Handle dice roll with selected tags
   */
  handleRollDice() {
    // Prevent multiple rapid calls
    if (this.isRolling) {
      console.log('🎲 Already rolling dice, ignoring duplicate call');
      return;
    }
    
    console.log('🎲 Dice roll attempt - current state:', {
      isRolling: this.isRolling,
      currentSession: this.gameClient.currentSession,
      socket: this.gameClient.webSocketManager.socket,
      sessionJoinComplete: this.gameClient.sessionJoinComplete,
      selectedTags: this.gameClient.tagSystem.getSelectedTags()
    });
    
    // Check if we're in a session
    if (!this.gameClient.currentSession || !this.gameClient.webSocketManager.socket) {
      console.log('❌ Not in a session, cannot roll dice');
      this.gameClient.uiManager.showNotification('Please join a session first');
      return;
    }
    
    // Check if session join is complete
    if (!this.gameClient.sessionJoinComplete) {
      console.log('❌ Session join not complete, cannot roll dice');
      this.gameClient.uiManager.showNotification('Please wait for session to fully load');
      return;
    }
    
    const selectedTags = this.gameClient.tagSystem.getSelectedTags();
    console.log('🎲 handleRollDice called with selectedTags:', selectedTags);
    
    if (selectedTags.length === 0) {
      console.log('❌ No tags selected, cannot roll dice');
      this.gameClient.uiManager.showNotification('Please select at least one tag to roll dice');
      return;
    }
    
    // Set rolling flag
    this.isRolling = true;
    
    // Calculate modifier from tag system
    const modifier = this.gameClient.tagSystem.calculateModifier();
    
    console.log(`📊 Roll stats: modifier: ${modifier}`);
    
    // Create roll action with relevant object IDs
    const relevantObjectIds = this.getRelevantObjectIds(selectedTags);
    
    console.log('🎯 Relevant object IDs:', relevantObjectIds);
    
    // Send the roll request with selected tags information
    this.gameClient.webSocketManager.sendDiceRoll({ 
      relevantObjectIds: [...new Set(relevantObjectIds)], // Remove duplicates
      selectedTags: selectedTags, // Send the selected tags for server processing
      modifier: modifier // Send the calculated modifier
    });
    
    console.log('📤 Dice roll request sent to server');
    
    // Don't clear selected tags here - wait for the dice-rolled response
    // The tags will be cleared in handleDiceRoll when we receive the result
  }

  /**
   * Get relevant object IDs for selected tags
   * @param {Array} selectedTags - Array of selected tags
   * @returns {Array} Array of relevant object IDs
   */
  getRelevantObjectIds(selectedTags) {
    const relevantObjectIds = [];
    if (this.gameClient.gameState?.gameObjects) {
      this.gameClient.gameState.gameObjects.forEach(obj => {
        if (obj.tags) {
          Object.values(obj.tags).forEach(tagType => {
            if (typeof tagType === 'object') {
              Object.keys(tagType).forEach(tagName => {
                if (selectedTags.some(st => st.tag === tagName)) {
                  relevantObjectIds.push(obj.id);
                }
              });
            }
          });
        }
      });
    }
    return relevantObjectIds;
  }

  /**
   * Handle dice roll response from server
   * @param {Object} data - Dice roll response data
   */
  handleDiceRoll(data) {
    console.log('🎲 handleDiceRoll received data:', data);
    
    // Get the selected tags before clearing them
    const selectedTags = this.gameClient.tagSystem.getSelectedTags();
    
    // Add the selected tags to the roll data for display
    const rollDataWithTags = {
      ...data,
      selectedTags: selectedTags
    };
    
    // Add dice result to UI with tag information
    this.gameClient.uiManager.addDiceResult(rollDataWithTags);
    
    // Clear selected tags after receiving the dice roll result
    console.log('🧹 Clearing selected tags after dice roll');
    this.gameClient.tagSystem.clearSelectedTags();
    this.isRolling = false; // Reset rolling flag
    
    console.log('✅ Dice roll processing complete');
  }

  /**
   * Calculate dice roll result locally (for testing/debugging)
   * @param {number} diceCount - Number of dice
   * @param {number} sides - Number of sides per die
   * @param {number} modifier - Modifier to add
   * @returns {Object} Roll result
   */
  calculateLocalRoll(diceCount = 2, sides = 6, modifier = 0) {
    return calculateDiceRoll(diceCount, sides, modifier);
  }

  /**
   * Set rolling state
   * @param {boolean} isRolling - Whether currently rolling
   */
  setRollingState(isRolling) {
    this.isRolling = isRolling;
  }

  /**
   * Check if currently rolling
   * @returns {boolean} Whether currently rolling
   */
  isCurrentlyRolling() {
    return this.isRolling;
  }

  /**
   * Reset rolling state
   */
  resetRollingState() {
    this.isRolling = false;
  }
}
