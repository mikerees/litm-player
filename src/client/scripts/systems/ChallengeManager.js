/**
 * Challenge Manager for LitMPlayer Game Client
 * Handles challenge creation, editing, and management
 */

import { ACTION_TYPES, OBJECT_TYPES } from '../utils/constants.js';
import { escapeHtml, generateChallengeId } from '../utils/helpers.js';

export class ChallengeManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.editingChallengeId = null;
  }

  /**
   * Show challenge creation modal
   */
  showChallengeCreation() {
    this.editingChallengeId = null;
    this.gameClient.modalManager.setupModalEventListeners();
    this.gameClient.modalManager.showModal('challenge-creation-overlay');
    
    // Clear form
    const form = document.getElementById('challenge-form');
    if (form) {
      form.reset();
      
      // Explicitly clear all input values to ensure they're empty
      const inputs = form.querySelectorAll('input[type="text"], textarea');
      inputs.forEach(input => {
        input.value = '';
      });
    }
  }

  /**
   * Hide challenge creation modal
   */
  hideChallengeCreation() {
    this.gameClient.modalManager.hideModal('challenge-creation-overlay');
    this.gameClient.modalManager.removeModalEventListeners();
    this.editingChallengeId = null;
  }

  /**
   * Handle saving challenge
   */
  handleSaveChallenge() {
    const form = document.getElementById('challenge-form');
    if (!form) return;

    const formData = new FormData(form);
    const challengeTitle = formData.get('challengeTitle').trim();
    const challengeDetails = formData.get('challengeDetails').trim();
    const challengeSuccess = formData.get('challengeSuccess').trim();
    const challengeConsequences = formData.get('challengeConsequences').trim();
    const challengeTags = formData.get('challengeTags').trim();

    if (!challengeTitle) {
      this.gameClient.uiManager.showError('Please enter a challenge title');
      return;
    }

    const challengeData = {
      title: challengeTitle,
      details: challengeDetails,
      success: challengeSuccess,
      consequences: challengeConsequences,
      tags: {}
    };

    // Parse challenge tags
    if (challengeTags) {
      const tagList = challengeTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      tagList.forEach(tag => {
        challengeData.tags[tag] = { isChallengeTag: true };
      });
    }

    if (this.editingChallengeId) {
      // Update existing challenge
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.UPDATE_OBJECT,
        objectType: OBJECT_TYPES.CHALLENGE,
        objectId: this.editingChallengeId,
        contents: challengeData,
        tags: challengeData.tags
      });
    } else {
      // Create new challenge
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.CREATE_OBJECT,
        objectType: OBJECT_TYPES.CHALLENGE,
        contents: challengeData,
        tags: challengeData.tags
      });
    }

    this.hideChallengeCreation();
  }

  /**
   * Handle editing challenge
   * @param {string} challengeId - Challenge ID to edit
   */
  handleEditChallenge(challengeId) {
    const challenge = this.gameClient.gameState?.gameObjects?.find(obj => obj.id === challengeId);
    if (!challenge) return;

    this.editingChallengeId = challengeId;
    this.gameClient.modalManager.setupModalEventListeners();
    this.gameClient.modalManager.showModal('challenge-creation-overlay');

    // Populate form with challenge data
    const form = document.getElementById('challenge-form');
    if (form) {
      form.reset();
      form.querySelector('[name="challengeTitle"]').value = challenge.contents.title || '';
      form.querySelector('[name="challengeDetails"]').value = challenge.contents.details || '';
      form.querySelector('[name="challengeSuccess"]').value = challenge.contents.success || '';
      form.querySelector('[name="challengeConsequences"]').value = challenge.contents.consequences || '';
      
      // Set challenge tags
      const tags = challenge.contents.tags || {};
      const tagList = Object.keys(tags).join(', ');
      form.querySelector('[name="challengeTags"]').value = tagList;
    }
  }

  /**
   * Handle deleting challenge
   * @param {string} challengeId - Challenge ID to delete
   */
  handleDeleteChallenge(challengeId) {
    if (confirm('Are you sure you want to delete this challenge?')) {
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.DELETE_OBJECT,
        objectType: OBJECT_TYPES.CHALLENGE,
        objectId: challengeId
      });
    }
  }

  /**
   * Set active challenge
   * @param {string} challengeId - Challenge ID to set as active
   */
  setActiveChallenge(challengeId) {
    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.SET_ACTIVE_CHALLENGE,
      challengeId: challengeId
    });
  }

  /**
   * Clear active challenge
   */
  clearActiveChallenge() {
    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.CLEAR_ACTIVE_CHALLENGE
    });
  }

  /**
   * Overcome challenge
   * @param {string} challengeId - Challenge ID to overcome
   */
  overcomeChallenge(challengeId) {
    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.OVERCOME_CHALLENGE,
      challengeId: challengeId
    });
  }

  /**
   * Toggle overcome challenge
   * @param {string} challengeId - Challenge ID to toggle
   */
  toggleOvercomeChallenge(challengeId) {
    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.TOGGLE_OVERCOME_CHALLENGE,
      challengeId: challengeId
    });
  }

  /**
   * Update active challenge display
   * @param {Object} challenge - Challenge object
   */
  updateActiveChallenge(challenge) {
    console.log('🎯 Updating active challenge display:', challenge);
    
    if (!challenge) {
      console.log('🎯 No challenge provided, clearing display');
      this.clearActiveChallengeDisplay();
      return;
    }

    const overlay = document.getElementById('active-challenge-overlay');
    const title = document.getElementById('active-challenge-title');
    const tags = document.getElementById('active-challenge-tags');

    if (overlay) {
      overlay.style.display = 'block';
      console.log('🎯 Showing active challenge overlay');
    }

    if (title) {
      title.textContent = challenge.title || 'Untitled Challenge';
      console.log('🎯 Set challenge title:', challenge.title);
    }

    if (tags) {
      tags.innerHTML = '';
      const challengeTags = challenge.tags || {};
      Object.keys(challengeTags).forEach(tag => {
        const tagElement = this.gameClient.tagSystem.createTagElement(tag);
        tags.appendChild(tagElement);
      });
      console.log('🎯 Set challenge tags:', Object.keys(challengeTags));
    }

    // Update the three paragraphs in the active challenge details section
    const detailsText = document.getElementById('active-challenge-details-text');
    const success = document.getElementById('active-challenge-success');
    const consequences = document.getElementById('active-challenge-consequences');

    if (detailsText) {
      detailsText.textContent = challenge.details || 'No challenge details available.';
    }

    if (success) {
      success.textContent = `Success: ${challenge.success || 'No success text available.'}`;
    }

    if (consequences) {
      consequences.textContent = `Consequences: ${challenge.consequences || 'No consequences text available.'}`;
    }

    // Show the details, success, and consequences sections for narrators
    const detailsSection = document.getElementById('active-challenge-details');
    
    if (detailsSection) {
      detailsSection.style.display = 'block';
    }
    
    console.log('🎯 Active challenge display updated');
  }

  /**
   * Clear active challenge display
   */
  clearActiveChallengeDisplay() {
    const overlay = document.getElementById('active-challenge-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }

    // Hide the details, success, and consequences sections for narrators
    const detailsSection = document.getElementById('active-challenge-details');
    
    if (detailsSection) {
      detailsSection.style.display = 'none';
    }
  }

  /**
   * Update challenges list display
   * @param {Array} challenges - Array of challenge objects
   */
  updateChallengesList(challenges = []) {
    const challengesList = document.getElementById('challenges-list');
    if (!challengesList) return;

    challengesList.innerHTML = '';

    if (challenges.length === 0) {
      challengesList.innerHTML = '<p class="empty-state">No challenges created yet</p>';
      return;
    }

    challenges.forEach(challenge => {
      const challengeElement = this.createChallengeElement(challenge);
      challengesList.appendChild(challengeElement);
    });
  }

  /**
   * Create challenge element
   * @param {Object} challenge - Challenge object
   * @returns {HTMLElement} Challenge element
   */
  createChallengeElement(challenge) {
    const challengeDiv = document.createElement('div');
    challengeDiv.className = 'challenge-item';
    challengeDiv.id = `challenge-${challenge.id}`;

    const tags = challenge.contents.tags || {};
    const tagList = Object.keys(tags).map(tag => 
      `<span class="tag challenge">${escapeHtml(tag)}</span>`
    ).join('');

    const isOvercome = challenge.contents.overcome || false;
    const overcomeClass = isOvercome ? 'overcome' : '';

    challengeDiv.innerHTML = `
      <div class="challenge-header ${overcomeClass}">
        <h4>${escapeHtml(challenge.contents.title)}</h4>
        <div class="challenge-actions">
          <button class="btn btn-small btn-primary" onclick="gameClient.challengeManager.setActiveChallenge('${challenge.id}')">
            Set Active
          </button>
          <button class="btn btn-small btn-secondary" onclick="gameClient.challengeManager.handleEditChallenge('${challenge.id}')">
            Edit
          </button>
          <button class="btn btn-small btn-danger" onclick="gameClient.challengeManager.handleDeleteChallenge('${challenge.id}')">
            Delete
          </button>
        </div>
      </div>
      <div class="challenge-details">
        ${escapeHtml(challenge.contents.details || '')}
      </div>
      <div class="challenge-tags">
        ${tagList}
      </div>
      <div class="challenge-status">
        <button class="btn btn-small ${isOvercome ? 'btn-success' : 'btn-warning'}" 
                onclick="gameClient.challengeManager.toggleOvercomeChallenge('${challenge.id}')">
          ${isOvercome ? 'Overcome' : 'Not Overcome'}
        </button>
      </div>
    `;

    return challengeDiv;
  }

  /**
   * Get challenge by ID
   * @param {string} challengeId - Challenge ID
   * @returns {Object|null} Challenge object
   */
  getChallengeById(challengeId) {
    return this.gameClient.gameState?.gameObjects?.find(obj => obj.id === challengeId) || null;
  }

  /**
   * Get all challenges
   * @returns {Array} Array of challenge objects
   */
  getAllChallenges() {
    return this.gameClient.gameState?.gameObjects?.filter(obj => obj.type === OBJECT_TYPES.CHALLENGE) || [];
  }

  /**
   * Get active challenge
   * @returns {Object|null} Active challenge object
   */
  getActiveChallenge() {
    const activeChallengeId = this.gameClient.gameState?.activeChallenge;
    if (!activeChallengeId) return null;
    
    // First, look for the challenge in the current scene's challenges array
    const currentScene = this.gameClient.sceneManager.getCurrentScene();
    if (currentScene && currentScene.contents.challenges) {
      const sceneChallenge = currentScene.contents.challenges.find(challenge => challenge.id === activeChallengeId);
      if (sceneChallenge) return sceneChallenge;
    }
    
    // If not found in scene, look for standalone challenge in game objects
    const standaloneChallenge = this.gameClient.gameState?.gameObjects?.find(obj => 
      obj.type === OBJECT_TYPES.CHALLENGE && obj.id === activeChallengeId
    );
    
    if (standaloneChallenge) {
      // Convert standalone challenge to the format expected by the UI
      return {
        id: standaloneChallenge.id,
        title: standaloneChallenge.contents.title,
        details: standaloneChallenge.contents.details,
        success: standaloneChallenge.contents.success,
        consequences: standaloneChallenge.contents.consequences,
        tags: standaloneChallenge.contents.tags || {},
        overcome: standaloneChallenge.contents.overcome || false
      };
    }
    
    return null;
  }

  /**
   * Check if challenge exists
   * @param {string} challengeId - Challenge ID
   * @returns {boolean} Whether challenge exists
   */
  challengeExists(challengeId) {
    return this.getChallengeById(challengeId) !== null;
  }

  /**
   * Get editing challenge ID
   * @returns {string|null} Editing challenge ID
   */
  getEditingChallengeId() {
    return this.editingChallengeId;
  }

  /**
   * Set editing challenge ID
   * @param {string|null} challengeId - Challenge ID
   */
  setEditingChallengeId(challengeId) {
    this.editingChallengeId = challengeId;
  }

  /**
   * Show challenge presentation dropdown
   */
  showChallengePresentation() {
    console.log('🎯 Show challenge presentation called');
    const dropdown = document.querySelector('.challenges-dropdown');
    const dropdownMenu = document.getElementById('challenges-dropdown-menu');
    
    if (dropdown && dropdownMenu) {
      console.log('🎯 Found challenges dropdown and menu');
      // Toggle dropdown visibility using CSS classes
      if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
        dropdownMenu.classList.add('show');
        console.log('🎯 Showing dropdown');
        this.populateChallengesDropdown();
      } else {
        dropdown.style.display = 'none';
        dropdownMenu.classList.remove('show');
        console.log('🎯 Hiding dropdown');
      }
    } else {
      console.log('❌ Challenges dropdown or menu not found');
    }
  }

  /**
   * Hide challenge presentation dropdown
   */
  hideChallengePresentation() {
    const dropdown = document.querySelector('.challenges-dropdown');
    const dropdownMenu = document.getElementById('challenges-dropdown-menu');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
    if (dropdownMenu) {
      dropdownMenu.classList.remove('show');
    }
  }

  /**
   * Populate challenges dropdown with available challenges
   */
  populateChallengesDropdown() {
    console.log('🎯 Populating challenges dropdown...');
    const dropdownMenu = document.getElementById('challenges-dropdown-menu');
    if (!dropdownMenu) {
      console.log('❌ Challenges dropdown menu not found');
      return;
    }

    dropdownMenu.innerHTML = '';

    // Get scene challenges
    const currentScene = this.gameClient.sceneManager.getCurrentScene();
    console.log('🎯 Current scene:', currentScene);
    console.log('🎯 Game state:', this.gameClient.gameState);
    
    let allChallenges = [];
    
    // Add scene challenges
    if (currentScene && currentScene.contents.challenges) {
      console.log('🎯 Scene contents:', currentScene.contents);
      allChallenges = allChallenges.concat(currentScene.contents.challenges);
      console.log('🎯 Scene challenges found:', currentScene.contents.challenges);
    }
    
    // Add standalone challenges
    const standaloneChallenges = this.gameClient.gameState?.gameObjects?.filter(obj => 
      obj.type === OBJECT_TYPES.CHALLENGE
    ) || [];
    
    console.log('🎯 Standalone challenges found:', standaloneChallenges);
    
    // Convert standalone challenges to the format expected by the UI
    const convertedStandaloneChallenges = standaloneChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.contents.title,
      details: challenge.contents.details,
      success: challenge.contents.success,
      consequences: challenge.contents.consequences,
      tags: challenge.contents.tags || {},
      overcome: challenge.contents.overcome || false
    }));
    
    allChallenges = allChallenges.concat(convertedStandaloneChallenges);
    
    console.log('🎯 Total challenges found:', allChallenges);
    
    if (allChallenges.length === 0) {
      dropdownMenu.innerHTML = '<p style="padding: 8px; color: #8b4513; font-style: italic;">No challenges available. Create challenges using the challenge creation form.</p>';
      return;
    }

    allChallenges.forEach(challenge => {
      const challengeItem = this.createChallengeDropdownItem(challenge);
      dropdownMenu.appendChild(challengeItem);
    });
    
    console.log('✅ Challenges dropdown populated with', allChallenges.length, 'challenges');
  }

  /**
   * Create a challenge dropdown item
   */
  createChallengeDropdownItem(challenge) {
    const challengeItem = document.createElement('div');
    challengeItem.className = 'challenge-dropdown-item';
    challengeItem.dataset.challengeId = challenge.id;

    const isActive = this.gameClient.gameState?.activeChallenge === challenge.id;

    challengeItem.innerHTML = `
      <div class="challenge-item-actions">
        <button class="challenge-action-btn present" title="Present this challenge to players" ${challenge.overcome ? 'disabled' : ''}>
          Present
        </button>
        <button class="challenge-action-btn overcome" title="${challenge.overcome ? 'Reset challenge status' : 'Mark as overcome'}">
          ${challenge.overcome ? 'Reset' : 'Overcome'}
        </button>
      </div>
      <div class="challenge-item-header">
        <div class="challenge-item-title">${challenge.title || 'Untitled Challenge'}</div>
        <div class="challenge-item-status">
          ${isActive ? '<span class="active-indicator">Active</span>' : ''}
          ${challenge.overcome ? '<span class="overcome-indicator">Overcome</span>' : ''}
        </div>
      </div>
      <div class="challenge-item-tags">
        ${Object.keys(challenge.tags || {}).map(tag => `<span class="challenge-tag">${tag}</span>`).join('')}
      </div>
    `;

    // Add event listeners
    const presentBtn = challengeItem.querySelector('.present');
    const overcomeBtn = challengeItem.querySelector('.overcome');

    presentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!challenge.overcome) {
        this.presentChallenge(challenge);
      }
    });

    overcomeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleOvercomeChallenge(challenge);
    });

    return challengeItem;
  }

  /**
   * Present a challenge to players
   */
  presentChallenge(challenge) {
    const currentScene = this.gameClient.sceneManager.getCurrentScene();
    if (!currentScene) return;

    // Send action to server to set active challenge
    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.SET_ACTIVE_CHALLENGE,
      challengeId: challenge.id,
      sceneId: currentScene.id
    });

    console.log('🎯 Presenting challenge:', challenge.title);
    this.hideChallengePresentation();
  }

  /**
   * Toggle a challenge's overcome status
   */
  toggleOvercomeChallenge(challenge) {
    const currentScene = this.gameClient.sceneManager.getCurrentScene();
    if (!currentScene) return;

    // If marking as overcome and it's currently active, clear active challenge
    if (!challenge.overcome && this.gameClient.gameState?.activeChallenge === challenge.id) {
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.CLEAR_ACTIVE_CHALLENGE
      });
    }

    // Toggle challenge overcome status
    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.TOGGLE_OVERCOME_CHALLENGE,
      challengeId: challenge.id,
      sceneId: currentScene.id
    });

    console.log('🎯 Toggling challenge overcome status:', challenge.title, challenge.overcome ? '-> not overcome' : '-> overcome');
    this.hideChallengePresentation();
  }
}
