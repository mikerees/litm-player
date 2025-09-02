/**
 * Modal Manager for LitMPlayer Game Client
 * Manages modal behavior with proper event listener management
 */

import { CSS_CLASSES } from '../utils/constants.js';
import { addClass, removeClass } from '../utils/helpers.js';

export class ModalManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.modalEventListenersSetup = false; // Flag to prevent modal event listener duplication
    this.sceneEventListenersSetup = false; // Flag to prevent scene modal event listener duplication
    this.sceneEditingEventListenersSetup = false; // Flag to prevent scene editing modal event listener duplication
    
    // Bound event handlers to prevent duplication
    this.boundModalBackgroundClick = null;
    this.boundModalEscapeKey = null;
    this.boundSceneModalBackgroundClick = null;
    this.boundSceneModalEscapeKey = null;
    this.boundSceneImageSelect = null;
    this.boundRemoveSceneImage = null;
    this.boundSceneEditingModalBackgroundClick = null;
    this.boundSceneEditingModalEscapeKey = null;
  }

  /**
   * Setup modal event listeners (prevents duplication)
   */
  setupModalEventListeners() {
    // Only setup if not already setup
    if (this.modalEventListenersSetup) {
      return;
    }
    
    const overlay = document.getElementById('character-creation-overlay');
    if (!overlay) return;
    
    // Store bound event handlers to prevent duplication
    this.boundModalBackgroundClick = this.handleModalBackgroundClick.bind(this);
    this.boundModalEscapeKey = this.handleModalEscapeKey.bind(this);
    
    // Add event listeners
    overlay.addEventListener('click', this.boundModalBackgroundClick);
    document.addEventListener('keydown', this.boundModalEscapeKey);
    
    this.modalEventListenersSetup = true;
  }

  /**
   * Remove modal event listeners
   */
  removeModalEventListeners() {
    const overlay = document.getElementById('character-creation-overlay');
    if (!overlay) return;
    
    // Remove event listeners using stored bound handlers
    if (this.boundModalBackgroundClick) {
      overlay.removeEventListener('click', this.boundModalBackgroundClick);
    }
    if (this.boundModalEscapeKey) {
      document.removeEventListener('keydown', this.boundModalEscapeKey);
    }
    
    // Clear stored handlers
    this.boundModalBackgroundClick = null;
    this.boundModalEscapeKey = null;
    this.modalEventListenersSetup = false;
  }

  /**
   * Handle modal background click
   */
  handleModalBackgroundClick(event) {
    // Only close if clicking on the overlay background, not the modal content
    if (event.target.classList.contains('character-creation-overlay')) {
      this.handleModalClose();
    }
  }

  /**
   * Handle modal escape key
   */
  handleModalEscapeKey(event) {
    if (event.key === 'Escape') {
      this.handleModalClose();
    }
  }

  /**
   * Handle modal close (with automatic save)
   */
  handleModalClose() {
    // Check if there's unsaved data by looking at the form
    const form = document.getElementById('character-form');
    if (form) {
      const formData = new FormData(form);
      const characterName = formData.get('characterName');
      
      // If there's a character name entered, save automatically
      if (characterName && characterName.trim()) {
        this.gameClient.characterManager.handleSaveCharacter();
      } else {
        // No data entered, just close
        this.gameClient.characterManager.hideCharacterCreation();
      }
    } else {
      // No form found, just close
      this.gameClient.characterManager.hideCharacterCreation();
    }
  }

  /**
   * Setup scene modal event listeners (prevents duplication)
   */
  setupSceneModalEventListeners() {
    // Only setup if not already setup
    if (this.sceneEventListenersSetup) {
      return;
    }
    
    const overlay = document.getElementById('scene-creation-overlay');
    if (!overlay) return;
    
    // Store bound event handlers to prevent duplication
    this.boundSceneModalBackgroundClick = this.handleSceneModalBackgroundClick.bind(this);
    this.boundSceneModalEscapeKey = this.handleSceneModalEscapeKey.bind(this);
    this.boundSceneImageSelect = this.gameClient.sceneManager.handleSceneImageSelect.bind(this.gameClient.sceneManager);
    this.boundRemoveSceneImage = this.gameClient.sceneManager.handleRemoveSceneImage.bind(this.gameClient.sceneManager);
    
    // Add event listeners
    overlay.addEventListener('click', this.boundSceneModalBackgroundClick);
    document.addEventListener('keydown', this.boundSceneModalEscapeKey);
    
    // Add file upload event listeners
    const sceneImageInput = document.getElementById('scene-image-upload');
    const removeImageBtn = document.getElementById('remove-scene-image');
    
    if (sceneImageInput) {
      sceneImageInput.addEventListener('change', this.boundSceneImageSelect);
    }
    
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', this.boundRemoveSceneImage);
    }
    
    this.sceneEventListenersSetup = true;
  }

  /**
   * Remove scene modal event listeners
   */
  removeSceneModalEventListeners() {
    const overlay = document.getElementById('scene-creation-overlay');
    if (!overlay) return;
    
    // Remove event listeners using stored bound handlers
    if (this.boundSceneModalBackgroundClick) {
      overlay.removeEventListener('click', this.boundSceneModalBackgroundClick);
    }
    if (this.boundSceneModalEscapeKey) {
      document.removeEventListener('keydown', this.boundSceneModalEscapeKey);
    }
    
    // Remove file upload event listeners
    const sceneImageInput = document.getElementById('scene-image-upload');
    const removeImageBtn = document.getElementById('remove-scene-image');
    
    if (sceneImageInput && this.boundSceneImageSelect) {
      sceneImageInput.removeEventListener('change', this.boundSceneImageSelect);
    }
    
    if (removeImageBtn && this.boundRemoveSceneImage) {
      removeImageBtn.removeEventListener('click', this.boundRemoveSceneImage);
    }
    
    // Clear stored handlers
    this.boundSceneModalBackgroundClick = null;
    this.boundSceneModalEscapeKey = null;
    this.boundSceneImageSelect = null;
    this.boundRemoveSceneImage = null;
    this.sceneEventListenersSetup = false;
  }

  /**
   * Handle scene modal background click
   */
  handleSceneModalBackgroundClick(event) {
    // Only close if clicking on the overlay background, not the modal content
    if (event.target.classList.contains('scene-creation-overlay')) {
      this.handleSceneModalClose();
    }
  }

  /**
   * Handle scene modal escape key
   */
  handleSceneModalEscapeKey(event) {
    if (event.key === 'Escape') {
      this.handleSceneModalClose();
    }
  }

  /**
   * Handle scene modal close
   */
  handleSceneModalClose() {
    // Check if there's unsaved data by looking at the form
    const form = document.getElementById('scene-form');
    if (form) {
      const formData = new FormData(form);
      const sceneName = formData.get('sceneName');
      
      // If there's a scene name entered, save automatically
      if (sceneName && sceneName.trim()) {
        this.gameClient.sceneManager.handleSaveScene();
      } else {
        // No data entered, just close
        this.gameClient.sceneManager.hideSceneCreation();
      }
    } else {
      this.gameClient.sceneManager.hideSceneCreation();
    }
  }

  /**
   * Setup scene editing modal event listeners (prevents duplication)
   */
  setupSceneEditingModalEventListeners() {
    // Only setup if not already setup
    if (this.sceneEditingEventListenersSetup) {
      return;
    }
    
    const overlay = document.getElementById('scene-editing-overlay');
    if (!overlay) return;
    
    // Store bound event handlers to prevent duplication
    this.boundSceneEditingModalBackgroundClick = this.handleSceneEditingModalBackgroundClick.bind(this);
    this.boundSceneEditingModalEscapeKey = this.handleSceneEditingModalEscapeKey.bind(this);
    
    // Add event listeners
    overlay.addEventListener('click', this.boundSceneEditingModalBackgroundClick);
    document.addEventListener('keydown', this.boundSceneEditingModalEscapeKey);
    
    this.sceneEditingEventListenersSetup = true;
  }

  /**
   * Remove scene editing modal event listeners
   */
  removeSceneEditingModalEventListeners() {
    const overlay = document.getElementById('scene-editing-overlay');
    if (!overlay) return;
    
    // Remove event listeners using stored bound handlers
    if (this.boundSceneEditingModalBackgroundClick) {
      overlay.removeEventListener('click', this.boundSceneEditingModalBackgroundClick);
    }
    if (this.boundSceneEditingModalEscapeKey) {
      document.removeEventListener('keydown', this.boundSceneEditingModalEscapeKey);
    }
    
    // Clear stored handlers
    this.boundSceneEditingModalBackgroundClick = null;
    this.boundSceneEditingModalEscapeKey = null;
    this.sceneEditingEventListenersSetup = false;
  }

  /**
   * Handle scene editing modal background click
   */
  handleSceneEditingModalBackgroundClick(event) {
    // Only close if clicking on the overlay background, not the modal content
    if (event.target.classList.contains('scene-editing-overlay')) {
      this.handleSceneEditingModalClose();
    }
  }

  /**
   * Handle scene editing modal escape key
   */
  handleSceneEditingModalEscapeKey(event) {
    if (event.key === 'Escape') {
      this.handleSceneEditingModalClose();
    }
  }

  /**
   * Handle scene editing modal close (with automatic save)
   */
  handleSceneEditingModalClose() {
    console.log('🔍 Scene editing modal close triggered');
    
    // Check if there's unsaved data by looking at the form
    const form = document.getElementById('scene-edit-form');
    if (form) {
      const formData = new FormData(form);
      const sceneName = formData.get('sceneName');
      console.log('🔍 Form found, scene name:', sceneName);
      
      // If there's a scene name entered, save automatically
      if (sceneName && sceneName.trim()) {
        console.log('🔍 Triggering automatic save');
        this.gameClient.sceneManager.handleSaveSceneEdit();
      } else {
        console.log('🔍 No scene name, just closing');
        // No data entered, just close
        this.gameClient.sceneManager.hideSceneEditing();
      }
    } else {
      console.log('🔍 No form found, just closing');
      // No form found, just close
      this.gameClient.sceneManager.hideSceneEditing();
    }
  }

  /**
   * Show modal with overlay
   * @param {string} modalId - Modal overlay ID
   */
  showModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      removeClass(modalId, CSS_CLASSES.HIDDEN);
      addClass(modalId, CSS_CLASSES.SHOW);
    }
  }

  /**
   * Hide modal with overlay
   * @param {string} modalId - Modal overlay ID
   */
  hideModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      removeClass(modalId, CSS_CLASSES.SHOW);
      addClass(modalId, CSS_CLASSES.HIDDEN);
    }
  }

  /**
   * Reset all modal states
   */
  resetModalStates() {
    this.modalEventListenersSetup = false;
    this.sceneEventListenersSetup = false;
    this.sceneEditingEventListenersSetup = false;
    
    // Clear all bound handlers
    this.boundModalBackgroundClick = null;
    this.boundModalEscapeKey = null;
    this.boundSceneModalBackgroundClick = null;
    this.boundSceneModalEscapeKey = null;
    this.boundSceneImageSelect = null;
    this.boundRemoveSceneImage = null;
    this.boundSceneEditingModalBackgroundClick = null;
    this.boundSceneEditingModalEscapeKey = null;
  }
}
