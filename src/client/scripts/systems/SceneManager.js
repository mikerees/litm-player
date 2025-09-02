/**
 * Scene Manager for LitMPlayer Game Client
 * Handles scene creation, editing, and management
 */

import { ACTION_TYPES, OBJECT_TYPES } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export class SceneManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.editingSceneId = null;
  }

  /**
   * Show scene creation modal
   */
  showSceneCreation() {
    this.editingSceneId = null;
    this.gameClient.modalManager.setupSceneModalEventListeners();
    this.gameClient.modalManager.showModal('scene-creation-overlay');
    
    // Clear form and preview
    const form = document.getElementById('scene-form');
    if (form) {
      form.reset();
    }
    
    const preview = document.getElementById('scene-image-preview');
    if (preview) {
      preview.style.display = 'none';
    }
    
    // Clear scene tags container
    const tagsContainer = document.getElementById('scene-tags-input-container');
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
    }
    
    this.gameClient.dataManager.clearUploadedImageUrl();
    
    // Setup form event listeners
    this.setupSceneCreationFormEventListeners();
  }

  /**
   * Hide scene creation modal
   */
  hideSceneCreation() {
    this.gameClient.modalManager.hideModal('scene-creation-overlay');
    this.gameClient.modalManager.removeSceneModalEventListeners();
    this.editingSceneId = null;
    this.gameClient.dataManager.clearUploadedImageUrl();
  }

  /**
   * Setup scene creation form event listeners
   */
  setupSceneCreationFormEventListeners() {
    const addTagBtn = document.getElementById('add-scene-tag-btn');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', this.handleAddSceneTag.bind(this));
    }

    const cancelBtn = document.getElementById('cancel-scene-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideSceneCreation());
    }

    // Setup remove tag buttons
    this.setupSceneTagRemoveListeners();
  }

  /**
   * Handle adding scene tag input
   */
  handleAddSceneTag() {
    const container = document.getElementById('scene-tags-input-container');
    if (!container) return;

    const tagItem = document.createElement('div');
    tagItem.className = 'scene-tag-input-item';
    tagItem.innerHTML = `
      <input type="text" placeholder="Enter tag name" class="scene-tag-input">
      <button type="button" class="remove-scene-tag-btn">&times;</button>
    `;

    container.appendChild(tagItem);

    // Setup remove button for this tag
    const removeBtn = tagItem.querySelector('.remove-scene-tag-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        tagItem.remove();
      });
    }

    // Focus on the new input
    const input = tagItem.querySelector('.scene-tag-input');
    if (input) {
      input.focus();
    }
  }

  /**
   * Setup scene tag remove listeners
   */
  setupSceneTagRemoveListeners() {
    const removeButtons = document.querySelectorAll('#scene-tags-input-container .remove-scene-tag-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tagItem = e.target.closest('.scene-tag-input-item');
        if (tagItem) {
          tagItem.remove();
        }
      });
    });
  }

  /**
   * Handle saving scene
   */
  async handleSaveScene() {
    const form = document.getElementById('scene-form');
    if (!form) return;

    const formData = new FormData(form);
    const sceneName = formData.get('sceneName')?.trim();
    const sceneDescription = formData.get('sceneDescription')?.trim();

    if (!sceneName) {
      this.gameClient.uiManager.showError('Please enter a scene name');
      return;
    }

    let imageUrl = this.gameClient.dataManager.getUploadedImageUrl();
    
    // If no uploaded image URL but there's a file selected, upload it
    if (!imageUrl) {
      const fileInput = document.getElementById('scene-image-upload');
      const file = fileInput?.files[0];
      if (file) {
        try {
          this.gameClient.uiManager.showLoading(true);
          imageUrl = await this.gameClient.dataManager.uploadImage(file);
          this.gameClient.dataManager.setUploadedImageUrl(imageUrl);
        } catch (error) {
          this.gameClient.dataManager.handleUploadError(error);
          this.gameClient.uiManager.showLoading(false);
          return;
        }
      }
    }

    const contents = {
      name: sceneName,
      description: sceneDescription,
      image: imageUrl // Use 'image' to match the data structure
    };

    const tags = {};
    // Parse scene tags from dynamic inputs
    const tagInputs = document.querySelectorAll('#scene-tags-input-container .scene-tag-input:not([data-removed="true"])');
    tagInputs.forEach(input => {
      const tagName = input.value.trim();
      if (tagName) {
        tags[tagName] = { isSceneTag: true };
      }
    });

    if (this.editingSceneId) {
      // Update existing scene
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.UPDATE_OBJECT,
        objectType: OBJECT_TYPES.SCENE,
        objectId: this.editingSceneId,
        contents: contents,
        tags: tags
      });
    } else {
      // Create new scene
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.CREATE_OBJECT,
        objectType: OBJECT_TYPES.SCENE,
        contents: contents,
        tags: tags
      });
    }

    this.gameClient.uiManager.showLoading(false);
    this.hideSceneCreation();
  }

  /**
   * Handle editing scene
   * @param {string} sceneId - Scene ID to edit
   */
  handleEditScene(sceneId) {
    const scene = this.gameClient.gameState?.gameObjects?.find(obj => obj.id === sceneId);
    if (!scene) return;

    this.editingSceneId = sceneId;
    this.editingScene = scene; // Store the editing scene for challenge management
    this.gameClient.modalManager.setupSceneEditingModalEventListeners();
    this.gameClient.modalManager.showModal('scene-editing-overlay');

    // Setup scene editing form event listeners
    this.setupSceneEditingFormEventListeners();

    // Populate form with scene data
    const form = document.getElementById('scene-edit-form');
    if (form) {
      form.reset();
      form.querySelector('[name="sceneName"]').value = scene.contents.name || '';
      form.querySelector('[name="sceneDescription"]').value = scene.contents.description || '';
      
      // Set image preview if exists
      const imagePath = scene.contents?.imageUrl || scene.contents?.image;
      if (imagePath) {
        const preview = document.getElementById('scene-edit-image-preview');
        const previewImg = document.getElementById('scene-edit-preview-img');
        if (preview && previewImg) {
          previewImg.src = imagePath;
          preview.style.display = 'block';
        }
        this.gameClient.dataManager.setUploadedImageUrl(imagePath);
      }
      
      // Populate scene tags
      this.populateSceneEditTags(scene.tags || {});
      
      // Populate scene challenges
      this.populateSceneChallenges();
    }
  }

  /**
   * Setup scene editing form event listeners
   */
  setupSceneEditingFormEventListeners() {
    // Add scene tag button
    const addSceneEditTagBtn = document.getElementById('add-scene-edit-tag-btn');
    if (addSceneEditTagBtn) {
      addSceneEditTagBtn.addEventListener('click', () => {
        this.addSceneEditTagInput();
      });
    }

    // Add scene challenge button
    const addSceneChallengeBtn = document.getElementById('add-scene-challenge-btn');
    if (addSceneChallengeBtn) {
      addSceneChallengeBtn.addEventListener('click', () => {
        this.addSceneChallenge();
      });
    }

    // Scene edit image upload
    const sceneEditImageUpload = document.getElementById('scene-edit-image-upload');
    if (sceneEditImageUpload) {
      sceneEditImageUpload.addEventListener('change', (event) => {
        this.handleSceneEditImageSelect(event);
      });
    }

    // Remove scene edit image
    const removeSceneEditImageBtn = document.getElementById('remove-scene-edit-image');
    if (removeSceneEditImageBtn) {
      removeSceneEditImageBtn.addEventListener('click', () => {
        this.handleRemoveSceneEditImage();
      });
    }

    // Cancel scene edit button
    const cancelSceneEditBtn = document.getElementById('cancel-scene-edit-btn');
    if (cancelSceneEditBtn) {
      cancelSceneEditBtn.addEventListener('click', () => {
        this.hideSceneEditing();
      });
    }

    // Challenge edit form buttons
    const saveSceneChallengeEditBtn = document.getElementById('save-scene-challenge-edit-btn');
    if (saveSceneChallengeEditBtn) {
      saveSceneChallengeEditBtn.addEventListener('click', () => {
        this.handleSaveChallengeEdit();
      });
    }

    const cancelSceneChallengeEditBtn = document.getElementById('cancel-scene-challenge-edit-btn');
    if (cancelSceneChallengeEditBtn) {
      cancelSceneChallengeEditBtn.addEventListener('click', () => {
        this.hideChallengeEditForm();
      });
    }

    // Add challenge edit tag button
    const addSceneChallengeEditTagBtn = document.getElementById('add-scene-challenge-edit-tag-btn');
    if (addSceneChallengeEditTagBtn) {
      addSceneChallengeEditTagBtn.addEventListener('click', () => {
        this.addChallengeEditTagInput();
      });
    }
  }

  /**
   * Handle saving scene edit
   */
  async handleSaveSceneEdit() {
    const form = document.getElementById('scene-edit-form');
    if (!form) return;

    const formData = new FormData(form);
    const sceneName = formData.get('sceneName').trim();
    const sceneDescription = formData.get('sceneDescription').trim();

    if (!sceneName) {
      this.gameClient.uiManager.showError('Please enter a scene name');
      return;
    }

    let imageUrl = this.gameClient.dataManager.getUploadedImageUrl();
    
    // If no uploaded image URL but there's a file selected, upload it
    if (!imageUrl) {
      const fileInput = document.getElementById('scene-edit-image-upload');
      const file = fileInput?.files[0];
      if (file) {
        try {
          this.gameClient.uiManager.showLoading(true);
          imageUrl = await this.gameClient.dataManager.uploadImage(file);
          this.gameClient.dataManager.setUploadedImageUrl(imageUrl);
        } catch (error) {
          this.gameClient.dataManager.handleUploadError(error);
          this.gameClient.uiManager.showLoading(false);
          return;
        }
      }
    }

    // Collect scene tags from dynamic inputs
    const tags = {};
    const tagInputs = document.querySelectorAll('#scene-edit-tags-input-container .scene-tag-input:not([data-removed="true"])');
    tagInputs.forEach(input => {
      const tagName = input.value.trim();
      if (tagName) {
        tags[tagName] = { isSceneTag: true };
      }
    });

    const contents = {
      name: sceneName,
      description: sceneDescription,
      image: imageUrl, // Use 'image' to match the data structure
      challenges: this.editingScene?.contents?.challenges || []
    };

    // Update existing scene
    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.UPDATE_OBJECT,
      objectType: OBJECT_TYPES.SCENE,
      objectId: this.editingSceneId,
      contents: contents,
      tags: tags
    });

    this.gameClient.uiManager.showLoading(false);
    this.hideSceneEditing();
  }

  /**
   * Hide scene editing modal
   */
  hideSceneEditing() {
    // Hide challenge edit form if it's open
    this.hideChallengeEditForm();
    
    this.gameClient.modalManager.hideModal('scene-editing-overlay');
    this.gameClient.modalManager.removeSceneEditingModalEventListeners();
    this.removeSceneEditingFormEventListeners();
    this.editingSceneId = null;
    this.editingScene = null;
    this.gameClient.dataManager.clearUploadedImageUrl();
  }

  /**
   * Remove scene editing form event listeners
   */
  removeSceneEditingFormEventListeners() {
    // Remove event listeners by cloning and replacing elements
    const addSceneEditTagBtn = document.getElementById('add-scene-edit-tag-btn');
    if (addSceneEditTagBtn) {
      const newBtn = addSceneEditTagBtn.cloneNode(true);
      addSceneEditTagBtn.parentNode.replaceChild(newBtn, addSceneEditTagBtn);
    }

    const addSceneChallengeBtn = document.getElementById('add-scene-challenge-btn');
    if (addSceneChallengeBtn) {
      const newBtn = addSceneChallengeBtn.cloneNode(true);
      addSceneChallengeBtn.parentNode.replaceChild(newBtn, addSceneChallengeBtn);
    }

    const sceneEditImageUpload = document.getElementById('scene-edit-image-upload');
    if (sceneEditImageUpload) {
      const newInput = sceneEditImageUpload.cloneNode(true);
      sceneEditImageUpload.parentNode.replaceChild(newInput, sceneEditImageUpload);
    }

    const removeSceneEditImageBtn = document.getElementById('remove-scene-edit-image');
    if (removeSceneEditImageBtn) {
      const newBtn = removeSceneEditImageBtn.cloneNode(true);
      removeSceneEditImageBtn.parentNode.replaceChild(newBtn, removeSceneEditImageBtn);
    }

    const cancelSceneEditBtn = document.getElementById('cancel-scene-edit-btn');
    if (cancelSceneEditBtn) {
      const newBtn = cancelSceneEditBtn.cloneNode(true);
      cancelSceneEditBtn.parentNode.replaceChild(newBtn, cancelSceneEditBtn);
    }

    // Remove challenge edit form event listeners
    const saveSceneChallengeEditBtn = document.getElementById('save-scene-challenge-edit-btn');
    if (saveSceneChallengeEditBtn) {
      const newBtn = saveSceneChallengeEditBtn.cloneNode(true);
      saveSceneChallengeEditBtn.parentNode.replaceChild(newBtn, saveSceneChallengeEditBtn);
    }

    const cancelSceneChallengeEditBtn = document.getElementById('cancel-scene-challenge-edit-btn');
    if (cancelSceneChallengeEditBtn) {
      const newBtn = cancelSceneChallengeEditBtn.cloneNode(true);
      cancelSceneChallengeEditBtn.parentNode.replaceChild(newBtn, cancelSceneChallengeEditBtn);
    }

    // Remove challenge edit tag button event listener
    const addSceneChallengeEditTagBtn = document.getElementById('add-scene-challenge-edit-tag-btn');
    if (addSceneChallengeEditTagBtn) {
      const newBtn = addSceneChallengeEditTagBtn.cloneNode(true);
      addSceneChallengeEditTagBtn.parentNode.replaceChild(newBtn, addSceneChallengeEditTagBtn);
    }
  }

  /**
   * Populate scene edit tags
   * @param {Object} tags - Scene tags
   */
  populateSceneEditTags(tags) {
    const container = document.getElementById('scene-edit-tags-input-container');
    if (!container) return;

    container.innerHTML = '';
    
    if (tags && Object.keys(tags).length > 0) {
      Object.keys(tags).forEach(tagName => {
        this.addSceneEditTagInput(tagName);
      });
    } else {
      // Add one empty tag input if no tags exist
      this.addSceneEditTagInput();
    }
  }

  /**
   * Add scene edit tag input
   * @param {string} existingTagName - Existing tag name to populate
   */
  addSceneEditTagInput(existingTagName = '') {
    const container = document.getElementById('scene-edit-tags-input-container');
    if (!container) return;

    const tagItem = document.createElement('div');
    tagItem.className = 'scene-tag-input-item';
    
    tagItem.innerHTML = `
      <input type="text" placeholder="Enter tag name" class="scene-tag-input" value="${existingTagName}">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality
    const removeBtn = tagItem.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      // Mark the input as removed instead of immediately removing the DOM element
      const input = tagItem.querySelector('.scene-tag-input');
      const tagValue = input.value.trim();
      console.log(`🔍 Marking tag for removal: "${tagValue}"`);
      
      input.setAttribute('data-removed', 'true');
      input.style.display = 'none';
      removeBtn.style.display = 'none';
      
      // Add a visual indicator that the tag is marked for removal
      tagItem.style.opacity = '0.5';
      tagItem.style.backgroundColor = '#ffebee';
      
      console.log(`🔍 Tag "${tagValue}" marked as removed`);
    });

    container.appendChild(tagItem);
  }

  /**
   * Populate scene challenges
   */
  populateSceneChallenges() {
    const challengesContainer = document.getElementById('scene-edit-challenges-container');
    if (!challengesContainer) return;

    // Clear existing content
    challengesContainer.innerHTML = '';

    if (!this.editingScene || !this.editingScene.contents.challenges) {
      return;
    }

    // Create challenge items
    this.editingScene.contents.challenges.forEach(challenge => {
      const challengeItem = this.createChallengeItem(challenge);
      challengesContainer.appendChild(challengeItem);
    });
  }

  /**
   * Create challenge item for scene editing
   * @param {Object} challenge - Challenge object
   * @returns {HTMLElement} Challenge item element
   */
  createChallengeItem(challenge) {
    const challengeItem = document.createElement('div');
    challengeItem.className = 'challenge-item';
    
    const title = document.createElement('h4');
    title.textContent = challenge.title || 'Untitled Challenge';
    
    const details = document.createElement('p');
    details.textContent = challenge.details || 'No details provided';
    
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 8px;';
    
    const editBtn = document.createElement('button');
    editBtn.type = 'button'; // Prevent form submission
    editBtn.textContent = 'Edit';
    editBtn.className = 'btn btn-secondary btn-small';
    editBtn.onclick = () => {
      console.log('🔧 Edit button clicked for challenge:', challenge.id);
      this.handleEditChallenge(challenge.id);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button'; // Prevent form submission
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.onclick = () => this.handleDeleteChallenge(challenge.id);
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    challengeItem.appendChild(title);
    challengeItem.appendChild(details);
    challengeItem.appendChild(actions);
    
    return challengeItem;
  }

  /**
   * Handle editing challenge from scene
   * @param {string} challengeId - Challenge ID to edit
   */
  handleEditChallenge(challengeId) {
    console.log('🔧 handleEditChallenge called with challengeId:', challengeId);
    console.log('🔧 editingScene:', this.editingScene);
    console.log('🔧 editingScene.contents.challenges:', this.editingScene?.contents?.challenges);
    
    if (!this.editingScene || !this.editingScene.contents.challenges) {
      console.log('❌ Early return: no editingScene or challenges');
      return;
    }
    
    const challenge = this.editingScene.contents.challenges.find(c => c.id === challengeId);
    console.log('🔧 Found challenge:', challenge);
    
    if (!challenge) {
      console.log('❌ Challenge not found');
      return;
    }
    
    // Store the challenge being edited
    this.editingChallengeId = challengeId;
    console.log('🔧 Stored editingChallengeId:', this.editingChallengeId);
    
    // Show challenge editing form within scene modal
    this.showChallengeEditForm(challenge);
  }

  /**
   * Handle deleting challenge from scene
   * @param {string} challengeId - Challenge ID to delete
   */
  handleDeleteChallenge(challengeId) {
    if (!this.editingScene || !this.editingScene.contents.challenges) return;
    
    const index = this.editingScene.contents.challenges.findIndex(c => c.id === challengeId);
    if (index !== -1) {
      this.editingScene.contents.challenges.splice(index, 1);
      this.populateSceneChallenges();
    }
  }

  /**
   * Add scene challenge
   */
  addSceneChallenge() {
    if (!this.editingScene) return;
    
    if (!this.editingScene.contents.challenges) {
      this.editingScene.contents.challenges = [];
    }

    const newChallenge = {
      id: this.generateId(),
      title: 'New Challenge',
      details: 'Challenge details...',
      success: 'Success outcome...',
      consequences: 'Failure consequences...',
      tags: {}
    };

    this.editingScene.contents.challenges.push(newChallenge);
    this.populateSceneChallenges();
  }

  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Show challenge edit form within scene modal
   * @param {Object} challenge - Challenge to edit
   */
  showChallengeEditForm(challenge) {
    console.log('🔧 showChallengeEditForm called with challenge:', challenge);
    
    // Hide the scene challenges section
    const challengesSection = document.querySelector('.scene-section:has(#scene-edit-challenges-container)');
    console.log('🔧 Found challengesSection:', challengesSection);
    if (challengesSection) {
      challengesSection.style.display = 'none';
      console.log('🔧 Hidden challengesSection');
    }
    
    // Show challenge edit form
    const challengeEditForm = document.getElementById('scene-challenge-edit-form');
    const challengeEditFormInner = document.getElementById('scene-challenge-edit-form-inner');
    console.log('🔧 Found challengeEditForm:', challengeEditForm);
    console.log('🔧 Found challengeEditFormInner:', challengeEditFormInner);
    
    if (challengeEditForm && challengeEditFormInner) {
      challengeEditForm.style.display = 'block';
      console.log('🔧 Set challengeEditForm display to block');
      
      // Populate form with challenge data
      const titleInput = challengeEditFormInner.querySelector('[name="challengeTitle"]');
      const detailsInput = challengeEditFormInner.querySelector('[name="challengeDetails"]');
      const successInput = challengeEditFormInner.querySelector('[name="challengeSuccess"]');
      const consequencesInput = challengeEditFormInner.querySelector('[name="challengeConsequences"]');
      const tagsInput = challengeEditFormInner.querySelector('[name="challengeTags"]');
      
      console.log('🔧 Found form inputs:', { titleInput, detailsInput, successInput, consequencesInput, tagsInput });
      
      if (titleInput) titleInput.value = challenge.title || '';
      if (detailsInput) detailsInput.value = challenge.details || '';
      if (successInput) successInput.value = challenge.success || '';
      if (consequencesInput) consequencesInput.value = challenge.consequences || '';
      
      // Populate challenge tags using dynamic system
      const tags = challenge.tags || {};
      this.populateChallengeEditTags(tags);
      
      console.log('🔧 Populated form with challenge data');
    } else {
      console.log('❌ Could not find challenge edit form elements');
    }
  }

  /**
   * Hide challenge edit form and show scene challenges
   */
  hideChallengeEditForm() {
    // Show the scene challenges section
    const challengesSection = document.querySelector('.scene-section:has(#scene-edit-challenges-container)');
    if (challengesSection) {
      challengesSection.style.display = 'block';
    }
    
    // Hide challenge edit form
    const challengeEditForm = document.getElementById('scene-challenge-edit-form');
    const challengeEditFormInner = document.getElementById('scene-challenge-edit-form-inner');
    if (challengeEditForm) {
      challengeEditForm.style.display = 'none';
    }
    if (challengeEditFormInner) {
      challengeEditFormInner.reset();
    }
    
    // Clear challenge tags container
    const challengeTagsContainer = document.getElementById('scene-challenge-edit-tags-input-container');
    if (challengeTagsContainer) {
      challengeTagsContainer.innerHTML = '';
    }
    
    this.editingChallengeId = null;
  }

  /**
   * Handle saving challenge edit
   */
  handleSaveChallengeEdit() {
    if (!this.editingScene || !this.editingChallengeId) return;
    
    const form = document.getElementById('scene-challenge-edit-form-inner');
    if (!form) return;

    const formData = new FormData(form);
    const challengeTitle = formData.get('challengeTitle').trim();
    const challengeDetails = formData.get('challengeDetails').trim();
    const challengeSuccess = formData.get('challengeSuccess').trim();
    const challengeConsequences = formData.get('challengeConsequences').trim();

    if (!challengeTitle) {
      this.gameClient.uiManager.showError('Please enter a challenge title');
      return;
    }

    // Find the challenge to update
    const challengeIndex = this.editingScene.contents.challenges.findIndex(c => c.id === this.editingChallengeId);
    if (challengeIndex === -1) return;

    // Collect challenge tags from dynamic inputs
    const tags = {};
    const tagInputs = document.querySelectorAll('#scene-challenge-edit-tags-input-container .scene-tag-input:not([data-removed="true"])');
    tagInputs.forEach(input => {
      const tagName = input.value.trim();
      if (tagName) {
        tags[tagName] = { isChallengeTag: true };
      }
    });

    // Update the challenge locally
    this.editingScene.contents.challenges[challengeIndex] = {
      ...this.editingScene.contents.challenges[challengeIndex],
      title: challengeTitle,
      details: challengeDetails,
      success: challengeSuccess,
      consequences: challengeConsequences,
      tags: tags
    };

    // Send the updated scene to the server
    const contents = {
      name: this.editingScene.contents.name,
      description: this.editingScene.contents.description,
      image: this.editingScene.contents.image,
      challenges: this.editingScene.contents.challenges
    };

    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.UPDATE_OBJECT,
      objectType: OBJECT_TYPES.SCENE,
      objectId: this.editingSceneId,
      contents: contents,
      tags: this.editingScene.tags || {}
    });

    // Hide the edit form and refresh the challenges display
    this.hideChallengeEditForm();
    this.populateSceneChallenges();
  }

  /**
   * Populate challenge edit tags
   * @param {Object} tags - Challenge tags
   */
  populateChallengeEditTags(tags) {
    const container = document.getElementById('scene-challenge-edit-tags-input-container');
    if (!container) return;

    container.innerHTML = '';
    
    if (tags && Object.keys(tags).length > 0) {
      Object.keys(tags).forEach(tagName => {
        this.addChallengeEditTagInput(tagName);
      });
    } else {
      // Add one empty tag input if no tags exist
      this.addChallengeEditTagInput();
    }
  }

  /**
   * Add challenge edit tag input
   * @param {string} existingTagName - Existing tag name to populate
   */
  addChallengeEditTagInput(existingTagName = '') {
    const container = document.getElementById('scene-challenge-edit-tags-input-container');
    if (!container) return;

    const tagItem = document.createElement('div');
    tagItem.className = 'scene-tag-input-item';
    
    tagItem.innerHTML = `
      <input type="text" placeholder="Enter tag name" class="scene-tag-input" value="${existingTagName}">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality
    const removeBtn = tagItem.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      // Mark the input as removed instead of immediately removing the DOM element
      const input = tagItem.querySelector('.scene-tag-input');
      const tagValue = input.value.trim();
      console.log(`🔍 Marking challenge tag for removal: "${tagValue}"`);
      
      input.setAttribute('data-removed', 'true');
      input.style.display = 'none';
      removeBtn.style.display = 'none';
      
      // Add a visual indicator that the tag is marked for removal
      tagItem.style.opacity = '0.5';
      tagItem.style.backgroundColor = '#ffebee';
      
      console.log(`🔍 Challenge tag "${tagValue}" marked as removed`);
    });

    container.appendChild(tagItem);
  }

  /**
   * Handle deleting scene
   * @param {string} sceneId - Scene ID to delete
   */
  handleDeleteScene(sceneId) {
    if (confirm('Are you sure you want to delete this scene?')) {
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.DELETE_OBJECT,
        objectType: OBJECT_TYPES.SCENE,
        objectId: sceneId
      });
    }
  }

  /**
   * Handle scene image file selection
   * @param {Event} event - File selection event
   */
  handleSceneImageSelect(event) {
    this.gameClient.dataManager.handleSceneImageSelect(event);
  }

  /**
   * Handle remove scene image
   */
  handleRemoveSceneImage() {
    this.gameClient.dataManager.handleRemoveSceneImage();
  }

  /**
   * Handle scene edit image file selection
   * @param {Event} event - File selection event
   */
  handleSceneEditImageSelect(event) {
    this.gameClient.dataManager.handleSceneEditImageSelect(event);
  }

  /**
   * Handle remove scene edit image
   */
  handleRemoveSceneEditImage() {
    this.gameClient.dataManager.handleRemoveSceneEditImage();
  }

  /**
   * Update current scene display
   * @param {Object} scene - Scene object
   */
  updateCurrentScene(scene) {
    if (!scene) {
      this.clearCurrentScene();
      return;
    }

    const sceneTitle = document.getElementById('scene-title');
    const sceneImage = document.getElementById('scene-image');
    const sceneDescription = document.getElementById('scene-description');
    const sceneTags = document.getElementById('scene-tags');

    if (sceneTitle) {
      sceneTitle.textContent = scene.contents.name || 'Untitled Scene';
    }

    if (sceneImage) {
      // Check for both imageUrl and image properties (for backward compatibility)
      const imagePath = scene.contents?.imageUrl || scene.contents?.image;
      if (imagePath) {
        sceneImage.src = imagePath;
        sceneImage.style.display = 'block';
      } else {
        sceneImage.style.display = 'none';
      }
    }

    if (sceneDescription) {
      sceneDescription.textContent = scene.contents.description || '';
    }

    if (sceneTags) {
      sceneTags.innerHTML = '';
      const tags = scene.tags || {};
      Object.keys(tags).forEach(tag => {
        const tagElement = this.gameClient.tagSystem.createTagElement(tag);
        sceneTags.appendChild(tagElement);
      });
    }

    // Update background image with cross-fade effect
    const imagePath = scene.contents?.imageUrl || scene.contents?.image;
    if (imagePath) {
      this.updateBackgroundImage(imagePath);
    } else {
      this.clearBackgroundImage();
    }
  }

  /**
   * Clear current scene display
   */
  clearCurrentScene() {
    const sceneTitle = document.getElementById('scene-title');
    const sceneImage = document.getElementById('scene-image');
    const sceneDescription = document.getElementById('scene-description');
    const sceneTags = document.getElementById('scene-tags');

    if (sceneTitle) sceneTitle.textContent = 'No Scene Set';
    if (sceneImage) sceneImage.style.display = 'none';
    if (sceneDescription) sceneDescription.textContent = '';
    if (sceneTags) sceneTags.innerHTML = '';

    // Clear background image
    this.clearBackgroundImage();
  }

  /**
   * Update background image with cross-fade effect
   * @param {string} imageUrl - Image URL
   */
  updateBackgroundImage(imageUrl) {
    const body = document.body;
    
    // Set background image with cross-fade effect
    body.style.setProperty('--scene-background-image', `url(${imageUrl})`);
    
    // Add scene-active class for transition
    body.classList.add('scene-active');
  }

  /**
   * Clear background image
   */
  clearBackgroundImage() {
    const body = document.body;
    
    // Remove scene-active class
    body.classList.remove('scene-active');
    
    // Clear background image CSS variable
    body.style.removeProperty('--scene-background-image');
  }

  /**
   * Get scene by ID
   * @param {string} sceneId - Scene ID
   * @returns {Object|null} Scene object
   */
  getSceneById(sceneId) {
    return this.gameClient.gameState?.gameObjects?.find(obj => obj.id === sceneId) || null;
  }

  /**
   * Get all scenes
   * @returns {Array} Array of scene objects
   */
  getAllScenes() {
    return this.gameClient.gameState?.gameObjects?.filter(obj => obj.type === OBJECT_TYPES.SCENE) || [];
  }

  /**
   * Get current scene
   * @returns {Object|null} Current scene object
   */
  getCurrentScene() {
    const currentSceneId = this.gameClient.gameState?.currentScene;
    if (!currentSceneId) return null;
    return this.getSceneById(currentSceneId);
  }

  /**
   * Check if scene exists
   * @param {string} sceneId - Scene ID
   * @returns {boolean} Whether scene exists
   */
  sceneExists(sceneId) {
    return this.getSceneById(sceneId) !== null;
  }

  /**
   * Get editing scene ID
   * @returns {string|null} Editing scene ID
   */
  getEditingSceneId() {
    return this.editingSceneId;
  }

  /**
   * Set editing scene ID
   * @param {string|null} sceneId - Scene ID
   */
  setEditingSceneId(sceneId) {
    this.editingSceneId = sceneId;
  }

  /**
   * Show scene management modal
   */
  showSceneManagement() {
    this.gameClient.modalManager.showModal('scene-management-overlay');
    this.populateSceneManagement();
  }

  /**
   * Hide scene management modal
   */
  hideSceneManagement() {
    this.gameClient.modalManager.hideModal('scene-management-overlay');
  }

  /**
   * Populate scene management modal with existing scenes
   */
  populateSceneManagement() {
    const scenesGrid = document.getElementById('scenes-grid');
    if (!scenesGrid) return;

    // Clear existing content
    scenesGrid.innerHTML = '';

    const scenes = this.getAllScenes();
    
    if (scenes.length === 0) {
      scenesGrid.innerHTML = '<p style="text-align: center; color: #8b4513; font-style: italic;">No scenes available. Create your first scene!</p>';
      return;
    }

    // Sort scenes by creation date (newest first)
    const sortedScenes = scenes.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Create scene cards
    sortedScenes.forEach(scene => {
      const sceneCard = this.createSceneCard(scene);
      scenesGrid.appendChild(sceneCard);
    });
  }

  /**
   * Create a scene card element
   */
  createSceneCard(scene) {
    const sceneCard = document.createElement('div');
    sceneCard.className = 'scene-card';
    sceneCard.dataset.sceneId = scene.id;

    const isCurrentScene = this.gameClient.gameState?.currentScene === scene.id;
    const imagePath = scene.contents?.imageUrl || scene.contents?.image;

    sceneCard.innerHTML = `
      <div class="scene-card-image">
        ${imagePath ? `<img src="${imagePath}" alt="${scene.contents.name}" />` : '<div class="no-image">No Image</div>'}
      </div>
      <div class="scene-card-content">
        <h4 class="scene-card-title">${scene.contents.name || 'Untitled Scene'}</h4>
        <p class="scene-card-description">${scene.contents.description || 'No description'}</p>
        <div class="scene-card-tags">
          ${Object.keys(scene.tags || {}).map(tag => `<span class="scene-tag">${tag}</span>`).join('')}
        </div>
        <div class="scene-card-status">
          ${isCurrentScene ? '<span class="current-scene-indicator">Current Scene</span>' : ''}
        </div>
      </div>
      <div class="scene-card-actions">
        <button class="scene-action-btn set-current" title="Set as current scene">▶</button>
        <button class="scene-action-btn edit" title="Edit scene">✏️</button>
        <button class="scene-action-btn delete" title="Delete scene">🗑️</button>
      </div>
    `;

    // Add event listeners
    const setCurrentBtn = sceneCard.querySelector('.set-current');
    const editBtn = sceneCard.querySelector('.edit');
    const deleteBtn = sceneCard.querySelector('.delete');

    setCurrentBtn.addEventListener('click', () => this.setCurrentScene(scene.id));
    editBtn.addEventListener('click', () => this.handleEditScene(scene.id));
    deleteBtn.addEventListener('click', () => this.handleDeleteScene(scene.id));

    return sceneCard;
  }

  /**
   * Set a scene as the current scene
   */
  setCurrentScene(sceneId) {
    this.gameClient.webSocketManager.sendGameAction({
      type: 'set_scene',
      sceneObjectId: sceneId
    });
    this.hideSceneManagement();
  }
}
