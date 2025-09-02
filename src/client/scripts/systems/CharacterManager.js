/**
 * Character Manager for LitMPlayer Game Client
 * Handles character creation, editing, and management
 */

import { ACTION_TYPES, OBJECT_TYPES } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export class CharacterManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.editingCharacterId = null;
  }

  /**
   * Show character creation modal
   */
  showCharacterCreation() {
    this.editingCharacterId = null;
    this.gameClient.modalManager.setupModalEventListeners();
    this.gameClient.modalManager.showModal('character-creation-overlay');
    
    // Clear form and reset to default state
    this.resetCharacterForm();
    
    // Auto-populate and lock the player name field
    const playerNameField = document.getElementById('player-name-char');
    if (playerNameField && this.gameClient.currentPlayer) {
      playerNameField.value = this.gameClient.currentPlayer.name;
      playerNameField.readOnly = true;
      playerNameField.style.backgroundColor = '#f5f5f5';
      playerNameField.style.color = '#666';
    }
  }

  /**
   * Hide character creation modal
   */
  hideCharacterCreation() {
    // Remove form event listeners before hiding
    this.removeFormEventListeners();
    
    this.gameClient.modalManager.hideModal('character-creation-overlay');
    this.gameClient.modalManager.removeModalEventListeners();
    this.editingCharacterId = null;
  }

  /**
   * Reset character form to default state
   */
  resetCharacterForm() {
    const form = document.getElementById('character-form');
    if (!form) return;

    form.reset();
    
    // Reset promise circles
    const promiseCircles = form.querySelectorAll('.promise-circle');
    promiseCircles.forEach(circle => circle.classList.remove('selected'));
    
    // Clear all dynamic containers
    this.clearContainer('companions-container');
    this.clearContainer('quintessences-container');
    this.clearContainer('backpack-container');
    this.clearContainer('statuses-container');
    this.clearContainer('theme-cards-container');
    
    // Add default empty inputs
    this.addCompanionPair();
    this.addQuintessenceInput();
    this.addBackpackInput();
    this.addStatusInput();
    this.addThemeCard();
    
    // Setup event listeners for the form
    this.setupFormEventListeners();
  }

  /**
   * Clear a container and add a default empty input
   */
  clearContainer(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Setup form event listeners
   */
  setupFormEventListeners() {
    // Remove existing event listeners first
    this.removeFormEventListeners();
    
    // Promise circles
    const promiseCircles = document.querySelectorAll('.promise-circle');
    promiseCircles.forEach(circle => {
      circle.addEventListener('click', this.promiseCircleHandler);
    });

    // Add buttons - use event delegation to avoid duplicate listeners
    const form = document.getElementById('character-form');
    if (form && !form.hasAttribute('data-event-listeners-setup')) {
      form.addEventListener('click', this.formClickHandler);
      form.setAttribute('data-event-listeners-setup', 'true');
    }
  }

  /**
   * Remove form event listeners
   */
  removeFormEventListeners() {
    // Remove promise circle listeners
    const promiseCircles = document.querySelectorAll('.promise-circle');
    promiseCircles.forEach(circle => {
      circle.removeEventListener('click', this.promiseCircleHandler);
    });

    // Remove form click listener
    const form = document.getElementById('character-form');
    if (form) {
      form.removeEventListener('click', this.formClickHandler);
      form.removeAttribute('data-event-listeners-setup');
    }
  }

  /**
   * Promise circle click handler
   */
  promiseCircleHandler = (event) => {
    const value = parseInt(event.target.dataset.value);
    this.setPromiseProgress(value);
  };

  /**
   * Form click handler for event delegation
   */
  formClickHandler = (event) => {
    const target = event.target;
    
    // Handle add buttons
    if (target.id === 'add-companion-btn') {
      this.addCompanionPair();
    } else if (target.id === 'add-quintessence-btn') {
      this.addQuintessenceInput();
    } else if (target.id === 'add-backpack-btn') {
      this.addBackpackInput();
    } else if (target.id === 'add-status-btn') {
      this.addStatusInput();
    } else if (target.id === 'add-theme-btn') {
      this.addThemeCard();
    }
  };

  /**
   * Set promise progress
   */
  setPromiseProgress(progress) {
    const circles = document.querySelectorAll('.promise-circle');
    circles.forEach((circle, index) => {
      const value = index + 1;
      if (value <= progress) {
        circle.classList.add('selected');
      } else {
        circle.classList.remove('selected');
      }
    });
  }

  /**
   * Add companion and relationship pair
   */
  addCompanionPair() {
    const container = document.getElementById('companions-container');
    if (!container) return;

    const pairDiv = document.createElement('div');
    pairDiv.className = 'companion-pair';
    pairDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    const companionInput = document.createElement('input');
    companionInput.type = 'text';
    companionInput.className = 'companion-input';
    companionInput.placeholder = 'Companion name';
    companionInput.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
    
    const relationshipInput = document.createElement('input');
    relationshipInput.type = 'text';
    relationshipInput.className = 'relationship-input';
    relationshipInput.placeholder = 'Relationship';
    relationshipInput.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.style.cssText = 'padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;';
    removeBtn.onclick = () => pairDiv.remove();
    
    pairDiv.appendChild(companionInput);
    pairDiv.appendChild(relationshipInput);
    pairDiv.appendChild(removeBtn);
    container.appendChild(pairDiv);
  }

  /**
   * Add quintessence input
   */
  addQuintessenceInput() {
    const container = document.getElementById('quintessences-container');
    if (!container) return;

    const inputDiv = document.createElement('div');
    inputDiv.className = 'quintessence-item';
    inputDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'quintessence-input';
    input.placeholder = 'Quintessence';
    input.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.style.cssText = 'padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;';
    removeBtn.onclick = () => inputDiv.remove();
    
    inputDiv.appendChild(input);
    inputDiv.appendChild(removeBtn);
    container.appendChild(inputDiv);
  }

  /**
   * Add backpack input
   */
  addBackpackInput() {
    const container = document.getElementById('backpack-container');
    if (!container) return;

    const inputDiv = document.createElement('div');
    inputDiv.className = 'backpack-item';
    inputDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'backpack-input';
    input.placeholder = 'Item name';
    input.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.style.cssText = 'padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;';
    removeBtn.onclick = () => inputDiv.remove();
    
    inputDiv.appendChild(input);
    inputDiv.appendChild(removeBtn);
    container.appendChild(inputDiv);
  }

  /**
   * Add status input
   */
  addStatusInput() {
    const container = document.getElementById('statuses-container');
    if (!container) return;

    const statusDiv = document.createElement('div');
    statusDiv.className = 'status-item';
    statusDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; border: 2px solid #d2b48c; border-radius: 4px; background: rgba(255, 255, 255, 0.8);';
    
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'status-name-input';
    nameInput.placeholder = 'Status name';
    nameInput.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.style.cssText = 'padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;';
    removeBtn.onclick = () => statusDiv.remove();
    
    headerDiv.appendChild(nameInput);
    headerDiv.appendChild(removeBtn);
    
    const trackDiv = document.createElement('div');
    trackDiv.style.cssText = 'display: flex; gap: 5px; align-items: center;';
    trackDiv.innerHTML = '<span style="font-weight: bold; margin-right: 10px;">Track:</span>';
    
              // Add track numbered boxes
     for (let i = 1; i <= 6; i++) {
       const trackBox = document.createElement('div');
       trackBox.className = 'status-track-box';
       trackBox.dataset.value = i;
       trackBox.textContent = i;
       trackBox.style.cssText = `
         width: 24px; 
         height: 24px; 
         border: 2px solid #8b4513; 
         border-radius: 4px; 
         display: inline-flex; 
         align-items: center; 
         justify-content: center; 
         margin-right: 8px; 
         cursor: pointer; 
         font-weight: bold; 
         font-size: 12px; 
         background-color: #f5f1e8; 
         color: #8b4513; 
         transition: all 0.2s ease;
       `;
       
       trackBox.onclick = () => {
         trackBox.classList.toggle('selected');
         if (trackBox.classList.contains('selected')) {
           trackBox.style.backgroundColor = '#8b4513';
           trackBox.style.color = '#f5f1e8';
         } else {
           trackBox.style.backgroundColor = '#f5f1e8';
           trackBox.style.color = '#8b4513';
         }
       };
       
       trackDiv.appendChild(trackBox);
     }
    
    statusDiv.appendChild(headerDiv);
    statusDiv.appendChild(trackDiv);
    container.appendChild(statusDiv);
  }

  /**
   * Add theme card
   */
  addThemeCard() {
    const container = document.getElementById('theme-cards-container');
    if (!container) return;

    const themeCard = document.createElement('div');
    themeCard.className = 'theme-card';
    themeCard.style.cssText = 'margin-bottom: 20px; border: 2px solid #d2b48c; border-radius: 8px; background: rgba(255, 255, 255, 0.9); overflow: hidden;';
    
    const header = document.createElement('div');
    header.className = 'theme-card-header';
    header.textContent = 'THEME CARD';
    header.style.cssText = 'background: #8b4513; color: white; padding: 10px; text-align: center; font-weight: bold; font-family: "Cinzel", serif;';
    
    const content = document.createElement('div');
    content.className = 'theme-card-content';
    content.style.cssText = 'padding: 15px;';
    
    // Theme Tag section
    const themeTagSection = this.createThemeSection('THEME TAG', 'theme-type-input', 'Enter theme tag');
    
    // Attributes section
    const attributesSection = this.createThemeAttributesSection();
    
    // Quest section
    const questSection = this.createThemeSection('QUEST', 'theme-quest-input', 'Enter quest description', 'textarea');
    
    // Tracks section
    const tracksSection = this.createThemeTracksSection();
    
    // Special improvements section
    const specialSection = this.createThemeSpecialImprovementsSection();
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-theme-btn';
    removeBtn.textContent = 'Remove Theme';
    removeBtn.style.cssText = 'width: 100%; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;';
    removeBtn.onclick = () => themeCard.remove();
    
    content.appendChild(themeTagSection);
    content.appendChild(attributesSection);
    content.appendChild(questSection);
    content.appendChild(tracksSection);
    content.appendChild(specialSection);
    content.appendChild(removeBtn);
    
    themeCard.appendChild(header);
    themeCard.appendChild(content);
    container.appendChild(themeCard);
  }

  /**
   * Create a theme section
   */
  createThemeSection(label, className, placeholder, type = 'input') {
    const section = document.createElement('div');
    section.className = 'theme-section';
    section.style.cssText = 'margin-bottom: 15px;';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
    
    let input;
    if (type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = 'text';
    }
    
    input.className = className;
    input.placeholder = placeholder;
    input.style.cssText = 'width: 100%; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit; box-sizing: border-box;';
    
    section.appendChild(labelElement);
    section.appendChild(input);
    return section;
  }

  /**
   * Create theme attributes section
   */
  createThemeAttributesSection() {
    const section = document.createElement('div');
    section.className = 'theme-attributes-section';
    section.style.cssText = 'margin-bottom: 15px;';
    
    const label = document.createElement('label');
    label.textContent = 'ATTRIBUTES';
    label.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
    
    const list = document.createElement('div');
    list.className = 'theme-attributes-list';
    list.style.cssText = 'margin-bottom: 10px;';
    
    // Add one default attribute
    const attributeItem = this.createThemeAttributeItem();
    list.appendChild(attributeItem);
    
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-attribute-btn';
    addBtn.textContent = 'Add Attribute';
    addBtn.style.cssText = 'padding: 8px 12px; background: #8bc34a; color: white; border: none; border-radius: 4px; cursor: pointer;';
    addBtn.onclick = () => {
      const newItem = this.createThemeAttributeItem();
      list.appendChild(newItem);
    };
    
    section.appendChild(label);
    section.appendChild(list);
    section.appendChild(addBtn);
    return section;
  }

  /**
   * Create theme attribute item
   */
  createThemeAttributeItem() {
    const item = document.createElement('div');
    item.className = 'theme-attribute-item';
    item.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'attribute-input';
    input.placeholder = 'Attribute name';
    input.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
    
    const typeDiv = document.createElement('div');
    typeDiv.className = 'attribute-type';
    typeDiv.style.cssText = 'display: flex; gap: 5px;';
    
         const positiveBtn = document.createElement('button');
     positiveBtn.type = 'button';
     positiveBtn.className = 'positive';
     positiveBtn.textContent = '+';
     positiveBtn.title = 'Positive attribute';
     positiveBtn.style.cssText = 'padding: 6px 10px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
     positiveBtn.onclick = () => {
       positiveBtn.classList.add('active');
       negativeBtn.classList.remove('active');
       negativeBtn.style.opacity = '0.5';
       positiveBtn.style.opacity = '1';
     };
     
     const negativeBtn = document.createElement('button');
     negativeBtn.type = 'button';
     negativeBtn.className = 'negative';
     negativeBtn.textContent = '-';
     negativeBtn.title = 'Negative attribute';
     negativeBtn.style.cssText = 'padding: 6px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
     negativeBtn.onclick = () => {
       negativeBtn.classList.add('active');
       positiveBtn.classList.remove('active');
       positiveBtn.style.opacity = '0.5';
       negativeBtn.style.opacity = '1';
     };
     
     const removeBtn = document.createElement('button');
     removeBtn.type = 'button';
     removeBtn.className = 'remove-btn';
     removeBtn.textContent = '×';
     removeBtn.style.cssText = 'padding: 6px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
    removeBtn.onclick = () => item.remove();
    
    typeDiv.appendChild(positiveBtn);
    typeDiv.appendChild(negativeBtn);
    
    item.appendChild(input);
    item.appendChild(typeDiv);
    item.appendChild(removeBtn);
    return item;
  }

  /**
   * Create theme tracks section
   */
  createThemeTracksSection() {
    const section = document.createElement('div');
    section.className = 'theme-tracks-section';
    section.style.cssText = 'margin-bottom: 15px;';
    
    const label = document.createElement('label');
    label.textContent = 'TRACKS';
    label.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
    
    const tracks = document.createElement('div');
    tracks.className = 'theme-tracks';
    tracks.style.cssText = 'display: flex; gap: 15px;';
    
    const trackNames = ['ABANDON', 'IMPROVE', 'MILESTONE'];
    trackNames.forEach(trackName => {
      const track = document.createElement('div');
      track.className = 'theme-track';
      track.style.cssText = 'flex: 1; text-align: center;';
      
      const name = document.createElement('div');
      name.className = 'theme-track-name';
      name.textContent = trackName;
      name.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #8b4513; font-size: 0.9em;';
      
      const pips = document.createElement('div');
      pips.className = 'theme-track-pips';
      pips.style.cssText = 'display: flex; gap: 5px; justify-content: center;';
      
             for (let i = 1; i <= 3; i++) {
         const pip = document.createElement('div');
         pip.className = 'theme-track-pip';
         pip.dataset.track = trackName.toLowerCase();
         pip.dataset.pip = i;
         pip.style.cssText = 'width: 20px; height: 20px; border: 2px solid #d2b48c; border-radius: 50%; cursor: pointer; background: white; transition: all 0.2s ease;';
                   pip.onclick = () => {
            const trackPips = pips.querySelectorAll('.theme-track-pip');
            const clickedValue = i;
            
            // If clicking a filled pip, clear all pips (set to 0)
            if (pip.classList.contains('filled')) {
              trackPips.forEach(p => {
                p.classList.remove('filled');
                p.style.backgroundColor = 'white';
              });
            } else {
              // Fill pips up to the clicked value
              trackPips.forEach((p, index) => {
                const pipValue = index + 1;
                if (pipValue <= clickedValue) {
                  p.classList.add('filled');
                  p.style.backgroundColor = '#8b4513';
                } else {
                  p.classList.remove('filled');
                  p.style.backgroundColor = 'white';
                }
              });
            }
          };
         pips.appendChild(pip);
       }
      
      track.appendChild(name);
      track.appendChild(pips);
      tracks.appendChild(track);
    });
    
    section.appendChild(label);
    section.appendChild(tracks);
    return section;
  }

  /**
   * Create theme special improvements section
   */
  createThemeSpecialImprovementsSection() {
    const section = document.createElement('div');
    section.className = 'theme-special-improvements-section';
    section.style.cssText = 'margin-bottom: 15px;';
    
    const label = document.createElement('label');
    label.textContent = 'SPECIAL IMPROVEMENTS';
    label.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
    
    const list = document.createElement('div');
    list.className = 'theme-special-improvements-list';
    list.style.cssText = 'margin-bottom: 10px;';
    
    // Add one default improvement
    const improvementItem = this.createThemeSpecialImprovementItem();
    list.appendChild(improvementItem);
    
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-special-improvement-btn';
    addBtn.textContent = 'Add Special Improvement';
    addBtn.style.cssText = 'padding: 8px 12px; background: #8bc34a; color: white; border: none; border-radius: 4px; cursor: pointer;';
    addBtn.onclick = () => {
      const newItem = this.createThemeSpecialImprovementItem();
      list.appendChild(newItem);
    };
    
    section.appendChild(label);
    section.appendChild(list);
    section.appendChild(addBtn);
    return section;
  }

  /**
   * Create theme special improvement item
   */
  createThemeSpecialImprovementItem() {
    const item = document.createElement('div');
    item.className = 'theme-special-improvement-item';
    item.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'special-improvement-input';
    input.placeholder = 'Special improvement';
    input.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.style.cssText = 'padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;';
    removeBtn.onclick = () => item.remove();
    
    item.appendChild(input);
    item.appendChild(removeBtn);
    return item;
  }

  /**
   * Handle saving character
   */
  handleSaveCharacter() {
    console.log('=== DEBUG: handleSaveCharacter called ===');
    const form = document.getElementById('character-form');
    if (!form) {
      console.error('Character form not found!');
      return;
    }

    const formData = new FormData(form);
    const characterName = formData.get('characterName').trim();
    const playerName = formData.get('playerName').trim();
    const notes = formData.get('notes').trim();

    if (!characterName) {
      this.gameClient.uiManager.showError('Please enter a character name');
      return;
    }

    // Get Promise value from selected circle - save as object to match mike1.json structure
    const selectedPromiseCircle = form.querySelector('.promise-circle.selected');
    const promiseProgress = selectedPromiseCircle ? parseInt(selectedPromiseCircle.dataset.value) : 1;
    const promise = { progress: promiseProgress };

    // Get companions and their relationships - they should be paired
    const companions = {};
    const companionInputs = form.querySelectorAll('.companion-input');
    const relationshipInputs = form.querySelectorAll('.relationship-input');
    
    // Pair companions with their relationships
    companionInputs.forEach((input, index) => {
      const companionName = input.value.trim();
      const relationshipName = relationshipInputs[index] ? relationshipInputs[index].value.trim() : '';
      
      if (companionName) {
        companions[companionName] = relationshipName || 'Unknown';
      }
    });

    // Get quintessences
    const quintessences = [];
    const quintessenceInputs = form.querySelectorAll('.quintessence-input');
    quintessenceInputs.forEach(input => {
      const value = input.value.trim();
      if (value) quintessences.push(value);
    });

    // Get backpack items
    const backpack = [];
    const backpackInputs = form.querySelectorAll('.backpack-input');
    backpackInputs.forEach(input => {
      const value = input.value.trim();
      if (value) backpack.push(value);
    });

         // Get statuses
     const statuses = {};
     const statusItems = form.querySelectorAll('.status-item');
     statusItems.forEach(item => {
       const nameInput = item.querySelector('.status-name-input');
       const name = nameInput.value.trim();
       if (name) {
         const selectedBoxes = item.querySelectorAll('.status-track-box.selected');
         const checkedValues = [];
         selectedBoxes.forEach(box => {
           checkedValues.push(parseInt(box.dataset.value));
         });
         const trackValue = checkedValues.length > 0 ? Math.max(...checkedValues) : 0;
         
         statuses[name] = { 
           isStatus: true, 
           trackValue: trackValue,
           checkedValues: checkedValues
         };
       }
     });

    // Get theme cards
    const themeCards = [];
    const themeCardElements = form.querySelectorAll('.theme-card');
    themeCardElements.forEach(themeCard => {
      const themeData = this.collectThemeCardData(themeCard);
      if (themeData) {
        themeCards.push(themeData);
      }
    });

    // Create character data - structure to match mike1.json
    const contents = {
      characterName: characterName,
      playerName: playerName,
      promise: promise,
      themeCards: themeCards,
      notes: notes
    };

    const tags = {
      // Store companions with their relationships - match mike1.json structure
      companions: Object.keys(companions).reduce((acc, companionName) => {
        acc[companionName] = { 
          modifier: 1,
          addedBy: this.gameClient.currentPlayer?.name || 'Unknown',
          isCompanion: true, 
          relationship: companions[companionName] 
        };
        return acc;
      }, {}),
      quintessences: quintessences.reduce((acc, quintessence) => {
        acc[quintessence] = { 
          modifier: 0,
          addedBy: this.gameClient.currentPlayer?.name || 'Unknown',
          isQuintessence: true 
        };
        return acc;
      }, {}),
      backpack: backpack.reduce((acc, item) => {
        acc[item] = { 
          modifier: 1,
          scratched: false,
          addedBy: this.gameClient.currentPlayer?.name || 'Unknown',
          isBackpackItem: true 
        };
        return acc;
      }, {}),
      // Store statuses directly in tags (not under tags.statuses) to match mike1.json
      ...Object.keys(statuses).reduce((acc, statusName) => {
        acc[statusName] = {
          ...statuses[statusName],
          modifier: statuses[statusName].trackValue || 0,
          scratched: false,
          addedBy: this.gameClient.currentPlayer?.name || 'Unknown'
        };
        return acc;
      }, {}),
      // Store theme attributes - match mike1.json structure
      ...themeCards.reduce((acc, themeCard, index) => {
        themeCard.attributes.forEach(attr => {
          const tagName = `${themeCard.type}: ${attr.name}`;
          acc[tagName] = {
            modifier: attr.effect === 'positive' ? 1 : -1,
            addedBy: this.gameClient.currentPlayer?.name || 'Unknown',
            themeCardIndex: index,
            attributeName: attr.name,
            effect: attr.effect
          };
        });
        return acc;
      }, {})
    };

    console.log('Contents to save:', contents);
    console.log('Tags to save:', tags);
    
    if (this.editingCharacterId) {
      console.log('Updating existing character:', this.editingCharacterId);
      // Update existing character
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.UPDATE_OBJECT,
        objectType: OBJECT_TYPES.CHARACTER,
        objectId: this.editingCharacterId,
        contents: contents,
        tags: tags
      });
    } else {
      console.log('Creating new character');
      // Create new character
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.CREATE_OBJECT,
        objectType: OBJECT_TYPES.CHARACTER,
        contents: contents,
        tags: tags
      });
    }

    this.hideCharacterCreation();
  }

  /**
   * Collect theme card data from DOM element
   */
  collectThemeCardData(themeCard) {
    const typeInput = themeCard.querySelector('.theme-type-input');
    const questInput = themeCard.querySelector('.theme-quest-input');
    
    if (!typeInput || !questInput) return null;

    const type = typeInput.value.trim();
    const quest = questInput.value.trim();

    // Collect attributes
    const attributes = [];
    const attributeItems = themeCard.querySelectorAll('.theme-attribute-item');
    attributeItems.forEach(item => {
      const input = item.querySelector('.attribute-input');
      const positiveBtn = item.querySelector('.positive');
      const negativeBtn = item.querySelector('.negative');
      
      if (input && input.value.trim()) {
        const attributeName = input.value.trim();
        let effect = 'positive'; // default
        if (positiveBtn && positiveBtn.classList.contains('active')) {
          effect = 'positive';
        } else if (negativeBtn && negativeBtn.classList.contains('active')) {
          effect = 'negative';
        }
        
        attributes.push({
          name: attributeName,
          effect: effect
        });
      }
    });

    // Collect special improvements
    const specialImprovements = [];
    const specialImprovementItems = themeCard.querySelectorAll('.theme-special-improvement-item');
    specialImprovementItems.forEach(item => {
      const input = item.querySelector('.special-improvement-input');
      if (input && input.value.trim()) {
        specialImprovements.push(input.value.trim());
      }
    });

    // Collect track progress
    const tracks = {
      abandon: 0,
      improve: 0,
      milestone: 0
    };

    Object.keys(tracks).forEach(trackName => {
      const filledPips = themeCard.querySelectorAll(`.theme-track-pip[data-track="${trackName}"].filled`).length;
      tracks[trackName] = filledPips;
    });

    return {
      type: type,
      attributes: attributes,
      quest: quest,
      specialImprovements: specialImprovements,
      tracks: tracks
    };
  }

  /**
   * Handle editing character
   * @param {string} characterId - Character ID to edit
   */
  handleEditCharacter(characterId) {
    const character = this.gameClient.gameState?.gameObjects?.find(obj => obj.id === characterId);
    if (!character) return;

    this.editingCharacterId = characterId;
    this.gameClient.modalManager.setupModalEventListeners();
    this.gameClient.modalManager.showModal('character-creation-overlay');

    // Populate form with character data
    this.populateCharacterForm(character);
  }

  /**
   * Populate character form with existing data
   */
  populateCharacterForm(character) {
    console.log('=== DEBUG: populateCharacterForm called ===');
    console.log('Character object:', character);
    
    const form = document.getElementById('character-form');
    if (!form) {
      console.error('Character form not found!');
      return;
    }

    form.reset();
    const charData = character.contents || character || {};
    const tags = character.tags || {};
    
    console.log('CharData:', charData);
    console.log('Tags:', tags);
    
    // Basic info
    form.querySelector('[name="characterName"]').value = charData.characterName || charData.name || '';
    form.querySelector('[name="playerName"]').value = charData.playerName || '';
    form.querySelector('[name="notes"]').value = charData.notes || '';
    
    // Set Promise circle - handle both object and number formats
    let promiseValue = 1;
    if (charData.promise) {
      if (typeof charData.promise === 'object' && charData.promise.progress !== undefined) {
        promiseValue = charData.promise.progress;
      } else if (typeof charData.promise === 'number') {
        promiseValue = charData.promise;
      }
    }
    this.setPromiseProgress(promiseValue);
    
    // Populate companions and their relationships
    let companions = [];
    let relationships = [];
    
    console.log('Looking for companions in tags.companions:', tags.companions);
    console.log('Looking for companions in charData.companions:', charData.companions);
    
    // Check tags.companions first (as per mike1.json structure)
    if (tags.companions && typeof tags.companions === 'object') {
      Object.keys(tags.companions).forEach(companionName => {
        companions.push(companionName);
        const companionData = tags.companions[companionName];
        relationships.push(companionData.relationship || '');
      });
    } else if (charData.companions && typeof charData.companions === 'object') {
      // Fallback to charData.companions if tags.companions doesn't exist
      Object.keys(charData.companions).forEach(companionName => {
        companions.push(companionName);
        relationships.push(charData.companions[companionName] || '');
      });
    }
    
    console.log('Found companions:', companions);
    console.log('Found relationships:', relationships);
    
    // Clear and populate companions
    this.clearContainer('companions-container');
    console.log('Populating companions:', companions);
    if (companions.length > 0) {
      companions.forEach((companion, index) => {
        this.addCompanionPair();
        const container = document.getElementById('companions-container');
        const pairs = container.querySelectorAll('.companion-pair');
        const lastPair = pairs[pairs.length - 1];
        if (lastPair) {
          const companionInput = lastPair.querySelector('.companion-input');
          const relationshipInput = lastPair.querySelector('.relationship-input');
          console.log(`Setting companion input "${companionInput?.id || 'no-id'}" to:`, companion);
          console.log(`Setting relationship input "${relationshipInput?.id || 'no-id'}" to:`, relationships[index]);
          if (companionInput) companionInput.value = companion;
          if (relationshipInput && relationships[index]) {
            relationshipInput.value = relationships[index];
          }
        } else {
          console.error('No companion pair found after adding');
        }
      });
    } else {
      this.addCompanionPair();
    }
    
    // Populate quintessences - check tags.quintessences first
    let quintessences = [];
    console.log('Looking for quintessences in tags.quintessences:', tags.quintessences);
    console.log('Looking for quintessences in charData.quintessences:', charData.quintessences);
    
    if (tags.quintessences && Object.keys(tags.quintessences).length > 0) {
      quintessences = Object.keys(tags.quintessences);
    } else if (charData.quintessences && Array.isArray(charData.quintessences)) {
      quintessences = charData.quintessences;
    }
    
    console.log('Found quintessences:', quintessences);
    
    this.clearContainer('quintessences-container');
    if (quintessences.length > 0) {
      quintessences.forEach(quintessence => {
        this.addQuintessenceInput();
        const container = document.getElementById('quintessences-container');
        const items = container.querySelectorAll('.quintessence-item');
        const lastItem = items[items.length - 1];
        if (lastItem) {
          lastItem.querySelector('.quintessence-input').value = quintessence;
        }
      });
    } else {
      this.addQuintessenceInput();
    }
    
    // Populate backpack - check tags.backpack first
    let backpack = [];
    console.log('Looking for backpack in tags.backpack:', tags.backpack);
    console.log('Looking for backpack in charData.backpack:', charData.backpack);
    
    if (tags.backpack && Object.keys(tags.backpack).length > 0) {
      backpack = Object.keys(tags.backpack);
    } else if (charData.backpack && Array.isArray(charData.backpack)) {
      backpack = charData.backpack;
    }
    
    console.log('Found backpack:', backpack);
    
    this.clearContainer('backpack-container');
    if (backpack.length > 0) {
      backpack.forEach(item => {
        this.addBackpackInput();
        const container = document.getElementById('backpack-container');
        const items = container.querySelectorAll('.backpack-item');
        const lastItem = items[items.length - 1];
        if (lastItem) {
          lastItem.querySelector('.backpack-input').value = item;
        }
      });
    } else {
      this.addBackpackInput();
    }
    
    // Populate statuses - check for statuses directly in tags (as per mike1.json)
    let statuses = [];
    console.log('Looking for statuses in tags:', tags);
    
    Object.entries(tags).forEach(([tagName, tagData]) => {
      console.log(`Checking tag "${tagName}":`, tagData);
      if (tagData && tagData.isStatus === true) {
        console.log(`Found status: ${tagName}`);
        statuses.push({
          name: tagName,
          trackValue: tagData.trackValue || 0,
          checkedValues: tagData.checkedValues || []
        });
      }
    });
    
    // Also check tags.statuses as fallback
    if (statuses.length === 0 && tags.statuses) {
      console.log('No statuses found in tags, checking tags.statuses:', tags.statuses);
      Object.keys(tags.statuses).forEach(statusName => {
        const statusData = tags.statuses[statusName];
        statuses.push({
          name: statusName,
          trackValue: statusData.trackValue || 0,
          checkedValues: statusData.checkedValues || []
        });
      });
    }
    
    console.log('Found statuses:', statuses);
    
    this.clearContainer('statuses-container');
    if (statuses.length > 0) {
      statuses.forEach(status => {
        this.addStatusInput();
        const container = document.getElementById('statuses-container');
        const items = container.querySelectorAll('.status-item');
        const lastItem = items[items.length - 1];
                 if (lastItem) {
           lastItem.querySelector('.status-name-input').value = status.name;
           status.checkedValues.forEach(value => {
             const trackBox = lastItem.querySelector(`.status-track-box[data-value="${value}"]`);
             if (trackBox) {
               trackBox.classList.add('selected');
               trackBox.style.backgroundColor = '#8b4513';
               trackBox.style.color = '#f5f1e8';
             }
           });
         }
      });
    } else {
      this.addStatusInput();
    }
    
    // Populate theme cards
    let themeCards = charData.themeCards || [];
    
    this.clearContainer('theme-cards-container');
    if (themeCards.length > 0) {
      themeCards.forEach(themeCard => {
        this.addThemeCard();
        const container = document.getElementById('theme-cards-container');
        const cards = container.querySelectorAll('.theme-card');
        const lastCard = cards[cards.length - 1];
        if (lastCard) {
          this.populateThemeCard(lastCard, themeCard);
        }
      });
    } else {
      this.addThemeCard();
    }
    
         // Event listeners are already set up in resetCharacterForm()
   }

  /**
   * Populate a theme card with data
   */
  populateThemeCard(themeCardElement, themeData) {
    // Set type
    const typeInput = themeCardElement.querySelector('.theme-type-input');
    if (typeInput) {
      typeInput.value = themeData.type || '';
    }
    
    // Set quest
    const questInput = themeCardElement.querySelector('.theme-quest-input');
    if (questInput) {
      questInput.value = themeData.quest || '';
    }
    
    // Clear and populate attributes
    const attributesList = themeCardElement.querySelector('.theme-attributes-list');
    if (attributesList) {
      attributesList.innerHTML = '';
               if (themeData.attributes && themeData.attributes.length > 0) {
           themeData.attributes.forEach(attr => {
             const attributeItem = this.createThemeAttributeItem();
             attributeItem.querySelector('.attribute-input').value = attr.name;
             if (attr.effect === 'positive') {
               const positiveBtn = attributeItem.querySelector('.positive');
               const negativeBtn = attributeItem.querySelector('.negative');
               positiveBtn.classList.add('active');
               positiveBtn.style.opacity = '1';
               negativeBtn.style.opacity = '0.5';
             } else if (attr.effect === 'negative') {
               const positiveBtn = attributeItem.querySelector('.positive');
               const negativeBtn = attributeItem.querySelector('.negative');
               negativeBtn.classList.add('active');
               negativeBtn.style.opacity = '1';
               positiveBtn.style.opacity = '0.5';
             }
             attributesList.appendChild(attributeItem);
           });
      } else {
        attributesList.appendChild(this.createThemeAttributeItem());
      }
    }
    
    // Clear and populate special improvements
    const specialList = themeCardElement.querySelector('.theme-special-improvements-list');
    if (specialList) {
      specialList.innerHTML = '';
      if (themeData.specialImprovements && themeData.specialImprovements.length > 0) {
        themeData.specialImprovements.forEach(improvement => {
          const improvementItem = this.createThemeSpecialImprovementItem();
          improvementItem.querySelector('.special-improvement-input').value = improvement;
          specialList.appendChild(improvementItem);
        });
      } else {
        specialList.appendChild(this.createThemeSpecialImprovementItem());
      }
    }
    
         // Set track pips
     if (themeData.tracks) {
       Object.keys(themeData.tracks).forEach(trackName => {
         const filledCount = themeData.tracks[trackName];
         for (let i = 1; i <= 3; i++) {
           const pip = themeCardElement.querySelector(`.theme-track-pip[data-track="${trackName}"][data-pip="${i}"]`);
           if (pip) {
             if (i <= filledCount) {
               pip.classList.add('filled');
               pip.style.backgroundColor = '#8b4513';
             } else {
               pip.classList.remove('filled');
               pip.style.backgroundColor = 'white';
             }
           }
         }
       });
     }
  }

  /**
   * Handle deleting character
   * @param {string} characterId - Character ID to delete
   */
  handleDeleteCharacter(characterId) {
    if (confirm('Are you sure you want to delete this character?')) {
      this.gameClient.webSocketManager.sendGameAction({
        type: ACTION_TYPES.DELETE_OBJECT,
        objectType: OBJECT_TYPES.CHARACTER,
        objectId: characterId
      });
    }
  }

  /**
   * Update characters list display
   * @param {Array} characters - Array of character objects
   */
  updateCharactersList(characters = []) {
    const charactersList = document.getElementById('characters-list');
    if (!charactersList) return;

    charactersList.innerHTML = '';

    // Filter characters based on player permissions
    let visibleCharacters = characters;
    if (!this.gameClient.sessionManager.isCurrentPlayerGM()) {
      // Non-GM players only see their own characters
      const currentPlayerName = this.gameClient.sessionManager.getCurrentPlayer()?.name;
      visibleCharacters = characters.filter(char => 
        char.contents?.playerName === currentPlayerName
      );
    }

    if (visibleCharacters.length === 0) {
      const message = this.gameClient.sessionManager.isCurrentPlayerGM() 
        ? 'No characters created yet'
        : 'You haven\'t created any characters yet';
      charactersList.innerHTML = `<p class="empty-state">${message}</p>`;
      return;
    }

    visibleCharacters.forEach(character => {
      const characterElement = this.createCharacterElement(character);
      charactersList.appendChild(characterElement);
    });
  }

  /**
   * Create character element for display
   * @param {Object} character - Character object
   * @returns {HTMLElement} Character element
   */
  createCharacterElement(character) {
    const charData = character.contents || character || {};
    const tags = charData.tags || {};
    
    const element = document.createElement('div');
    element.className = 'character-card';
    
    const name = document.createElement('h4');
    name.textContent = charData.characterName || charData.name || 'Unnamed Character';
    
    const player = document.createElement('p');
    player.textContent = `Player: ${charData.playerName || 'Unknown'}`;
    player.style.cssText = 'color: #666; margin-bottom: 10px; font-size: 0.9em;';
    
    const actions = document.createElement('div');
    actions.className = 'character-card-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    viewBtn.className = 'btn btn-primary btn-small';
    viewBtn.onclick = () => this.viewCharacter(character.id);
    
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'btn btn-secondary btn-small';
    editBtn.onclick = () => this.handleEditCharacter(character.id);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.onclick = () => this.handleDeleteCharacter(character.id);
    
    actions.appendChild(viewBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    element.appendChild(name);
    element.appendChild(player);
    element.appendChild(actions);
    
    // Add character tags sections
    this.addCharacterTagsToElement(element, tags);
    
    return element;
  }

  /**
   * Add character tags to display element
   * @param {HTMLElement} element - Character element
   * @param {Object} tags - Character tags
   */
  addCharacterTagsToElement(element, tags) {
    // Add quintessences and backpack
    Object.entries(tags).forEach(([tagType, tagGroup]) => {
      if (typeof tagGroup === 'object' && Object.keys(tagGroup).length > 0) {
        if (tagType === 'quintessences' || tagType === 'backpack') {
          const tagTypeName = tagType.charAt(0).toUpperCase() + tagType.slice(1);
          
          const tagsSection = document.createElement('div');
          tagsSection.className = 'character-tags-section';
          
          const sectionTitle = document.createElement('h6');
          sectionTitle.textContent = tagTypeName;
          tagsSection.appendChild(sectionTitle);
          
          const tagsContainer = document.createElement('div');
          tagsContainer.className = 'character-tags';
          
          Object.keys(tagGroup).forEach(tagName => {
            const tagElement = this.gameClient.tagSystem.createTagElement(tagName);
            tagsContainer.appendChild(tagElement);
          });
          
          tagsSection.appendChild(tagsContainer);
          element.appendChild(tagsSection);
        }
      }
    });

    // Handle status tags
    const statusTags = [];
    Object.entries(tags).forEach(([tagName, tagData]) => {
      if (tagData && tagData.isStatus) {
        statusTags.push({ 
          name: tagName, 
          trackValue: tagData.trackValue || 0,
          checkedValues: tagData.checkedValues || []
        });
      }
    });
    
    if (statusTags.length > 0) {
      const statusSection = document.createElement('div');
      statusSection.className = 'character-tags-section';
      
      const sectionTitle = document.createElement('h6');
      sectionTitle.textContent = 'STATUSES';
      statusSection.appendChild(sectionTitle);
      
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'character-tags';
      
      statusTags.forEach(status => {
        const tagElement = this.gameClient.tagSystem.createTagElement(status.name);
        tagsContainer.appendChild(tagElement);
      });
      
      statusSection.appendChild(tagsContainer);
      element.appendChild(statusSection);
    }
    
    // Handle companions and relationships as linked pairs
    if (tags.companions && tags.relationships && 
        Object.keys(tags.companions).length > 0 && Object.keys(tags.relationships).length > 0) {
      
      const companions = Object.keys(tags.companions);
      const relationships = Object.keys(tags.relationships);
      
      const relationshipsSection = document.createElement('div');
      relationshipsSection.className = 'character-tags-section';
      
      const sectionTitle = document.createElement('h6');
      sectionTitle.textContent = 'RELATIONSHIPS';
      relationshipsSection.appendChild(sectionTitle);
      
      const relationshipsTable = document.createElement('div');
      relationshipsTable.className = 'relationships-table';
      
      const pairs = Math.min(companions.length, relationships.length);
      for (let i = 0; i < pairs; i++) {
        const pairRow = document.createElement('div');
        pairRow.className = 'relationship-pair';
        
        const companionCell = document.createElement('div');
        companionCell.className = 'companion-name';
        companionCell.textContent = companions[i];
        
        const relationshipCell = document.createElement('div');
        relationshipCell.className = 'relationship-tag';
        const tagElement = this.gameClient.tagSystem.createTagElement(relationships[i]);
        relationshipCell.appendChild(tagElement);
        
        pairRow.appendChild(companionCell);
        pairRow.appendChild(relationshipCell);
        relationshipsTable.appendChild(pairRow);
      }
      
      relationshipsSection.appendChild(relationshipsTable);
      element.appendChild(relationshipsSection);
    }
  }

  /**
   * View character details in overlay
   * @param {string} characterId - Character ID to view
   */
  viewCharacter(characterId) {
    const character = this.gameClient.gameState?.gameObjects?.find(obj => obj.id === characterId);
    if (!character) return;

    const charData = character.contents || character || {};
    const tags = character.tags || {}; // Tags are at the character level, not in contents
    
    // Debug logging
    console.log('Character ID:', characterId);
    console.log('Character object:', character);
    console.log('Character data:', charData);
    console.log('Character tags:', tags);
    console.log('Theme cards:', charData.themeCards);
    
    // Show the overlay
    const overlay = document.getElementById('character-viewing-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('show');
    
    // Populate character basic info
    document.getElementById('character-viewing-name').textContent = charData.characterName || charData.name || 'Unnamed';
    document.getElementById('character-viewing-player').textContent = charData.playerName || 'Unknown';
    
    // Populate promise progress
    this.populatePromiseProgress(charData.promise);
    
    // Populate character tags
    this.populateCharacterTags(tags);
    
    // Populate theme cards
    this.populateThemeCards(charData.themeCards);
    
    // Populate notes
    this.populateNotes(charData.notes);
    
    // Setup close button
    this.setupCharacterViewingClose();
  }

  /**
   * Populate promise progress circles
   * @param {Object} promise - Promise data
   */
  populatePromiseProgress(promise) {
    const promiseContainer = document.getElementById('character-viewing-promise');
    promiseContainer.innerHTML = '';
    
    const progress = promise?.progress || 0;
    
    for (let i = 1; i <= 5; i++) {
      const circle = document.createElement('div');
      circle.className = 'promise-circle';
      circle.dataset.value = i;
      
      if (i <= progress) {
        circle.classList.add('filled');
      }
      
      promiseContainer.appendChild(circle);
    }
  }

  /**
   * Populate character tags in the viewing overlay
   * @param {Object} tags - Character tags
   */
  populateCharacterTags(tags) {
    // Quintessences
    this.populateTagSection('character-viewing-quintessences', tags.quintessences || {});
    
    // Companions and relationships
    this.populateCompanionsSection(tags.companions || {});
    
    // Backpack items
    this.populateTagSection('character-viewing-backpack', tags.backpack || {});
    
    // Statuses
    this.populateStatusesSection(tags);
  }

  /**
   * Populate a tag section
   * @param {string} sectionId - Section element ID
   * @param {Object} tagData - Tag data
   */
  populateTagSection(sectionId, tagData) {
    const section = document.getElementById(sectionId);
    const container = section.querySelector('.character-tags-container');
    container.innerHTML = '';
    
    const tagNames = Object.keys(tagData);
    if (tagNames.length === 0) {
      container.innerHTML = '<p style="color: #558b2f; font-style: italic;">None</p>';
      return;
    }
    
    tagNames.forEach(tagName => {
      const tagElement = this.gameClient.tagSystem.createTagElement(tagName);
      container.appendChild(tagElement);
    });
  }

  /**
   * Populate companions and relationships section
   * @param {Object} companions - Companions data with relationships
   */
  populateCompanionsSection(companions) {
    const section = document.getElementById('character-viewing-companions');
    const container = section.querySelector('.relationships-container');
    container.innerHTML = '';
    
    const companionEntries = Object.entries(companions);
    
    if (companionEntries.length === 0) {
      container.innerHTML = '<p style="color: #558b2f; font-style: italic;">None</p>';
      return;
    }
    
    companionEntries.forEach(([companionName, companionData]) => {
      const pairRow = document.createElement('div');
      pairRow.className = 'relationship-pair';
      
      const companionCell = document.createElement('div');
      companionCell.className = 'companion-name';
      companionCell.textContent = companionName;
      
      const relationshipCell = document.createElement('div');
      relationshipCell.className = 'relationship-tag';
      const relationshipName = companionData.relationship || 'Unknown';
      const tagElement = this.gameClient.tagSystem.createTagElement(relationshipName);
      relationshipCell.appendChild(tagElement);
      
      pairRow.appendChild(companionCell);
      pairRow.appendChild(relationshipCell);
      container.appendChild(pairRow);
    });
  }

  /**
   * Populate statuses section with leaf styling
   * @param {Object} tags - All character tags
   */
  populateStatusesSection(tags) {
    const section = document.getElementById('character-viewing-statuses');
    const container = section.querySelector('.statuses-container');
    container.innerHTML = '';
    
    console.log('Processing statuses from tags:', tags);
    
    const statusTags = [];
    Object.entries(tags).forEach(([tagName, tagData]) => {
      if (tagData && tagData.isStatus) {
        statusTags.push({
          name: tagName,
          data: tagData
        });
      }
    });
    
    console.log('Found status tags:', statusTags);
    
    if (statusTags.length === 0) {
      container.innerHTML = '<p style="color: #558b2f; font-style: italic;">None</p>';
      return;
    }
    
    statusTags.forEach(status => {
      const statusLeaf = document.createElement('div');
      statusLeaf.className = 'status-leaf';
      
      // Display status name with track value (e.g., "Wounded-4")
      const trackValue = status.data.trackValue || 0;
      statusLeaf.textContent = `${status.name}-${trackValue}`;
      
      if (status.data.scratched) {
        statusLeaf.classList.add('scratched');
      }
      
      // Make status leaf clickable for tag context menu
      this.gameClient.tagSystem.setupTagContextMenu(statusLeaf, status.name);
      
      container.appendChild(statusLeaf);
    });
  }

  /**
   * Populate theme cards section
   * @param {Array} themeCards - Array of theme card objects
   */
  populateThemeCards(themeCards) {
    const section = document.getElementById('character-viewing-themes');
    const container = section.querySelector('.theme-cards-container');
    container.innerHTML = '';
    
    console.log('Populating theme cards with:', themeCards);
    
    if (!themeCards || themeCards.length === 0) {
      container.innerHTML = '<p style="color: #558b2f; font-style: italic;">None</p>';
      return;
    }
    
    themeCards.forEach((themeCard, themeIndex) => {
      const themeElement = document.createElement('div');
      themeElement.className = 'theme-card';
      
      // Create theme tag as a clickable tag element
      const themeTagContainer = document.createElement('div');
      themeTagContainer.style.cssText = 'margin-bottom: 8px;';
      
      if (themeCard.type) {
        const themeTagElement = window.gameClient.tagSystem.createTagElement(themeCard.type);
        themeTagContainer.appendChild(themeTagElement);
      } else {
        const themeTitle = document.createElement('h5');
        themeTitle.textContent = themeCard.themeName || 'Unnamed Theme';
        themeTagContainer.appendChild(themeTitle);
      }
      
      themeElement.appendChild(themeTagContainer);
      
      // Add quest information if available
      if (themeCard.quest) {
        const questElement = document.createElement('p');
        questElement.style.cssText = 'color: #558b2f; font-style: italic; margin: 8px 0; font-size: 0.9rem;';
        questElement.textContent = themeCard.quest;
        themeElement.appendChild(questElement);
      }
      
      // Add attributes as tags if available
      if (themeCard.attributes && themeCard.attributes.length > 0) {
        const attributesContainer = document.createElement('div');
        attributesContainer.className = 'theme-attributes';
        attributesContainer.style.cssText = 'margin: 12px 0;';
        
        const attributesTitle = document.createElement('h6');
        attributesTitle.textContent = 'Attributes:';
        attributesTitle.style.cssText = 'color: #2c5530; font-size: 0.9rem; margin: 8px 0; font-family: "Crimson Text", serif;';
        attributesContainer.appendChild(attributesTitle);
        
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'tags';
        tagsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
        
                             themeCard.attributes.forEach(attribute => {
          // Create tag text for display (without theme type since it's already in the card header)
          const tagText = attribute.name;
          
          // Use TagSystem to create the tag element
          const tagElement = window.gameClient.tagSystem.createTagElement(tagText);
          tagsContainer.appendChild(tagElement);
        });
        
        attributesContainer.appendChild(tagsContainer);
        themeElement.appendChild(attributesContainer);
      }
      
      const tracksContainer = document.createElement('div');
      tracksContainer.className = 'theme-tracks';
      
      // Add abandon track
      if (themeCard.tracks?.abandon !== undefined) {
        const abandonTrack = this.createThemeTrack('ABANDON', themeCard.tracks.abandon);
        tracksContainer.appendChild(abandonTrack);
      }
      
      // Add improve track
      if (themeCard.tracks?.improve !== undefined) {
        const improveTrack = this.createThemeTrack('IMPROVE', themeCard.tracks.improve);
        tracksContainer.appendChild(improveTrack);
      }
      
      // Add milestone track
      if (themeCard.tracks?.milestone !== undefined) {
        const milestoneTrack = this.createThemeTrack('MILESTONE', themeCard.tracks.milestone);
        tracksContainer.appendChild(milestoneTrack);
      }
      
      themeElement.appendChild(tracksContainer);
      container.appendChild(themeElement);
    });
  }

  /**
   * Create a theme track element
   * @param {string} trackName - Track name
   * @param {number} trackValue - Track value
   * @returns {HTMLElement} Track element
   */
  createThemeTrack(trackName, trackValue) {
    const trackElement = document.createElement('div');
    trackElement.className = 'theme-track';
    
    const trackNameElement = document.createElement('div');
    trackNameElement.className = 'theme-track-name';
    trackNameElement.textContent = trackName;
    trackElement.appendChild(trackNameElement);
    
    const pipsContainer = document.createElement('div');
    pipsContainer.className = 'theme-track-pips';
    
    // Create 3 pips for each track
    for (let i = 1; i <= 3; i++) {
      const pip = document.createElement('div');
      pip.className = 'theme-track-pip';
      pip.dataset.pip = i;
      
      if (i <= trackValue) {
        pip.classList.add('filled');
      }
      
      pipsContainer.appendChild(pip);
    }
    
    trackElement.appendChild(pipsContainer);
    return trackElement;
  }

  /**
   * Populate character notes
   * @param {string} notes - Character notes
   */
  populateNotes(notes) {
    const notesText = document.getElementById('character-viewing-notes-text');
    notesText.textContent = notes || 'No notes available.';
  }

  /**
   * Setup character viewing close functionality
   */
  setupCharacterViewingClose() {
    const closeBtn = document.getElementById('close-character-viewing');
    const overlay = document.getElementById('character-viewing-overlay');
    
    const closeOverlay = () => {
      overlay.classList.remove('show');
      overlay.classList.add('hidden');
    };
    
    // Remove existing listeners to prevent duplicates
    closeBtn.removeEventListener('click', closeOverlay);
    overlay.removeEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
    
    // Add new listeners
    closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
  }
}
