/**
 * LitMPlayer Game Client
 * Handles WebSocket communication and UI interactions
 */

class GameClient {
  constructor() {
    this.socket = null;
    this.currentSession = null;
    this.currentPlayer = null;
    this.gameState = null;
    this.isConnected = false;
    this.selectedTags = []; // Array of {tag: string, effect: 'positive'|'negative'}
    this.isEditing = false; // Whether we're in character editing mode
    this.isRolling = false; // Flag to prevent multiple rapid dice rolls
    this.eventListenersSetup = false; // Flag to prevent multiple event listener setups
    this.sessionJoinComplete = false; // Flag to track when session join is complete
    this.modalEventListenersSetup = false; // Flag to prevent modal event listener duplication
    this.sceneEventListenersSetup = false; // Flag to prevent scene modal event listener duplication
    this.sceneEditingEventListenersSetup = false; // Flag to prevent scene editing modal event listener duplication
    this.activeScene = null; // Currently active scene
    this.activeChallenge = null; // Currently active challenge
    this.uploadedImageUrl = null; // Store uploaded image URL for scene creation
    
    this.initializeSocket();
    this.setupEventListeners();
    this.updateConnectionStatus('Connecting...', 'connecting');
    
    // Add document click handler to hide context menus when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tag-context-menu') && !e.target.closest('.tag')) {
        this.hideAllContextMenus();
      }
    });
    
    // Add window resize handler to hide context menus when window is resized
    window.addEventListener('resize', () => {
      this.hideAllContextMenus();
    });
  }

  /**
   * Create a tag element
   * @param {string} tagText - The tag text
   * @param {boolean} isEditing - Whether the tag is in editing mode
   * @returns {HTMLElement} The tag element
   */
  createTagElement(tagText, isEditing = false) {
    const tagElement = document.createElement('span');
    tagElement.className = `tag ${isEditing ? 'editing' : ''}`;
    tagElement.textContent = tagText;
    
    if (!isEditing) {
      this.setupTagContextMenu(tagElement, tagText);
    }
    
    return tagElement;
  }

  /**
   * Setup context menu for a tag
   * @param {HTMLElement} tagElement - The tag element
   * @param {string} tagText - The tag text
   */
  setupTagContextMenu(tagElement, tagText) {
    // Show context menu on click with dynamic positioning
    tagElement.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideAllContextMenus();
      
      // Create context menu dynamically
      const contextMenu = document.createElement('div');
      contextMenu.className = 'tag-context-menu';
      contextMenu.innerHTML = `
        <button class="add-power">Add Power</button>
        <button class="add-weakness">Add Weakness</button>
        <button class="scratch-tag">${tagElement.classList.contains('scratched') ? 'Unscratch Tag' : 'Scratch Tag'}</button>
      `;
      
      // Append to document body to break free from DOM hierarchy
      document.body.appendChild(contextMenu);
      
      // Get tag position relative to viewport
      const tagRect = tagElement.getBoundingClientRect();
      
      // Position context menu below the tag
      let top = tagRect.bottom + window.scrollY;
      let left = tagRect.left + window.scrollX;
      
      // Check if menu would go off the bottom of the viewport
      const menuHeight = 120; // Approximate height of context menu
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      if (tagRect.bottom + menuHeight > viewportHeight) {
        // Position above the tag instead
        top = tagRect.top + window.scrollY - menuHeight;
      }
      
      // Check if menu would go off the right edge
      const menuWidth = 120; // Approximate width of context menu
      if (tagRect.left + menuWidth > viewportWidth) {
        // Align to right edge of tag
        left = tagRect.right + window.scrollX - menuWidth;
      }
      
      // Apply positioning
      contextMenu.style.position = 'absolute';
      contextMenu.style.top = `${top}px`;
      contextMenu.style.left = `${left}px`;
      contextMenu.style.zIndex = '99999';
      
      // Show the menu
      contextMenu.classList.add('show');
      
      // Handle context menu actions
      contextMenu.querySelector('.add-power').addEventListener('click', (e) => {
        e.stopPropagation();
        this.addTagToRoll(tagText, 'positive');
        this.hideAllContextMenus();
      });
      
      contextMenu.querySelector('.add-weakness').addEventListener('click', (e) => {
        e.stopPropagation();
        this.addTagToRoll(tagText, 'negative');
        this.hideAllContextMenus();
      });
      
      contextMenu.querySelector('.scratch-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        if (tagElement.classList.contains('scratched')) {
          this.unscratchTag(tagElement, tagText);
        } else {
          this.scratchTag(tagElement, tagText);
        }
        this.hideAllContextMenus();
      });
    });
  }

  /**
   * Hide all context menus
   */
  hideAllContextMenus() {
    document.querySelectorAll('.tag-context-menu').forEach(menu => {
      menu.classList.remove('show');
      // Remove from DOM since they're now attached to document body
      if (menu.parentNode) {
        menu.parentNode.removeChild(menu);
      }
    });
  }

  /**
   * Add a tag to the dice roll
   * @param {string} tagText - The tag text
   * @param {string} effect - 'positive' or 'negative'
   */
  addTagToRoll(tagText, effect) {
    console.log(`🏷️ Adding tag to roll: "${tagText}" as ${effect}`);
    
    // Check if tag is scratched
    const tagElements = Array.from(document.querySelectorAll('.tag'));
    const tagElement = tagElements.find(el => el.textContent.trim() === tagText);
    if (tagElement && tagElement.classList.contains('scratched')) {
      console.log(`❌ Cannot add scratched tag "${tagText}" to roll`);
      return;
    }
    
    // For theme attributes and statuses, we need to find the full stored tag name
    let storedTagName = tagText;
    let tagData = null;
    if (this.gameState?.gameObjects) {
      this.gameState.gameObjects.forEach(obj => {
        if (obj.tags) {
          Object.entries(obj.tags).forEach(([storedTag, storedTagData]) => {
            if (typeof storedTag === 'string' && storedTag.includes(': ')) {
              const tagPart = storedTag.split(': ')[1];
              if (tagPart === tagText) {
                storedTagName = storedTag; // Use the full stored tag name
                tagData = storedTagData;
              }
            } else if (storedTag === tagText) {
              tagData = storedTagData;
            }
          });
        }
      });
    }
    
    // Check if tag is already selected
    const existingIndex = this.selectedTags.findIndex(t => t.tag === storedTagName);
    if (existingIndex !== -1) {
      // Update existing tag effect
      console.log(`🔄 Updating existing tag "${storedTagName}" effect from ${this.selectedTags[existingIndex].effect} to ${effect}`);
      this.selectedTags[existingIndex].effect = effect;
    } else {
      // Add new tag
      console.log(`➕ Adding new tag "${storedTagName}" as ${effect}`);
      this.selectedTags.push({ 
        tag: storedTagName, 
        effect: effect,
        tagData: tagData // Store the tag data for status processing
      });
    }
    
    console.log(`📋 Current selected tags:`, this.selectedTags);
    
    this.updateSelectedTagsDisplay();
    this.updateRollButton();
  }

  /**
   * Scratch a tag (mark as unusable)
   * @param {HTMLElement} tagElement - The tag element
   * @param {string} tagText - The tag text
   */
  scratchTag(tagElement, tagText) {
    console.log(`❌ Scratching tag: "${tagText}"`);
    
    // Add scratched class to tag element
    tagElement.classList.add('scratched');
    
    // Remove from selected tags if it was selected
    this.removeTagFromRoll(tagText);
    
    // Update the tag's context menu to show "unscratch" option
    const contextMenu = tagElement.querySelector('.tag-context-menu');
    if (contextMenu) {
      const scratchButton = contextMenu.querySelector('.scratch-tag');
      if (scratchButton) {
        scratchButton.textContent = 'Unscratch Tag';
        scratchButton.classList.add('unscratch');
      }
    }
    
    console.log(`✅ Tag "${tagText}" scratched successfully`);
  }

  /**
   * Unscratch a tag (mark as usable again)
   * @param {HTMLElement} tagElement - The tag element
   * @param {string} tagText - The tag text
   */
  unscratchTag(tagElement, tagText) {
    console.log(`✅ Unscratching tag: "${tagText}"`);
    
    // Remove scratched class from tag element
    tagElement.classList.remove('scratched');
    
    // Update the tag's context menu to show "scratch" option
    const contextMenu = tagElement.querySelector('.tag-context-menu');
    if (contextMenu) {
      const scratchButton = contextMenu.querySelector('.scratch-tag');
      if (scratchButton) {
        scratchButton.textContent = 'Scratch Tag';
        scratchButton.classList.remove('unscratch');
      }
    }
    
    console.log(`✅ Tag "${tagText}" unscratched successfully`);
  }

  /**
   * Remove a tag from the dice roll
   * @param {string} tagText - The tag text
   */
  removeTagFromRoll(tagText) {
    this.selectedTags = this.selectedTags.filter(t => t.tag !== tagText);
    this.updateSelectedTagsDisplay();
    this.updateRollButton();
  }

  /**
   * Update the selected tags display
   */
  updateSelectedTagsDisplay() {
    const container = document.getElementById('selected-tags-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (this.selectedTags.length === 0) {
      container.classList.add('empty');
      return;
    }
    
    container.classList.remove('empty');
    
    this.selectedTags.forEach(tagData => {
      // For theme attributes, show only the tag part (after the colon)
      let displayTag = tagData.tag;
      if (tagData.tag.includes(': ')) {
        displayTag = tagData.tag.split(': ')[1];
      }
      
      // For status tags, append the track value
      if (tagData.tagData && tagData.tagData.isStatus && tagData.tagData.trackValue > 0) {
        displayTag = `${displayTag}-${tagData.tagData.trackValue}`;
      }
      
      const tagElement = document.createElement('span');
      tagElement.className = `selected-tag ${tagData.effect}`;
      tagElement.innerHTML = `
        ${this.escapeHtml(displayTag)}
        <button class="remove-btn" onclick="gameClient.removeTagFromRoll('${this.escapeHtml(tagData.tag)}')">×</button>
      `;
      container.appendChild(tagElement);
    });
  }

  /**
   * Update the roll button state
   */
  updateRollButton() {
    const rollButton = document.getElementById('roll-dice-btn');
    if (!rollButton) {
      console.log('❌ Roll button not found');
      return;
    }
    
    // Calculate modifier based on tag types
    let modifier = 0;
    this.selectedTags.forEach(tag => {
      let tagModifier = 1; // Default modifier for regular tags
      
      // For status tags, use the track value
      if (tag.tagData && tag.tagData.isStatus && tag.tagData.trackValue > 0) {
        tagModifier = tag.tagData.trackValue;
      }
      
      if (tag.effect === 'positive') {
        modifier += tagModifier;
      } else if (tag.effect === 'negative') {
        modifier -= tagModifier;
      }
    });
    
    const wasDisabled = rollButton.disabled;
    rollButton.disabled = this.selectedTags.length === 0;
    rollButton.textContent = `Roll 2d6${modifier >= 0 ? '+' : ''}${modifier}`;
    
    console.log(`🎲 Roll button updated: ${this.selectedTags.length} tags selected, disabled: ${rollButton.disabled}, modifier: ${modifier}`);
    
    if (wasDisabled !== rollButton.disabled) {
      console.log(`🔄 Roll button state changed: ${wasDisabled ? 'disabled' : 'enabled'} -> ${rollButton.disabled ? 'disabled' : 'enabled'}`);
    }
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
      currentSession: this.currentSession,
      socket: this.socket,
      sessionJoinComplete: this.sessionJoinComplete,
      selectedTags: this.selectedTags
    });
    
    // Check if we're in a session
    if (!this.currentSession || !this.socket) {
      console.log('❌ Not in a session, cannot roll dice');
      this.showNotification('Please join a session first', 'warning');
      return;
    }
    
    // Check if session join is complete
    if (!this.sessionJoinComplete) {
      console.log('❌ Session join not complete, cannot roll dice');
      this.showNotification('Please wait for session to fully load', 'warning');
      return;
    }
    
    console.log('🎲 handleRollDice called with selectedTags:', this.selectedTags);
    
    if (this.selectedTags.length === 0) {
      console.log('❌ No tags selected, cannot roll dice');
      this.showNotification('Please select at least one tag to roll dice', 'warning');
      return;
    }
    
    // Set rolling flag
    this.isRolling = true;
    
    // Calculate modifier based on tag types
    let modifier = 0;
    this.selectedTags.forEach(tag => {
      let tagModifier = 1; // Default modifier for regular tags
      
      // For status tags, use the track value
      if (tag.tagData && tag.tagData.isStatus && tag.tagData.trackValue > 0) {
        tagModifier = tag.tagData.trackValue;
      }
      
      if (tag.effect === 'positive') {
        modifier += tagModifier;
      } else if (tag.effect === 'negative') {
        modifier -= tagModifier;
      }
    });
    
    console.log(`📊 Roll stats: modifier: ${modifier}`);
    
    // Create roll action with relevant object IDs
    const relevantObjectIds = [];
    if (this.gameState.gameObjects) {
      this.gameState.gameObjects.forEach(obj => {
        if (obj.tags) {
          Object.values(obj.tags).forEach(tagType => {
            if (typeof tagType === 'object') {
              Object.keys(tagType).forEach(tagName => {
                if (this.selectedTags.some(st => st.tag === tagName)) {
                  relevantObjectIds.push(obj.id);
                }
              });
            }
          });
        }
      });
    }
    
    console.log('🎯 Relevant object IDs:', relevantObjectIds);
    
    // Send the roll request with selected tags information
    this.socket.emit('roll-dice', { 
      relevantObjectIds: [...new Set(relevantObjectIds)], // Remove duplicates
      selectedTags: this.selectedTags, // Send the selected tags for server processing
      modifier: modifier // Send the calculated modifier
    });
    
    console.log('📤 Dice roll request sent to server');
    
    // Don't clear selected tags here - wait for the dice-rolled response
    // The tags will be cleared in handleDiceRoll when we receive the result
  }

  /**
   * Initialize WebSocket connection
   */
  initializeSocket() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      this.updateConnectionStatus('Connected', 'online');
      
      // Load saved sessions when connected
      this.loadSavedSessions();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      this.sessionJoinComplete = false; // Reset session join flag on disconnect
      this.updateConnectionStatus('Disconnected', 'offline');
    });

    this.socket.on('connected', (data) => {
      console.log('Server connection confirmed:', data);
    });

    this.socket.on('session-joined', (data) => {
      console.log('Joined session:', data);
      this.handleSessionJoined(data);
    });

    this.socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
      this.handlePlayerJoined(data);
    });

    this.socket.on('player-left', (data) => {
      console.log('Player left:', data);
      this.handlePlayerLeft(data);
    });

    this.socket.on('player-disconnected', (data) => {
      console.log('Player disconnected:', data);
      this.handlePlayerDisconnected(data);
    });

    this.socket.on('game-state-updated', (data) => {
      console.log('Game state updated:', data);
      this.handleGameStateUpdate(data);
    });

    this.socket.on('chat-message', (data) => {
      console.log('Chat message received:', data);
      this.handleChatMessage(data);
    });

    this.socket.on('dice-rolled', (data) => {
      console.log('Dice rolled:', data);
      this.handleDiceRoll(data);
    });

    this.socket.on('saved-sessions', (data) => {
      console.log('Saved sessions received:', data);
      this.handleSavedSessions(data);
    });

    this.socket.on('session-players', (data) => {
      console.log('Session players received:', data);
      this.handleSessionPlayers(data);
    });

    this.socket.on('error', (data) => {
      console.error('Server error:', data);
      this.showError(data.message);
    });
  }

  /**
   * Load saved sessions from server
   */
  loadSavedSessions() {
    if (this.socket && this.isConnected) {
      this.socket.emit('get-saved-sessions');
    }
  }

  /**
   * Handle saved sessions response
   */
  handleSavedSessions(data) {
    this.savedSessions = data.sessions || [];
    this.updateSavedSessionsDisplay();
  }

  /**
   * Update saved sessions display
   */
  updateSavedSessionsDisplay() {
    const savedSessionsContainer = document.getElementById('saved-sessions');
    if (!savedSessionsContainer) return;

    if (this.savedSessions.length === 0) {
      savedSessionsContainer.innerHTML = '<p style="color: #558b2f; font-style: italic;">No saved sessions found</p>';
      return;
    }

    const sessionsHTML = this.savedSessions.map(session => `
      <div class="saved-session-item" onclick="gameClient.selectSavedSession('${session.sessionId}')">
        <div class="session-info">
          <h4>${this.escapeHtml(session.name)}</h4>
          <p>Session ID: ${session.sessionId}</p>
          <p>Players: ${session.playerCount}</p>
          <p>Last saved: ${new Date(session.lastSaved).toLocaleString()}</p>
        </div>
        <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); gameClient.loadSessionPlayers('${session.sessionId}')">
          Load Players
        </button>
      </div>
    `).join('');

    savedSessionsContainer.innerHTML = sessionsHTML;
  }

  /**
   * Select a saved session
   */
  selectSavedSession(sessionId) {
    document.getElementById('session-id').value = sessionId;
    this.loadSessionPlayers(sessionId);
  }

  /**
   * Load players for a session
   */
  loadSessionPlayers(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('get-session-players', { sessionId });
    }
  }

  /**
   * Handle session players response
   */
  handleSessionPlayers(data) {
    this.sessionPlayers = data.players || [];
    this.updatePlayerAutocomplete();
  }

  /**
   * Update player autocomplete
   */
  updatePlayerAutocomplete() {
    const playerNameField = document.getElementById('player-name');
    if (!playerNameField) return;

    // Create datalist for autocomplete
    let datalist = document.getElementById('player-autocomplete');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'player-autocomplete';
      playerNameField.setAttribute('list', 'player-autocomplete');
      playerNameField.parentNode.appendChild(datalist);
    }

    // Clear existing options
    datalist.innerHTML = '';

    // Add player names as options
    this.sessionPlayers.forEach(playerName => {
      const option = document.createElement('option');
      option.value = playerName;
      datalist.appendChild(option);
    });
  }

  /**
   * Setup DOM event listeners
   */
  setupEventListeners() {
    // Prevent multiple setups
    if (this.eventListenersSetup) {
      console.log('⚠️ Event listeners already setup, skipping');
      return;
    }
    
    console.log('🔧 Setting up event listeners');
    
    // Global click handler to hide context menus
    document.addEventListener('click', () => {
      this.hideAllContextMenus();
    });

    // Join form
    const joinForm = document.getElementById('join-form');
    if (joinForm) {
      joinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleJoinSession();
      });
    }

    // Create session button
    const createSessionBtn = document.getElementById('create-session-btn');
    if (createSessionBtn) {
      createSessionBtn.addEventListener('click', () => {
        this.handleCreateSession();
      });
    }

    // Leave session button
    const leaveSessionBtn = document.getElementById('leave-session-btn');
    if (leaveSessionBtn) {
      leaveSessionBtn.addEventListener('click', () => {
        this.handleLeaveSession();
      });
    }

    // Character creation
    const createCharacterBtn = document.getElementById('create-character-btn');
    if (createCharacterBtn) {
      createCharacterBtn.addEventListener('click', () => {
        // Reset editing mode when creating a new character
        this.isEditing = false;
        this.editingCharacterId = null;
        this.showCharacterCreation();
      });
    }

    // Character creation modal
    const characterForm = document.getElementById('character-form');
    if (characterForm) {
      characterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveCharacter();
      });
    }

    const cancelCharacterBtn = document.getElementById('cancel-character-btn');
    if (cancelCharacterBtn) {
      cancelCharacterBtn.addEventListener('click', () => {
        this.hideCharacterCreation();
      });
    }

    // Scene management
    const manageScenesBtn = document.getElementById('manage-scenes-btn');
    if (manageScenesBtn) {
      manageScenesBtn.addEventListener('click', () => {
        this.showSceneManagement();
      });
    }

    // Challenges dropdown
    const challengesBtn = document.getElementById('challenges-btn');
    if (challengesBtn) {
      challengesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleChallengesDropdown();
      });
    }

    // Close challenges dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const challengesDropdown = document.querySelector('.challenges-dropdown');
      const challengesBtn = document.getElementById('challenges-btn');
      if (challengesDropdown && !challengesDropdown.contains(e.target) && e.target !== challengesBtn) {
        this.hideChallengesDropdown();
      }
    });

    // Scene creation modal
    const sceneForm = document.getElementById('scene-form');
    if (sceneForm) {
      sceneForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveScene();
      });
    }

    const cancelSceneBtn = document.getElementById('cancel-scene-btn');
    if (cancelSceneBtn) {
      cancelSceneBtn.addEventListener('click', () => {
        this.hideSceneCreation();
      });
    }

    // Scene tag management
    const addSceneTagBtn = document.getElementById('add-scene-tag-btn');
    if (addSceneTagBtn) {
      addSceneTagBtn.addEventListener('click', () => {
        this.addSceneTagInput();
      });
    }

    // Scene management modal
    const closeSceneManagementBtn = document.getElementById('close-scene-management');
    if (closeSceneManagementBtn) {
      closeSceneManagementBtn.addEventListener('click', () => {
        this.hideSceneManagement();
      });
    }

    const createNewSceneBtn = document.getElementById('create-new-scene-btn');
    if (createNewSceneBtn) {
      createNewSceneBtn.addEventListener('click', () => {
        this.hideSceneManagement();
        this.showSceneCreation();
      });
    }

    // Scene editing modal
    const closeSceneEditingBtn = document.getElementById('close-scene-editing');
    if (closeSceneEditingBtn) {
      closeSceneEditingBtn.addEventListener('click', () => {
        this.handleSceneEditingModalClose();
      });
    }

    const cancelSceneEditBtn = document.getElementById('cancel-scene-edit-btn');
    if (cancelSceneEditBtn) {
      cancelSceneEditBtn.addEventListener('click', () => {
        this.handleSceneEditingModalClose();
      });
    }

    const addSceneEditTagBtn = document.getElementById('add-scene-edit-tag-btn');
    if (addSceneEditTagBtn) {
      addSceneEditTagBtn.addEventListener('click', () => {
        this.addSceneEditTagInput();
      });
    }

    // Scene editing form submission
    const sceneEditForm = document.getElementById('scene-edit-form');
    if (sceneEditForm) {
      sceneEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveSceneEdit();
      });
    }

    // Scene editing image handling
    const sceneEditImageInput = document.getElementById('scene-edit-image-upload');
    if (sceneEditImageInput) {
      sceneEditImageInput.addEventListener('change', (e) => {
        this.handleSceneEditImageSelect(e);
      });
    }

    const removeSceneEditImageBtn = document.getElementById('remove-scene-edit-image');
    if (removeSceneEditImageBtn) {
      removeSceneEditImageBtn.addEventListener('click', () => {
        this.handleRemoveSceneEditImage();
      });
    }

    // Challenge management
    const addSceneChallengeBtn = document.getElementById('add-scene-challenge-btn');
    if (addSceneChallengeBtn) {
      addSceneChallengeBtn.addEventListener('click', () => {
        this.addNewChallenge();
      });
    }

    // Fellowship relationships
    const addFellowshipBtn = document.getElementById('add-fellowship-btn');
    if (addFellowshipBtn) {
      addFellowshipBtn.addEventListener('click', () => {
        this.addFellowshipPair();
      });
    }

    // Quintessences
    const addQuintessenceBtn = document.getElementById('add-quintessence-btn');
    if (addQuintessenceBtn) {
      addQuintessenceBtn.addEventListener('click', () => {
        this.addQuintessenceItem();
      });
    }

    // Backpack items
    const addBackpackItemBtn = document.getElementById('add-backpack-item-btn');
    if (addBackpackItemBtn) {
      addBackpackItemBtn.addEventListener('click', () => {
        this.addBackpackItem();
      });
    }

    // Statuses
    const addStatusBtn = document.getElementById('add-status-btn');
    if (addStatusBtn) {
      addStatusBtn.addEventListener('click', () => {
        this.addStatusItem();
      });
    }

    // Theme cards
    const addThemeBtn = document.getElementById('add-theme-btn');
    if (addThemeBtn) {
      addThemeBtn.addEventListener('click', () => {
        this.addThemeCard();
      });
    }

    // Promise circles
    this.setupPromiseCircles();

    // Chat input
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    if (chatInput && sendChatBtn) {
      sendChatBtn.addEventListener('click', () => {
        this.handleSendChat();
      });
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSendChat();
        }
      });
    }

    // Dice rolling
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    if (rollDiceBtn) {
      // Remove any existing event listeners to prevent duplicates
      const newRollDiceBtn = rollDiceBtn.cloneNode(true);
      rollDiceBtn.parentNode.replaceChild(newRollDiceBtn, rollDiceBtn);
      
      newRollDiceBtn.addEventListener('click', (e) => {
        console.log('🎲 Roll dice button clicked');
        e.preventDefault();
        e.stopPropagation();
        this.handleRollDice();
      });
      
      console.log('🎲 Roll dice event listener attached');
    }

    // Notes
    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => {
        this.handleAddNote();
      });
    }

    // Error close button
    const errorCloseBtn = document.getElementById('error-close');
    if (errorCloseBtn) {
      errorCloseBtn.addEventListener('click', () => {
        this.hideError();
      });
    }
    
    // Mark event listeners as setup
    this.eventListenersSetup = true;
    console.log('✅ Event listeners setup complete');
  }

  /**
   * Setup promise circles functionality
   */
  setupPromiseCircles() {
    const promiseCircles = document.getElementById('promise-circles');
    if (!promiseCircles) return;

    const circles = promiseCircles.querySelectorAll('.promise-circle');
    circles.forEach(circle => {
      circle.addEventListener('click', () => {
        const value = parseInt(circle.dataset.value);
        this.setPromiseProgress(value);
      });
    });
  }

  /**
   * Set promise progress
   */
  setPromiseProgress(progress) {
    const circles = document.querySelectorAll('.promise-circle');
    circles.forEach((circle, index) => {
      const value = index + 1;
      if (value <= progress) {
        circle.classList.add('filled');
      } else {
        circle.classList.remove('filled');
      }
    });
  }

  /**
   * Add fellowship item (companion or relationship)
   */
  addFellowshipItem(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'fellowship-item';
    item.innerHTML = `
      <input type="text" placeholder="${containerId === 'companions-list' ? 'Companion name' : 'Relationship tag'}">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality
    const removeBtn = item.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      container.removeChild(item);
    });

    container.appendChild(item);
  }

  /**
   * Add fellowship pair (companion and relationship)
   */
  addFellowshipPair() {
    const companionsList = document.getElementById('companions-list');
    const relationshipsList = document.getElementById('relationships-list');

    if (!companionsList || !relationshipsList) return;

    // Add new companion item
    const companionItem = document.createElement('div');
    companionItem.className = 'fellowship-item';
    companionItem.innerHTML = `
      <input type="text" class="tag-input" placeholder="Companion name">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality for companion
    const companionRemoveBtn = companionItem.querySelector('.remove-btn');
    companionRemoveBtn.addEventListener('click', () => {
      companionsList.removeChild(companionItem);
    });

    companionsList.appendChild(companionItem);

    // Add new relationship item
    const relationshipItem = document.createElement('div');
    relationshipItem.className = 'fellowship-item';
    relationshipItem.innerHTML = `
      <input type="text" class="tag-input" placeholder="Relationship tag">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality for relationship
    const relationshipRemoveBtn = relationshipItem.querySelector('.remove-btn');
    relationshipRemoveBtn.addEventListener('click', () => {
      relationshipsList.removeChild(relationshipItem);
    });

    relationshipsList.appendChild(relationshipItem);
  }

  /**
   * Add quintessence item
   */
  addQuintessenceItem() {
    const container = document.getElementById('quintessences-items');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'quintessence-item';
    item.innerHTML = `
      <input type="text" class="tag-input" placeholder="Quintessence tag">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality
    const removeBtn = item.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      container.removeChild(item);
    });

    container.appendChild(item);
  }

  /**
   * Add backpack item
   */
  addBackpackItem() {
    const container = document.getElementById('backpack-items');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'backpack-item';
    item.innerHTML = `
      <input type="text" class="tag-input" placeholder="Item name">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality
    const removeBtn = item.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      container.removeChild(item);
    });

    container.appendChild(item);
  }

  /**
   * Add status item
   */
  addStatusItem() {
    const container = document.getElementById('statuses-container');
    if (!container) return;

    const statusItem = document.createElement('div');
    statusItem.className = 'status-item';
    
    // Create the status track checkboxes HTML
    let checkboxesHTML = '';
    for (let i = 1; i <= 6; i++) {
      checkboxesHTML += `
        <div class="status-checkbox-wrapper">
          <div class="status-checkbox" data-value="${i}"></div>
          <div class="status-checkbox-label">${i}</div>
        </div>
      `;
    }

    statusItem.innerHTML = `
      <div class="status-header">
        <input type="text" class="status-name-input" placeholder="Status name">
        <button type="button" class="status-remove-btn">×</button>
      </div>
      <div class="status-track">
        <div class="status-track-label">Track:</div>
        <div class="status-track-checkboxes">
          ${checkboxesHTML}
        </div>
      </div>
    `;

    // Add event listeners for checkboxes
    const checkboxes = statusItem.querySelectorAll('.status-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('click', () => {
        checkbox.classList.toggle('checked');
      });
    });

    // Add remove functionality
    const removeBtn = statusItem.querySelector('.status-remove-btn');
    removeBtn.addEventListener('click', () => {
      container.removeChild(statusItem);
    });

    container.appendChild(statusItem);
  }

     /**
    * Create status from saved data
    */
   createStatusFromData(statusData) {
     const container = document.getElementById('statuses-container');
     if (!container) return;

     const statusItem = document.createElement('div');
     statusItem.className = 'status-item';
     
     // Create the status track checkboxes HTML
     let checkboxesHTML = '';
     for (let i = 1; i <= 6; i++) {
       // Check if this specific value is in the checkedValues array
       const checkedClass = statusData.checkedValues && statusData.checkedValues.includes(i) ? 'checked' : '';
       checkboxesHTML += `
         <div class="status-checkbox-wrapper">
           <div class="status-checkbox ${checkedClass}" data-value="${i}"></div>
           <div class="status-checkbox-label">${i}</div>
         </div>
       `;
     }

    statusItem.innerHTML = `
      <div class="status-header">
        <input type="text" class="status-name-input" value="${this.escapeHtml(statusData.name)}" placeholder="Status name">
        <button type="button" class="status-remove-btn">×</button>
      </div>
      <div class="status-track">
        <div class="status-track-label">Track:</div>
        <div class="status-track-checkboxes">
          ${checkboxesHTML}
        </div>
      </div>
    `;

    // Add event listeners for checkboxes
    const checkboxes = statusItem.querySelectorAll('.status-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('click', () => {
        checkbox.classList.toggle('checked');
      });
    });

    // Add remove functionality
    const removeBtn = statusItem.querySelector('.status-remove-btn');
    removeBtn.addEventListener('click', () => {
      container.removeChild(statusItem);
    });

    container.appendChild(statusItem);
  }

  /**
   * Add theme card
   */
  addThemeCard() {
    const container = document.getElementById('theme-cards-container');
    if (!container) return;

    const themeCard = document.createElement('div');
    themeCard.className = 'theme-card';
    themeCard.innerHTML = `
      <div class="theme-card-header">THEME CARD</div>
      <div class="theme-card-content">
        <div class="theme-type-section">
          <label>TYPE</label>
          <input type="text" class="theme-type-input" placeholder="Enter theme type">
        </div>
        
        <div class="theme-attributes-section">
          <label>ATTRIBUTES</label>
          <div class="theme-attributes-list">
            <div class="theme-attribute-item">
              <input type="text" class="attribute-input" placeholder="Attribute name">
              <div class="attribute-type">
                <button type="button" class="positive" title="Positive attribute">+</button>
                <button type="button" class="negative" title="Negative attribute">-</button>
              </div>
              <button type="button" class="remove-btn">×</button>
            </div>
          </div>
          <button type="button" class="add-attribute-btn">Add Attribute</button>
        </div>
        
        <div class="theme-quest-section">
          <label>QUEST</label>
          <textarea class="theme-quest-input" placeholder="Enter quest description"></textarea>
        </div>
        
        <div class="theme-tracks-section">
          <label>TRACKS</label>
          <div class="theme-tracks">
            <div class="theme-track">
              <div class="theme-track-name">ABANDON</div>
              <div class="theme-track-pips">
                <div class="theme-track-pip" data-track="abandon" data-pip="1"></div>
                <div class="theme-track-pip" data-track="abandon" data-pip="2"></div>
                <div class="theme-track-pip" data-track="abandon" data-pip="3"></div>
              </div>
            </div>

            <div class="theme-track">
              <div class="theme-track-name">MILESTONE</div>
              <div class="theme-track-pips">
                <div class="theme-track-pip" data-track="milestone" data-pip="1"></div>
                <div class="theme-track-pip" data-track="milestone" data-pip="2"></div>
                <div class="theme-track-pip" data-track="milestone" data-pip="3"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="theme-special-improvements-section">
          <label>SPECIAL IMPROVEMENTS</label>
          <div class="theme-special-improvements-list">
            <div class="theme-special-improvement-item">
              <input type="text" class="special-improvement-input" placeholder="Special improvement">
              <button type="button" class="remove-btn">×</button>
            </div>
          </div>
          <button type="button" class="add-special-improvement-btn">Add Special Improvement</button>
        </div>
        
        <div class="theme-card-actions">
          <button type="button" class="remove-theme-btn">Remove Theme</button>
        </div>
      </div>
    `;

    // Add event listeners for theme card functionality
    this.setupThemeCardEventListeners(themeCard);

    container.appendChild(themeCard);
  }

  /**
   * Setup event listeners for a theme card
   */
  setupThemeCardEventListeners(themeCard) {
    // Add attribute button
    const addAttributeBtn = themeCard.querySelector('.add-attribute-btn');
    if (addAttributeBtn) {
      addAttributeBtn.addEventListener('click', () => {
        this.addThemeAttribute(themeCard);
      });
    }

    // Add special improvement button
    const addSpecialImprovementBtn = themeCard.querySelector('.add-special-improvement-btn');
    if (addSpecialImprovementBtn) {
      addSpecialImprovementBtn.addEventListener('click', () => {
        this.addThemeSpecialImprovement(themeCard);
      });
    }

    // Remove theme button
    const removeThemeBtn = themeCard.querySelector('.remove-theme-btn');
    if (removeThemeBtn) {
      removeThemeBtn.addEventListener('click', () => {
        themeCard.remove();
      });
    }

    // Track pips
    const trackPips = themeCard.querySelectorAll('.theme-track-pip');
    trackPips.forEach(pip => {
      pip.addEventListener('click', () => {
        pip.classList.toggle('filled');
      });
    });

    // Attribute type buttons
    const attributeItems = themeCard.querySelectorAll('.theme-attribute-item');
    attributeItems.forEach(item => {
      this.setupAttributeTypeButtons(item);
    });

    // Remove attribute buttons
    const removeBtns = themeCard.querySelectorAll('.theme-attribute-item .remove-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.theme-attribute-item').remove();
      });
    });

    // Remove special improvement buttons
    const removeSpecialImprovementBtns = themeCard.querySelectorAll('.theme-special-improvement-item .remove-btn');
    removeSpecialImprovementBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.theme-special-improvement-item').remove();
      });
    });
  }

  /**
   * Setup attribute type buttons for an attribute item
   */
  setupAttributeTypeButtons(attributeItem) {
    const positiveBtn = attributeItem.querySelector('.positive');
    const negativeBtn = attributeItem.querySelector('.negative');
    
    if (positiveBtn) {
      positiveBtn.addEventListener('click', () => {
        positiveBtn.classList.add('active');
        negativeBtn.classList.remove('active');
      });
    }
    
    if (negativeBtn) {
      negativeBtn.addEventListener('click', () => {
        negativeBtn.classList.add('active');
        positiveBtn.classList.remove('active');
      });
    }
  }

  /**
   * Add attribute to theme card
   */
  addThemeAttribute(themeCard) {
    const attributesList = themeCard.querySelector('.theme-attributes-list');
    if (!attributesList) return;

    const attributeItem = document.createElement('div');
    attributeItem.className = 'theme-attribute-item';
    attributeItem.innerHTML = `
      <input type="text" class="attribute-input" placeholder="Attribute name">
      <div class="attribute-type">
        <button type="button" class="positive" title="Positive attribute">+</button>
        <button type="button" class="negative" title="Negative attribute">-</button>
      </div>
      <button type="button" class="remove-btn">×</button>
    `;

    // Setup event listeners for the new attribute item
    this.setupAttributeTypeButtons(attributeItem);
    
    const removeBtn = attributeItem.querySelector('.remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        attributeItem.remove();
      });
    }

    attributesList.appendChild(attributeItem);
  }

  /**
   * Add special improvement to theme card
   */
  addThemeSpecialImprovement(themeCard) {
    const specialImprovementsList = themeCard.querySelector('.theme-special-improvements-list');
    if (!specialImprovementsList) return;

    const specialImprovementItem = document.createElement('div');
    specialImprovementItem.className = 'theme-special-improvement-item';
    specialImprovementItem.innerHTML = `
      <input type="text" class="special-improvement-input" placeholder="Special improvement">
      <button type="button" class="remove-btn">×</button>
    `;

    const removeBtn = specialImprovementItem.querySelector('.remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        specialImprovementItem.remove();
      });
    }

    specialImprovementsList.appendChild(specialImprovementItem);
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
   * Create theme card from saved data
   */
  createThemeCardFromData(themeData) {
    const container = document.getElementById('theme-cards-container');
    if (!container) return;

    const themeCard = document.createElement('div');
    themeCard.className = 'theme-card';
    
    // Build attributes HTML
    let attributesHTML = '';
    if (themeData.attributes && themeData.attributes.length > 0) {
      themeData.attributes.forEach(attr => {
        const activeClass = attr.effect === 'positive' ? 'active' : '';
        const inactiveClass = attr.effect === 'negative' ? 'active' : '';
        attributesHTML += `
          <div class="theme-attribute-item">
            <input type="text" class="attribute-input" value="${this.escapeHtml(attr.name)}" placeholder="Attribute name">
            <div class="attribute-type">
              <button type="button" class="positive ${activeClass}" title="Positive attribute">+</button>
              <button type="button" class="negative ${inactiveClass}" title="Negative attribute">-</button>
            </div>
            <button type="button" class="remove-btn">×</button>
          </div>
        `;
      });
    } else {
      attributesHTML = `
        <div class="theme-attribute-item">
          <input type="text" class="attribute-input" placeholder="Attribute name">
          <div class="attribute-type">
            <button type="button" class="positive" title="Positive attribute">+</button>
            <button type="button" class="negative" title="Negative attribute">-</button>
          </div>
          <button type="button" class="remove-btn">×</button>
        </div>
      `;
    }

    // Build special improvements HTML
    let specialImprovementsHTML = '';
    if (themeData.specialImprovements && themeData.specialImprovements.length > 0) {
      themeData.specialImprovements.forEach(improvement => {
        specialImprovementsHTML += `
          <div class="theme-special-improvement-item">
            <input type="text" class="special-improvement-input" value="${this.escapeHtml(improvement)}" placeholder="Special improvement">
            <button type="button" class="remove-btn">×</button>
          </div>
        `;
      });
    } else {
      specialImprovementsHTML = `
        <div class="theme-special-improvement-item">
          <input type="text" class="special-improvement-input" placeholder="Special improvement">
          <button type="button" class="remove-btn">×</button>
        </div>
      `;
    }

    // Build track pips HTML
    const buildTrackPips = (trackName, filledCount) => {
      let pipsHTML = '';
      for (let i = 1; i <= 3; i++) {
        const filledClass = i <= filledCount ? 'filled' : '';
        pipsHTML += `<div class="theme-track-pip ${filledClass}" data-track="${trackName}" data-pip="${i}"></div>`;
      }
      return pipsHTML;
    };

    themeCard.innerHTML = `
      <div class="theme-card-header">THEME CARD</div>
      <div class="theme-card-content">
        <div class="theme-type-section">
          <label>TYPE</label>
          <input type="text" class="theme-type-input" value="${this.escapeHtml(themeData.type || '')}" placeholder="Enter theme type">
        </div>
        
        <div class="theme-attributes-section">
          <label>ATTRIBUTES</label>
          <div class="theme-attributes-list">
            ${attributesHTML}
          </div>
          <button type="button" class="add-attribute-btn">Add Attribute</button>
        </div>
        
        <div class="theme-quest-section">
          <label>QUEST</label>
          <textarea class="theme-quest-input" placeholder="Enter quest description">${this.escapeHtml(themeData.quest || '')}</textarea>
        </div>
        
        <div class="theme-tracks-section">
          <label>TRACKS</label>
          <div class="theme-tracks">
            <div class="theme-track">
              <div class="theme-track-name">ABANDON</div>
              <div class="theme-track-pips">
                ${buildTrackPips('abandon', themeData.tracks?.abandon || 0)}
              </div>
            </div>

            <div class="theme-track">
              <div class="theme-track-name">MILESTONE</div>
              <div class="theme-track-pips">
                ${buildTrackPips('milestone', themeData.tracks?.milestone || 0)}
              </div>
            </div>
          </div>
        </div>
        
        <div class="theme-special-improvements-section">
          <label>SPECIAL IMPROVEMENTS</label>
          <div class="theme-special-improvements-list">
            ${specialImprovementsHTML}
          </div>
          <button type="button" class="add-special-improvement-btn">Add Special Improvement</button>
        </div>
        
        <div class="theme-card-actions">
          <button type="button" class="remove-theme-btn">Remove Theme</button>
        </div>
      </div>
    `;

    // Setup event listeners for the theme card
    this.setupThemeCardEventListeners(themeCard);

    container.appendChild(themeCard);
  }

  /**
   * Show character creation modal
   */
  showCharacterCreation() {
    const overlay = document.getElementById('character-creation-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      this.resetCharacterForm();
      
      // Auto-populate and lock the player name field
      const playerNameField = document.getElementById('player-name-char');
      if (playerNameField && this.currentPlayer) {
        playerNameField.value = this.currentPlayer.name;
        playerNameField.readOnly = true;
        playerNameField.style.backgroundColor = '#f5f5f5';
        playerNameField.style.color = '#666';
      }
      
      // Setup modal event listeners (only once)
      this.setupModalEventListeners();
    }
  }

  /**
   * Hide character creation modal
   */
  hideCharacterCreation() {
    const overlay = document.getElementById('character-creation-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    
    // Remove all modal event listeners
    this.removeModalEventListeners();
    
    // Reset editing mode when modal is closed
    this.isEditing = false;
    this.editingCharacterId = null;
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
        this.handleSaveCharacter();
      } else {
        // No data entered, just close
        this.hideCharacterCreation();
      }
    } else {
      // No form found, just close
      this.hideCharacterCreation();
    }
  }

  // ========================================
  // SCENE MANAGEMENT METHODS
  // ========================================

  /**
   * Show scene creation modal
   */
  showSceneCreation() {
    const overlay = document.getElementById('scene-creation-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('show');
      this.setupSceneModalEventListeners();
    }
  }

  /**
   * Hide scene creation modal
   */
  hideSceneCreation() {
    const overlay = document.getElementById('scene-creation-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.classList.add('hidden');
    }
    
    // Remove all scene modal event listeners
    this.removeSceneModalEventListeners();
    
    // Reset form
    this.resetSceneForm();
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
    this.boundSceneImageSelect = this.handleSceneImageSelect.bind(this);
    this.boundRemoveSceneImage = this.handleRemoveSceneImage.bind(this);
    
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
        this.handleSaveScene();
      } else {
        // No data entered, just close
        this.hideSceneCreation();
      }
    } else {
      this.hideSceneCreation();
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
        this.handleSaveSceneEdit();
      } else {
        console.log('🔍 No scene name, just closing');
        // No data entered, just close
        this.hideSceneEditing();
      }
    } else {
      console.log('🔍 No form found, just closing');
      // No form found, just close
      this.hideSceneEditing();
    }
  }

  /**
   * Reset scene form
   */
  resetSceneForm() {
    const form = document.getElementById('scene-form');
    if (form) {
      form.reset();
    }
    
    // Clear scene tags input container
    const tagsContainer = document.getElementById('scene-tags-input-container');
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
    }
    
    // Clear image preview
    const imagePreview = document.getElementById('scene-image-preview');
    if (imagePreview) {
      imagePreview.style.display = 'none';
    }
    
    // Clear uploaded image URL
    this.uploadedImageUrl = null;
  }

  /**
   * Add scene tag input
   */
  addSceneTagInput() {
    const container = document.getElementById('scene-tags-input-container');
    if (!container) return;

    const tagItem = document.createElement('div');
    tagItem.className = 'scene-tag-input-item';
    
    tagItem.innerHTML = `
      <input type="text" placeholder="Enter tag name" class="scene-tag-input">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality
    const removeBtn = tagItem.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      container.removeChild(tagItem);
    });

    container.appendChild(tagItem);
  }

  /**
   * Collect scene data from form
   */
      collectSceneData() {
      const sceneName = document.getElementById('scene-name').value.trim();
      const sceneDescription = document.getElementById('scene-description-input').value.trim();
      const sceneImageInput = document.getElementById('scene-image-upload');
      let sceneImageFile = null;

      console.log('🔍 Scene image input element:', sceneImageInput);
      console.log('🔍 Scene image input files:', sceneImageInput?.files);
      console.log('🔍 Scene image input files length:', sceneImageInput?.files?.length);

      if (sceneImageInput && sceneImageInput.files && sceneImageInput.files.length > 0) {
        sceneImageFile = sceneImageInput.files[0];
        console.log('🔍 Selected file:', sceneImageFile);
      } else {
        console.log('🔍 No file selected or input not found');
      }
    const sceneImageUrl = this.uploadedImageUrl || ''; // Use uploaded URL if available

    // Get scene tags
    const sceneTags = {};
    const tagInputs = document.querySelectorAll('#scene-tags-input-container .scene-tag-input');
    tagInputs.forEach(input => {
      const value = input.value.trim();
      if (value) {
        sceneTags[value] = {
          modifier: 0,
          addedBy: this.currentPlayer?.name || 'Unknown'
        };
      }
    });

    return {
      sceneName,
      sceneDescription,
      sceneImage: sceneImageUrl,
      sceneImageFile,
      sceneTags,
      createdAt: new Date().toISOString(),
      createdBy: this.currentPlayer?.name || 'Unknown'
    };
  }

  /**
   * Upload image file to server
   */
  async uploadImage(file) {
    try {
      console.log('🚀 Starting image upload for file:', file.name);
      
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('📦 FormData created, making fetch request...');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      console.log('📡 Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Upload failed with status:', response.status, errorData);
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ Upload successful, result:', result);
      return result.fileUrl;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Handle scene image file selection
   */
  handleSceneImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('scene-image-preview');
    const previewImg = document.getElementById('scene-preview-img');
    const removeBtn = document.getElementById('remove-scene-image');

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        event.target.value = '';
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        event.target.value = '';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function(e) {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
      this.uploadedImageUrl = null;
    }
  }

  /**
   * Handle remove scene image
   */
  handleRemoveSceneImage() {
    const fileInput = document.getElementById('scene-image-upload');
    const preview = document.getElementById('scene-image-preview');
    
    fileInput.value = '';
    preview.style.display = 'none';
    this.uploadedImageUrl = null;
  }

  /**
   * Handle save scene
   */
  async handleSaveScene() {
    const sceneData = this.collectSceneData();
    
    console.log('🔍 Scene data collected:', sceneData);
    console.log('🔍 Scene image file:', sceneData.sceneImageFile);
    
    if (!sceneData.sceneName) {
      alert('Please enter a scene title');
      return;
    }

    try {
      let imageUrl = sceneData.sceneImage;

      // Upload image if a file was selected
      if (sceneData.sceneImageFile) {
        console.log('📤 Uploading scene image...');
        console.log('📤 File details:', {
          name: sceneData.sceneImageFile.name,
          size: sceneData.sceneImageFile.size,
          type: sceneData.sceneImageFile.type
        });
        imageUrl = await this.uploadImage(sceneData.sceneImageFile);
        console.log('✅ Image uploaded successfully:', imageUrl);
      } else {
        console.log('⚠️ No image file to upload');
      }

      // Send scene creation action to server
      console.log('🎬 Creating scene with data:', {
        name: sceneData.sceneName,
        description: sceneData.sceneDescription,
        image: imageUrl,
        tags: sceneData.sceneTags
      });
      
      this.socket.emit('game-action', {
        type: 'create_object',
        objectType: 'scene',
        contents: {
          name: sceneData.sceneName,
          description: sceneData.sceneDescription,
          image: imageUrl,
          challenges: []
        },
        tags: sceneData.sceneTags
      });

      // Close modal
      this.hideSceneCreation();
      
      // The scene will be activated when the server responds with the updated game state
    } catch (error) {
      console.error('❌ Error saving scene:', error);
      alert('Failed to save scene: ' + error.message);
    }
  }

  /**
   * Set active scene
   */
  setActiveScene(sceneObject) {
    console.log('🎬 Setting active scene:', sceneObject);
    this.activeScene = sceneObject;
    
    // Clear active challenge when switching scenes
    this.activeChallenge = null;
    
    // Update scene display
    this.updateSceneDisplay();
    
    // Update scene tags
    this.updateSceneTags();
    
    // Update challenge display
    this.updateChallengeDisplay();
    
    // Update background if scene has image
    if (sceneObject.contents.image) {
      console.log('🖼️ Updating background with scene image:', sceneObject.contents.image);
      this.updateBackgroundImage(sceneObject.contents.image);
    } else {
      console.log('🖼️ Clearing background image (no scene image)');
      this.clearBackgroundImage();
    }
  }

  /**
   * Update scene display
   */
  updateSceneDisplay() {
    const sceneTitle = document.getElementById('scene-title');
    const sceneImage = document.getElementById('scene-image');
    const sceneDescription = document.getElementById('scene-description');
    
    if (!this.activeScene) {
      // No active scene
      if (sceneTitle) sceneTitle.textContent = 'New Scene';
      if (sceneImage) {
        sceneImage.style.display = 'none';
        sceneImage.src = '';
      }
      if (sceneDescription) sceneDescription.textContent = 'No description available.';
      return;
    }

    // Update title
    if (sceneTitle) {
      sceneTitle.textContent = this.activeScene.contents.name || 'Untitled Scene';
    }

    // Update image
    if (sceneImage && this.activeScene.contents.image) {
      sceneImage.src = this.activeScene.contents.image;
      sceneImage.style.display = 'block';
      
      // Handle image load error
      sceneImage.onerror = () => {
        sceneImage.style.display = 'none';
        console.warn('Failed to load scene image:', this.activeScene.contents.image);
      };
    } else if (sceneImage) {
      sceneImage.style.display = 'none';
    }

    // Update description
    if (sceneDescription) {
      sceneDescription.textContent = this.activeScene.contents.description || 'No description available.';
    }

    // Update challenge display
    this.updateChallengeDisplay();
  }

  /**
   * Update background image with cross-fade effect
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
    
    // Clear background image
    body.style.backgroundImage = '';
    body.style.removeProperty('--scene-background-image');
  }

  /**
   * Update scene controls visibility
   */
  updateSceneControls() {
    const manageScenesBtn = document.getElementById('manage-scenes-btn');
    const challengesDropdown = document.querySelector('.challenges-dropdown');
    
    if (manageScenesBtn) {
      // Show manage scenes button only for Narrators
      if (this.currentPlayer && this.currentPlayer.isGM) {
        manageScenesBtn.style.display = 'block';
      } else {
        manageScenesBtn.style.display = 'none';
      }
    }
    
    if (challengesDropdown) {
      // Show challenges dropdown only for Narrators
      if (this.currentPlayer && this.currentPlayer.isGM) {
        challengesDropdown.style.display = 'block';
      } else {
        challengesDropdown.style.display = 'none';
      }
    }
    
    // Update body class for narrator-only elements
    const body = document.body;
    if (this.currentPlayer && this.currentPlayer.isGM) {
      body.classList.add('narrator');
    } else {
      body.classList.remove('narrator');
    }

    // Update challenge display when narrator status changes
    this.updateChallengeDisplay();
  }

  /**
   * Show scene management modal
   */
  showSceneManagement() {
    const overlay = document.getElementById('scene-management-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('show');
      this.populateSceneManagement();
    }
  }

  /**
   * Hide scene management modal
   */
  hideSceneManagement() {
    const overlay = document.getElementById('scene-management-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.classList.add('hidden');
    }
  }

  /**
   * Populate scene management modal with existing scenes
   */
  populateSceneManagement() {
    const scenesGrid = document.getElementById('scenes-grid');
    if (!scenesGrid) return;

    // Clear existing content
    scenesGrid.innerHTML = '';

    if (!this.gameState || !this.gameState.gameObjects) {
      scenesGrid.innerHTML = '<p style="text-align: center; color: #8b4513; font-style: italic;">No scenes available</p>';
      return;
    }

    // Get all scene objects
    const sceneObjects = this.gameState.gameObjects.filter(obj => obj.type === 'scene');
    
    if (sceneObjects.length === 0) {
      scenesGrid.innerHTML = '<p style="text-align: center; color: #8b4513; font-style: italic;">No scenes available. Create your first scene!</p>';
      return;
    }

    // Sort scenes by creation date (newest first)
    const sortedScenes = sceneObjects.sort((a, b) => 
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
    const card = document.createElement('div');
    card.className = 'scene-card';
    if (this.activeScene && this.activeScene.id === scene.id) {
      card.classList.add('active');
    }

    const imageUrl = scene.contents.image || '';
    const title = scene.contents.name || 'Untitled Scene';
    const description = scene.contents.description || 'No description available';

    card.innerHTML = `
      <div class="scene-card-image ${!imageUrl ? 'no-image' : ''}">
        ${imageUrl ? `<img src="${imageUrl}" alt="${title}" onerror="this.parentElement.classList.add('no-image'); this.remove();">` : ''}
        <div class="scene-card-overlay">
          <div class="scene-card-play-btn" data-scene-id="${scene.id}">▶</div>
        </div>
      </div>
      <div class="scene-card-content">
        <h4 class="scene-card-title">${title}</h4>
        <p class="scene-card-description">${description}</p>
      </div>
      <div class="scene-card-actions">
        <button class="scene-card-edit-btn" data-scene-id="${scene.id}">Edit</button>
        <button class="scene-card-delete-btn" data-scene-id="${scene.id}">Delete</button>
      </div>
    `;

    // Add event listeners
    const playBtn = card.querySelector('.scene-card-play-btn');
    const editBtn = card.querySelector('.scene-card-edit-btn');
    const deleteBtn = card.querySelector('.scene-card-delete-btn');

    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveSceneFromManagement(scene.id);
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editScene(scene.id);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteScene(scene.id);
      });
    }

    return card;
  }

  /**
   * Set active scene from scene management modal
   */
  setActiveSceneFromManagement(sceneId) {
    if (!this.gameState || !this.gameState.gameObjects) return;

    const scene = this.gameState.gameObjects.find(obj => obj.type === 'scene' && obj.id === sceneId);
    if (scene) {
      // Send set_scene action to server to broadcast to all users
      this.socket.emit('game-action', {
        type: 'set_scene',
        sceneObjectId: sceneId
      });
      
      this.hideSceneManagement();
    }
  }

  /**
   * Edit scene
   */
  editScene(sceneId) {
    console.log('🎬 Edit scene:', sceneId);
    
    if (!this.gameState || !this.gameState.gameObjects) return;

    const scene = this.gameState.gameObjects.find(obj => obj.type === 'scene' && obj.id === sceneId);
    if (!scene) {
      console.error('Scene not found:', sceneId);
      return;
    }

    // Store the scene being edited
    this.editingScene = scene;
    
    // Populate the edit form with scene data
    this.populateSceneEditForm(scene);
    
    // Show the edit modal
    this.showSceneEditing();
  }

  /**
   * Delete scene
   */
  deleteScene(sceneId) {
    if (!confirm('Are you sure you want to delete this scene? This action cannot be undone.')) {
      return;
    }

    console.log('🎬 Deleting scene:', sceneId);

    // Send delete action to server
    this.socket.emit('game-action', {
      type: 'delete_object',
      objectId: sceneId
    });

    // Close modal
    this.hideSceneManagement();
  }

  /**
   * Show scene editing modal
   */
  showSceneEditing() {
    const overlay = document.getElementById('scene-editing-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('show');
      this.setupSceneEditingModalEventListeners();
    }
  }

  /**
   * Hide scene editing modal
   */
  hideSceneEditing() {
    const overlay = document.getElementById('scene-editing-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.classList.add('hidden');
    }
    
    // Remove event listeners
    this.removeSceneEditingModalEventListeners();
    
    // Clear editing state
    this.editingScene = null;
    this.uploadedImageUrl = null;
    
    // Clean up any marked-for-removal tags
    const removedTags = document.querySelectorAll('#scene-edit-tags-input-container .scene-tag-input[data-removed="true"]');
    removedTags.forEach(input => {
      const tagItem = input.closest('.scene-tag-input-item');
      if (tagItem) {
        tagItem.remove();
      }
    });
  }

  /**
   * Populate scene edit form with existing scene data
   */
  populateSceneEditForm(scene) {
    console.log('🎬 Populating edit form with scene:', scene);

    // Set scene name
    const nameInput = document.getElementById('scene-edit-name');
    if (nameInput) {
      nameInput.value = scene.contents.name || '';
    }

    // Set scene description
    const descriptionInput = document.getElementById('scene-edit-description-input');
    if (descriptionInput) {
      descriptionInput.value = scene.contents.description || '';
    }

    // Set scene image preview if exists
    const imagePreview = document.getElementById('scene-edit-image-preview');
    const previewImg = document.getElementById('scene-edit-preview-img');
    if (scene.contents.image && imagePreview && previewImg) {
      previewImg.src = scene.contents.image;
      imagePreview.style.display = 'block';
      this.uploadedImageUrl = scene.contents.image; // Keep existing image URL
    } else if (imagePreview) {
      imagePreview.style.display = 'none';
    }

    // Clear and populate scene tags
    const tagsContainer = document.getElementById('scene-edit-tags-input-container');
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      console.log('🔍 Populating scene tags:', scene.tags);
      
      if (scene.tags && Object.keys(scene.tags).length > 0) {
        Object.keys(scene.tags).forEach(tagName => {
          console.log('🔍 Adding tag input for:', tagName);
          this.addSceneEditTagInput(tagName);
        });
      } else {
        console.log('🔍 No tags found, adding empty tag input');
        // Add one empty tag input if no tags exist
        this.addSceneEditTagInput();
      }
    }

    // Populate challenges
    this.populateSceneChallenges();
  }

  /**
   * Add scene edit tag input
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
   * Handle scene edit image file selection
   */
  handleSceneEditImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('scene-edit-image-preview');
    const previewImg = document.getElementById('scene-edit-preview-img');
    const removeBtn = document.getElementById('remove-scene-edit-image');

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        event.target.value = '';
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        event.target.value = '';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function(e) {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
      this.uploadedImageUrl = null;
    }
  }

  /**
   * Handle remove scene edit image
   */
  handleRemoveSceneEditImage() {
    const fileInput = document.getElementById('scene-edit-image-upload');
    const preview = document.getElementById('scene-edit-image-preview');
    
    fileInput.value = '';
    preview.style.display = 'none';
    this.uploadedImageUrl = null;
  }

  /**
   * Collect scene edit data from form
   */
  collectSceneEditData() {
    const sceneName = document.getElementById('scene-edit-name').value.trim();
    const sceneDescription = document.getElementById('scene-edit-description-input').value.trim();
    const sceneImageInput = document.getElementById('scene-edit-image-upload');
    let sceneImageFile = null;

    console.log('🔍 Scene edit image input element:', sceneImageInput);
    console.log('🔍 Scene edit image input files:', sceneImageInput?.files);
    console.log('🔍 Scene edit image input files length:', sceneImageInput?.files?.length);

    if (sceneImageInput && sceneImageInput.files && sceneImageInput.files.length > 0) {
      sceneImageFile = sceneImageInput.files[0];
      console.log('🔍 Selected file for edit:', sceneImageFile);
    } else {
      console.log('🔍 No new file selected for edit');
    }

    const sceneImageUrl = this.uploadedImageUrl || ''; // Use uploaded URL if available

    // Get scene tags
    const sceneTags = {};
    const tagInputs = document.querySelectorAll('#scene-edit-tags-input-container .scene-tag-input');
    console.log('🔍 Found tag inputs:', tagInputs.length);
    
    tagInputs.forEach((input, index) => {
      const isRemoved = input.getAttribute('data-removed') === 'true';
      const value = input.value.trim();
      console.log(`🔍 Tag input ${index}: value="${value}", removed=${isRemoved}`);
      
      // Skip tags that are marked for removal
      if (isRemoved) {
        console.log(`🔍 Skipping removed tag: "${value}"`);
        return;
      }
      
      if (value) {
        sceneTags[value] = {
          modifier: 0,
          addedBy: this.currentPlayer?.name || 'Unknown'
        };
        console.log(`🔍 Adding tag: "${value}"`);
      }
    });
    
    console.log('🔍 Final scene tags collected:', Object.keys(sceneTags));

    // Get challenges data
    const challenges = this.collectChallengeData();

    return {
      sceneName,
      sceneDescription,
      sceneImage: sceneImageUrl,
      sceneImageFile,
      sceneTags,
      challenges,
      updatedAt: new Date().toISOString(),
      updatedBy: this.currentPlayer?.name || 'Unknown'
    };
  }

  /**
   * Handle save scene edit
   */
  async handleSaveSceneEdit() {
    if (!this.editingScene) {
      console.error('No scene being edited');
      return;
    }

    const sceneData = this.collectSceneEditData();
    
    console.log('🔍 Scene edit data collected:', sceneData);
    console.log('🔍 Scene edit image file:', sceneData.sceneImageFile);
    
    if (!sceneData.sceneName) {
      alert('Please enter a scene title');
      return;
    }

    try {
      let imageUrl = sceneData.sceneImage;

      // Upload new image if a file was selected
      if (sceneData.sceneImageFile) {
        console.log('📤 Uploading new scene image...');
        console.log('📤 File details:', {
          name: sceneData.sceneImageFile.name,
          size: sceneData.sceneImageFile.size,
          type: sceneData.sceneImageFile.type
        });
        imageUrl = await this.uploadImage(sceneData.sceneImageFile);
        console.log('✅ New image uploaded successfully:', imageUrl);
      } else {
        console.log('⚠️ No new image file to upload, keeping existing image');
      }

      // Send scene update action to server
      console.log('🎬 Updating scene with data:', {
        id: this.editingScene.id,
        name: sceneData.sceneName,
        description: sceneData.sceneDescription,
        image: imageUrl,
        tags: sceneData.sceneTags
      });
      
      this.socket.emit('game-action', {
        type: 'update_object',
        objectId: this.editingScene.id,
        contents: {
          name: sceneData.sceneName,
          description: sceneData.sceneDescription,
          image: imageUrl,
          challenges: sceneData.challenges
        },
        tags: sceneData.sceneTags
      });

      // Close modal
      this.hideSceneEditing();
      
      // Refresh scene management if it's open
      if (document.getElementById('scene-management-overlay').classList.contains('show')) {
        this.populateSceneManagement();
      }

    } catch (error) {
      console.error('❌ Error updating scene:', error);
      alert('Failed to update scene. Please try again.');
    }
  }

  /**
   * Update active scene based on game state
   */
  updateActiveScene() {
    if (!this.gameState || !this.gameState.gameObjects) return;
    
    // Store current active challenge ID to preserve it
    const currentActiveChallengeId = this.activeChallenge?.id;
    
    // Use server's currentScene state if available, otherwise fall back to most recent scene
    let targetScene = null;
    
    if (this.gameState.currentScene) {
      // Find the scene specified by the server's currentScene
      targetScene = this.gameState.gameObjects.find(obj => obj.type === 'scene' && obj.id === this.gameState.currentScene);
      console.log('🎬 Using server currentScene:', this.gameState.currentScene, targetScene ? targetScene.contents.name : 'not found');
    }
    
    if (!targetScene) {
      // Fall back to most recent scene if no currentScene is set
      const sceneObjects = this.gameState.gameObjects.filter(obj => obj.type === 'scene');
      console.log('🎬 Found scene objects:', sceneObjects.length, sceneObjects.map(s => ({ id: s.id, name: s.contents.name, createdAt: s.createdAt })));
      
      if (sceneObjects.length > 0) {
        // Sort by creation date and take the most recent
        const sortedScenes = sceneObjects.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        targetScene = sortedScenes[0];
        console.log('🎬 Using most recent scene as fallback:', targetScene.id, targetScene.contents.name);
        
        // If there's only one scene and no currentScene is set, automatically set it as current
        if (sceneObjects.length === 1 && !this.gameState.currentScene && this.currentPlayer?.isGM) {
          console.log('🎬 Auto-setting single scene as current scene (GM only)');
          this.socket.emit('game-action', {
            type: 'set_scene',
            sceneObjectId: targetScene.id
          });
        }
      }
    }
    
    if (targetScene) {
      if (targetScene !== this.activeScene) {
        console.log('🎬 Setting new active scene:', targetScene.id);
        this.setActiveScene(targetScene);
      } else {
        console.log('🎬 Active scene unchanged:', this.activeScene?.id);
      }
      
      // Restore active challenge if it exists in the current scene
      if (currentActiveChallengeId && this.activeScene && this.activeScene.contents.challenges) {
        const challenge = this.activeScene.contents.challenges.find(c => c.id === currentActiveChallengeId);
        if (challenge) {
          this.activeChallenge = challenge;
          console.log('🎯 Restored active challenge:', challenge.title);
          this.updateChallengeDisplay();
        }
      }
      
      // Also check if there's an active challenge from server state
      if (this.gameState.activeChallenge && this.activeScene && this.activeScene.contents.challenges) {
        const challenge = this.activeScene.contents.challenges.find(c => c.id === this.gameState.activeChallenge);
        if (challenge) {
          this.activeChallenge = challenge;
          console.log('🎯 Setting active challenge from server state:', challenge.title);
          this.updateChallengeDisplay();
        }
      } else if (!this.gameState.activeChallenge) {
        // Server has no active challenge, clear local state
        if (this.activeChallenge) {
          console.log('🎯 Clearing active challenge (server state is null)');
          this.activeChallenge = null;
          this.updateChallengeDisplay();
        }
      }
    } else {
      // No scenes found, clear active scene
      console.log('🎬 No scenes found, clearing active scene');
      if (this.activeScene) {
        this.activeScene = null;
        this.activeChallenge = null;
        this.clearBackgroundImage();
        this.updateSceneDisplay();
        this.updateChallengeDisplay();
      }
    }
  }

  // ===== CHALLENGE METHODS =====

  /**
   * Set active challenge
   */
  setActiveChallenge(challengeId) {
    if (!this.activeScene || !this.activeScene.contents.challenges) {
      this.activeChallenge = null;
      this.updateChallengeDisplay();
      return;
    }

    const challenge = this.activeScene.contents.challenges.find(c => c.id === challengeId);
    if (challenge) {
      this.activeChallenge = challenge;
      console.log('🎯 Setting active challenge:', challenge.title);
    } else {
      this.activeChallenge = null;
      console.log('🎯 No challenge found with ID:', challengeId);
    }
    
    this.updateChallengeDisplay();
  }

  /**
   * Update challenge display
   */
  updateChallengeDisplay() {
    const challengeOverlay = document.getElementById('active-challenge-overlay');
    const challengeDetails = document.getElementById('active-challenge-details');
    const challengeTitle = document.getElementById('active-challenge-title');
    const challengeTags = document.getElementById('active-challenge-tags');
    const challengeSuccess = document.getElementById('active-challenge-success');
    const challengeConsequences = document.getElementById('active-challenge-consequences');

    if (!this.activeChallenge) {
      // No active challenge
      if (challengeOverlay) challengeOverlay.style.display = 'none';
      if (challengeDetails) challengeDetails.style.display = 'none';
      return;
    }

    // Update challenge overlay (visible to players)
    if (challengeOverlay) {
      challengeOverlay.style.display = 'block';
    }

    if (challengeTitle) {
      challengeTitle.textContent = this.activeChallenge.title || 'Untitled Challenge';
    }

    // Update challenge tags
    if (challengeTags) {
      challengeTags.innerHTML = '';
      if (this.activeChallenge.tags && Object.keys(this.activeChallenge.tags).length > 0) {
        Object.keys(this.activeChallenge.tags).forEach(tagName => {
          const tagElement = this.createTagElement(tagName);
          challengeTags.appendChild(tagElement);
        });
      }
    }

    // Update challenge details (visible to narrators)
    if (challengeDetails) {
      challengeDetails.style.display = 'block';
    }

    if (challengeSuccess) {
      challengeSuccess.textContent = this.activeChallenge.success || 'No success text available.';
    }

    if (challengeConsequences) {
      challengeConsequences.textContent = this.activeChallenge.consequences || 'No consequences text available.';
    }
  }

  /**
   * Populate challenges in scene editing modal
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

  // ===== CHALLENGES DROPDOWN METHODS =====

  /**
   * Toggle challenges dropdown visibility
   */
  toggleChallengesDropdown() {
    const dropdown = document.getElementById('challenges-dropdown-menu');
    if (!dropdown) return;

    if (dropdown.classList.contains('show')) {
      this.hideChallengesDropdown();
    } else {
      this.showChallengesDropdown();
    }
  }

  /**
   * Show challenges dropdown
   */
  showChallengesDropdown() {
    const dropdown = document.getElementById('challenges-dropdown-menu');
    if (!dropdown) return;

    this.populateChallengesDropdown();
    dropdown.classList.add('show');
  }

  /**
   * Hide challenges dropdown
   */
  hideChallengesDropdown() {
    const dropdown = document.getElementById('challenges-dropdown-menu');
    if (!dropdown) return;

    dropdown.classList.remove('show');
  }

  /**
   * Populate challenges dropdown with available challenges
   */
  populateChallengesDropdown() {
    const dropdown = document.getElementById('challenges-dropdown-menu');
    if (!dropdown) return;

    // Clear existing content
    dropdown.innerHTML = '';

    // Get all challenges from all scenes
    const allChallenges = this.getAllChallenges();
    
    if (allChallenges.length === 0) {
      dropdown.innerHTML = `
        <div class="challenges-dropdown-header">
          <h4>Challenges</h4>
        </div>
        <div class="challenges-empty">
          No challenges available. Create challenges in scene editing.
        </div>
      `;
      return;
    }

    // Create dropdown header
    const header = document.createElement('div');
    header.className = 'challenges-dropdown-header';
    header.innerHTML = '<h4>Challenges</h4>';
    dropdown.appendChild(header);

    // Create challenges list
    const challengesList = document.createElement('div');
    challengesList.className = 'challenges-list';

    allChallenges.forEach(challenge => {
      const challengeItem = this.createChallengeDropdownItem(challenge);
      challengesList.appendChild(challengeItem);
    });

    dropdown.appendChild(challengesList);
  }

  /**
   * Get all challenges from all scenes
   */
  getAllChallenges() {
    const allChallenges = [];
    
    if (!this.gameState || !this.gameState.gameObjects) return allChallenges;

    this.gameState.gameObjects.forEach(gameObject => {
      if (gameObject.type === 'scene' && gameObject.contents.challenges) {
        gameObject.contents.challenges.forEach(challenge => {
          allChallenges.push({
            ...challenge,
            sceneId: gameObject.id,
            sceneTitle: gameObject.contents.name || 'Untitled Scene'
          });
        });
      }
    });

    return allChallenges;
  }

  /**
   * Create a challenge item for the dropdown
   */
  createChallengeDropdownItem(challenge) {
    const challengeItem = document.createElement('div');
    challengeItem.className = 'challenge-item';
    
    // Add active class if this is the current active challenge
    if (this.activeChallenge && this.activeChallenge.id === challenge.id) {
      challengeItem.classList.add('active');
    }

    // Add overcome class if challenge is overcome
    if (challenge.overcome) {
      challengeItem.classList.add('overcome');
    }

    // Create challenge content
    const title = document.createElement('div');
    title.className = 'challenge-item-title';
    title.textContent = challenge.title || 'Untitled Challenge';
    challengeItem.appendChild(title);

    // Add scene info
    const sceneInfo = document.createElement('div');
    sceneInfo.style.fontSize = '0.8rem';
    sceneInfo.style.color = '#8b4513';
    sceneInfo.style.opacity = '0.7';
    sceneInfo.textContent = `Scene: ${challenge.sceneTitle}`;
    challengeItem.appendChild(sceneInfo);

    // Create tags display
    if (challenge.tags && Object.keys(challenge.tags).length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'challenge-item-tags';
      
      Object.keys(challenge.tags).forEach(tagName => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = tagName;
        tagsContainer.appendChild(tag);
      });
      
      challengeItem.appendChild(tagsContainer);
    }

    // Create action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'challenge-item-actions';

    // Present challenge button
    const presentBtn = document.createElement('button');
    presentBtn.className = 'challenge-action-btn present';
    presentBtn.textContent = 'Present';
    presentBtn.title = 'Present this challenge to players';
    presentBtn.disabled = challenge.overcome;
    presentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!challenge.overcome) {
        this.presentChallenge(challenge);
      }
    });
    actionsContainer.appendChild(presentBtn);

    // Overcome challenge button
    const overcomeBtn = document.createElement('button');
    overcomeBtn.className = 'challenge-action-btn overcome';
    overcomeBtn.textContent = challenge.overcome ? 'Reset' : 'Overcome';
    overcomeBtn.title = challenge.overcome ? 'Reset challenge status to not overcome' : 'Mark this challenge as overcome';
    overcomeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleOvercomeChallenge(challenge);
    });
    actionsContainer.appendChild(overcomeBtn);

    challengeItem.appendChild(actionsContainer);

    return challengeItem;
  }

  /**
   * Present a challenge to players
   */
  presentChallenge(challenge) {
    // Set as active challenge
    this.setActiveChallenge(challenge.id);
    
    // Send action to server to update active challenge
    this.socket.emit('game-action', {
      type: 'set_active_challenge',
      challengeId: challenge.id,
      sceneId: challenge.sceneId
    });

    console.log('🎯 Presenting challenge:', challenge.title);
    this.hideChallengesDropdown();
  }

  /**
   * Toggle a challenge's overcome status
   */
  toggleOvercomeChallenge(challenge) {
    // Remove from active challenge if it's currently active and we're marking it as overcome
    if (!challenge.overcome && this.activeChallenge && this.activeChallenge.id === challenge.id) {
      this.setActiveChallenge(null);
      
      // Send action to server to clear active challenge
      this.socket.emit('game-action', {
        type: 'clear_active_challenge'
      });
    }

    // Toggle challenge overcome status in the scene
    this.socket.emit('game-action', {
      type: 'toggle_overcome_challenge',
      challengeId: challenge.id,
      sceneId: challenge.sceneId
    });

    console.log('🎯 Toggling challenge overcome status:', challenge.title, challenge.overcome ? '-> not overcome' : '-> overcome');
    this.hideChallengesDropdown();
  }

  /**
   * Create a challenge item element for editing
   */
  createChallengeItem(challenge) {
    const challengeItem = document.createElement('div');
    challengeItem.className = 'challenge-item';
    challengeItem.dataset.challengeId = challenge.id;

    const isActive = this.activeChallenge && this.activeChallenge.id === challenge.id;

    challengeItem.innerHTML = `
      <div class="challenge-item-header">
        <div class="challenge-item-title">${challenge.title || 'Untitled Challenge'}</div>
        <div class="challenge-item-actions">
          <button type="button" class="set-active-btn ${isActive ? 'active' : ''}" title="${isActive ? 'Active Challenge' : 'Set as Active'}">
            ${isActive ? '✓' : '▶'}
          </button>
          <button type="button" class="delete-btn delete" title="Delete Challenge">×</button>
        </div>
      </div>
      <div class="challenge-item-content">
        <div class="challenge-item-field">
          <label>Title</label>
          <input type="text" class="challenge-title-input" value="${challenge.title || ''}" placeholder="Challenge title">
        </div>
        <div class="challenge-item-field">
          <label>Success</label>
          <textarea class="challenge-success-input" placeholder="What happens on success...">${challenge.success || ''}</textarea>
        </div>
        <div class="challenge-item-field">
          <label>Consequences</label>
          <textarea class="challenge-consequences-input" placeholder="What happens on failure...">${challenge.consequences || ''}</textarea>
        </div>
        <div class="challenge-item-tags">
          <label>Tags</label>
          <div class="challenge-tags-input-container">
            ${this.createChallengeTagsHTML(challenge.tags || {})}
          </div>
          <button type="button" class="add-challenge-tag-btn">Add Tag</button>
        </div>
      </div>
    `;

    // Add event listeners
    this.setupChallengeItemEventListeners(challengeItem, challenge);

    return challengeItem;
  }

  /**
   * Create HTML for challenge tags
   */
  createChallengeTagsHTML(tags) {
    if (!tags || Object.keys(tags).length === 0) {
      return '<div class="challenge-tag-input-item"><input type="text" placeholder="Enter tag name" class="challenge-tag-input"></div>';
    }

    return Object.keys(tags).map(tagName => `
      <div class="challenge-tag-input-item">
        <input type="text" placeholder="Enter tag name" class="challenge-tag-input" value="${tagName}">
        <button type="button" class="remove-btn">×</button>
      </div>
    `).join('');
  }

  /**
   * Setup event listeners for challenge item
   */
  setupChallengeItemEventListeners(challengeItem, challenge) {
    const setActiveBtn = challengeItem.querySelector('.set-active-btn');
    const deleteBtn = challengeItem.querySelector('.delete-btn');
    const addTagBtn = challengeItem.querySelector('.add-challenge-tag-btn');
    const tagsContainer = challengeItem.querySelector('.challenge-tags-input-container');

    // Set active challenge
    setActiveBtn.addEventListener('click', () => {
      this.setActiveChallenge(challenge.id);
      this.updateChallengeItemStates();
    });

    // Delete challenge
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this challenge?')) {
        this.deleteChallenge(challenge.id);
      }
    });

    // Add tag
    addTagBtn.addEventListener('click', () => {
      this.addChallengeTagInput(tagsContainer);
    });

    // Setup existing tag inputs
    const tagInputs = challengeItem.querySelectorAll('.challenge-tag-input-item');
    tagInputs.forEach(tagItem => {
      const removeBtn = tagItem.querySelector('.remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          tagsContainer.removeChild(tagItem);
        });
      }
    });
  }

  /**
   * Add challenge tag input
   */
  addChallengeTagInput(container) {
    const tagItem = document.createElement('div');
    tagItem.className = 'challenge-tag-input-item';
    
    tagItem.innerHTML = `
      <input type="text" placeholder="Enter tag name" class="challenge-tag-input">
      <button type="button" class="remove-btn">×</button>
    `;

    // Add remove functionality
    const removeBtn = tagItem.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      container.removeChild(tagItem);
    });

    container.appendChild(tagItem);
  }

  /**
   * Update challenge item states (active/inactive)
   */
  updateChallengeItemStates() {
    const challengeItems = document.querySelectorAll('.challenge-item');
    challengeItems.forEach(item => {
      const setActiveBtn = item.querySelector('.set-active-btn');
      const challengeId = item.dataset.challengeId;
      
      if (this.activeChallenge && this.activeChallenge.id === challengeId) {
        setActiveBtn.classList.add('active');
        setActiveBtn.textContent = '✓';
        setActiveBtn.title = 'Active Challenge';
      } else {
        setActiveBtn.classList.remove('active');
        setActiveBtn.textContent = '▶';
        setActiveBtn.title = 'Set as Active';
      }
    });
  }

  /**
   * Add new challenge to scene
   */
  addNewChallenge() {
    if (!this.editingScene) return;

    const newChallenge = {
      id: this.generateChallengeId(),
      title: 'New Challenge',
      success: '',
      consequences: '',
      tags: {},
      createdAt: new Date().toISOString()
    };

    // Initialize challenges array if it doesn't exist
    if (!this.editingScene.contents.challenges) {
      this.editingScene.contents.challenges = [];
    }

    this.editingScene.contents.challenges.push(newChallenge);
    this.populateSceneChallenges();
  }

  /**
   * Delete challenge from scene
   */
  deleteChallenge(challengeId) {
    if (!this.editingScene || !this.editingScene.contents.challenges) return;

    const index = this.editingScene.contents.challenges.findIndex(c => c.id === challengeId);
    if (index !== -1) {
      this.editingScene.contents.challenges.splice(index, 1);
      
      // If this was the active challenge, clear it
      if (this.activeChallenge && this.activeChallenge.id === challengeId) {
        this.activeChallenge = null;
        this.updateChallengeDisplay();
      }
      
      this.populateSceneChallenges();
    }
  }

  /**
   * Generate unique challenge ID
   */
  generateChallengeId() {
    return 'challenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Collect challenge data from editing form
   */
  collectChallengeData() {
    const challenges = [];
    const challengeItems = document.querySelectorAll('.challenge-item');

    challengeItems.forEach(item => {
      const challengeId = item.dataset.challengeId;
      const titleInput = item.querySelector('.challenge-title-input');
      const successInput = item.querySelector('.challenge-success-input');
      const consequencesInput = item.querySelector('.challenge-consequences-input');
      const tagInputs = item.querySelectorAll('.challenge-tag-input');

      const tags = {};
      tagInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
          tags[value] = {
            modifier: 0,
            addedBy: this.currentPlayer?.name || 'Unknown'
          };
        }
      });

      challenges.push({
        id: challengeId,
        title: titleInput ? titleInput.value.trim() : '',
        success: successInput ? successInput.value.trim() : '',
        consequences: consequencesInput ? consequencesInput.value.trim() : '',
        tags: tags,
        createdAt: new Date().toISOString()
      });
    });

    return challenges;
  }

  /**
   * Reset character form to default state
   */
  resetCharacterForm() {
    const form = document.getElementById('character-form');
    if (!form) return;

    form.reset();
    
    // Reset and lock the player name field
    const playerNameField = document.getElementById('player-name-char');
    if (playerNameField && this.currentPlayer) {
      playerNameField.value = this.currentPlayer.name;
      playerNameField.readOnly = true;
      playerNameField.style.backgroundColor = '#f5f5f5';
      playerNameField.style.color = '#666';
    }
    
    // Reset promise circles
    this.setPromiseProgress(0);
    
    // Reset fellowship items to one each
    const companionsList = document.getElementById('companions-list');
    const relationshipsList = document.getElementById('relationships-list');
    
    if (companionsList) {
      companionsList.innerHTML = `
        <div class="fellowship-item">
          <input type="text" class="tag-input" placeholder="Companion name">
          <button type="button" class="remove-btn">×</button>
        </div>
      `;
    }
    
    if (relationshipsList) {
      relationshipsList.innerHTML = `
        <div class="fellowship-item">
          <input type="text" class="tag-input" placeholder="Relationship tag">
          <button type="button" class="remove-btn">×</button>
        </div>
      `;
    }
    
    // Reset quintessences to one
    const quintessencesItems = document.getElementById('quintessences-items');
    if (quintessencesItems) {
      quintessencesItems.innerHTML = `
        <div class="quintessence-item">
          <input type="text" class="tag-input" placeholder="Quintessence tag">
          <button type="button" class="remove-btn">×</button>
        </div>
      `;
    }
    
    // Reset backpack items to one
    const backpackItems = document.getElementById('backpack-items');
    if (backpackItems) {
      backpackItems.innerHTML = `
        <div class="backpack-item">
          <input type="text" class="tag-input" placeholder="Item name">
          <button type="button" class="remove-btn">×</button>
        </div>
      `;
    }

    // Reset statuses
    const statusesContainer = document.getElementById('statuses-container');
    if (statusesContainer) {
      statusesContainer.innerHTML = '';
    }

    // Reset theme cards
    const themeCardsContainer = document.getElementById('theme-cards-container');
    if (themeCardsContainer) {
      themeCardsContainer.innerHTML = '';
    }
  }

  /**
   * Handle saving character
   */
  handleSaveCharacter() {
    const characterData = this.collectCharacterData();
    
    if (!characterData.characterName || !characterData.playerName) {
      this.showError('Please enter both character name and player name');
      return;
    }

    // Prepare the character data structure
    const characterContents = {
      characterName: characterData.characterName,
      playerName: characterData.playerName,
      promise: characterData.promise,
      themeCards: characterData.themeCards,
      notes: characterData.notes
    };

    const characterTags = {
      quintessences: characterData.quintessences.reduce((acc, quintessence) => {
        acc[quintessence] = {
          modifier: 1,
          scratched: false,
          addedBy: characterData.createdBy
        };
        return acc;
      }, {}),
      companions: characterData.companions.reduce((acc, companion) => {
        acc[companion] = {
          modifier: 1,
          addedBy: characterData.createdBy
        };
        return acc;
      }, {}),
      relationships: characterData.relationships.reduce((acc, relationship) => {
        acc[relationship] = {
          modifier: 1,
          addedBy: characterData.createdBy
        };
        return acc;
      }, {}),
             backpack: characterData.backpackItems.reduce((acc, item) => {
         acc[item] = {
           modifier: 1,
           scratched: false,
           addedBy: characterData.createdBy
         };
         return acc;
       }, {}),
               // Add statuses as tags
        ...characterData.statuses.reduce((acc, status) => {
          acc[status.name] = {
            modifier: status.trackValue,
            scratched: false,
            addedBy: characterData.createdBy,
            isStatus: true,
            trackValue: status.trackValue,
            checkedValues: status.checkedValues
          };
          return acc;
        }, {}),
       // Add theme attributes as tags
      ...characterData.themeCards.reduce((acc, themeCard, index) => {
        themeCard.attributes.forEach(attr => {
          const tagName = `${themeCard.type}: ${attr.name}`;
          acc[tagName] = {
            modifier: attr.effect === 'positive' ? 1 : -1,
            addedBy: characterData.createdBy,
            themeCardIndex: index,
            attributeName: attr.name,
            effect: attr.effect
          };
        });
        return acc;
      }, {})
    };

    let action;
    if (this.isEditing && this.editingCharacterId) {
      // Update existing character
      action = {
        type: 'update_object',
        objectId: this.editingCharacterId,
        contents: characterContents,
        tags: characterTags,
        lastModifiedBy: characterData.createdBy
      };
    } else {
      // Create new character
      action = {
        type: 'create_object',
        objectType: 'character',
        contents: characterContents,
        tags: characterTags,
        createdBy: characterData.createdBy
      };
    }

    // Send character data to server
    this.socket.emit('game-action', action);

    // Reset editing mode
    this.isEditing = false;
    this.editingCharacterId = null;

    // Close modal immediately
    this.hideCharacterCreation();
    
    // Show success notification
    this.showNotification(action.type === 'update_object' ? 'Character updated successfully!' : 'Character created successfully!');
  }

  /**
   * Collect character data from form
   */
  collectCharacterData() {
    const characterName = document.getElementById('character-name').value.trim();
    const playerName = document.getElementById('player-name-char').value.trim();
    const notes = document.getElementById('character-notes').value.trim();

    // Get promise progress
    const filledCircles = document.querySelectorAll('.promise-circle.filled').length;
    const promiseProgress = filledCircles;

    // Get companions and relationships
    const companions = [];
    const relationships = [];
    const companionInputs = document.querySelectorAll('#companions-list .tag-input');
    const relationshipInputs = document.querySelectorAll('#relationships-list .tag-input');
    
    companionInputs.forEach(input => {
      const value = input.value.trim();
      if (value) companions.push(value);
    });
    
    relationshipInputs.forEach(input => {
      const value = input.value.trim();
      if (value) relationships.push(value);
    });

    // Get quintessences
    const quintessences = [];
    const quintessenceInputs = document.querySelectorAll('#quintessences-items .tag-input');
    quintessenceInputs.forEach(input => {
      const value = input.value.trim();
      if (value) quintessences.push(value);
    });

    // Get backpack items
    const backpackItems = [];
    const backpackInputs = document.querySelectorAll('#backpack-items .tag-input');
    backpackInputs.forEach(input => {
      const value = input.value.trim();
      if (value) backpackItems.push(value);
    });

         // Get statuses
     const statuses = [];
     const statusItems = document.querySelectorAll('#statuses-container .status-item');
     statusItems.forEach(statusItem => {
       const nameInput = statusItem.querySelector('.status-name-input');
       const name = nameInput.value.trim();
       if (name) {
         // Get all checked values from the track
         const checkedBoxes = statusItem.querySelectorAll('.status-checkbox.checked');
         const checkedValues = [];
         checkedBoxes.forEach(checkbox => {
           const value = parseInt(checkbox.dataset.value);
           checkedValues.push(value);
         });
         
         // Calculate the highest value for the modifier
         const highestValue = checkedValues.length > 0 ? Math.max(...checkedValues) : 0;
         
         statuses.push({
           name: name,
           trackValue: highestValue,
           checkedValues: checkedValues
         });
       }
     });

    // Get theme cards
    const themeCards = [];
    const themeCardElements = document.querySelectorAll('#theme-cards-container .theme-card');
    themeCardElements.forEach(themeCard => {
      const themeData = this.collectThemeCardData(themeCard);
      if (themeData) {
        themeCards.push(themeData);
      }
    });

    return {
      characterName,
      playerName,
      promise: {
        progress: promiseProgress
      },
      quintessences,
      companions,
      relationships,
      backpackItems,
      statuses,
      themeCards,
      notes,
      createdAt: new Date().toISOString(),
      createdBy: this.currentPlayer?.name || 'Unknown'
    };
  }

  /**
   * Update characters list
   */
  updateCharactersList() {
    const charactersList = document.getElementById('characters-list');
    if (!charactersList) return;

    charactersList.innerHTML = '';
    
    // Get character objects from the game state
    const characterObjects = this.gameState?.gameObjects?.filter(obj => obj.type === 'character') || [];
    
    // Filter characters based on player permissions
    let visibleCharacters = characterObjects;
    if (!this.currentPlayer?.isGM) {
      // Non-GM players only see their own characters
      visibleCharacters = characterObjects.filter(char => 
        char.contents.playerName === this.currentPlayer?.name
      );
    }
    
    if (visibleCharacters.length > 0) {
      visibleCharacters.forEach(characterObj => {
        const characterCard = this.createCharacterCard(characterObj);
        charactersList.appendChild(characterCard);
      });
    } else {
      const message = this.currentPlayer?.isGM 
        ? 'No characters created yet'
        : 'You haven\'t created any characters yet';
      charactersList.innerHTML = `<p style="color: #558b2f; font-style: italic;">${message}</p>`;
    }
  }

  /**
   * Create character card element
   */
  createCharacterCard(characterObj) {
    const card = document.createElement('div');
    card.className = 'character-card';
    
    const contents = characterObj.contents;
    const tags = characterObj.tags;
    
    // Build simplified character info HTML - just the name
    let characterInfo = `
      <h4>${this.escapeHtml(contents.characterName)}</h4>
    `;

    // Add actions
    const actionsHTML = `
      <div class="character-card-actions">
        <button class="btn btn-primary btn-small" onclick="gameClient.viewCharacter('${characterObj.id}')">View</button>
        <button class="btn btn-secondary btn-small" onclick="gameClient.editCharacter('${characterObj.id}')">Edit</button>
      </div>
    `;
    
    // Set the basic HTML content
    card.innerHTML = characterInfo + actionsHTML;

         // Add character tags sections as DOM elements
     Object.entries(tags).forEach(([tagType, tagGroup]) => {
       if (typeof tagGroup === 'object' && Object.keys(tagGroup).length > 0) {
         // Handle standard tag types (excluding companions and relationships which are handled separately)
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
             const tagElement = this.createTagElement(tagName);
             tagsContainer.appendChild(tagElement);
           });
           
           tagsSection.appendChild(tagsContainer);
           card.appendChild(tagsSection);
         }
       }
     });

     // Handle status tags separately
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
         const tagElement = this.createTagElement(status.name);
         tagsContainer.appendChild(tagElement);
       });
       
       statusSection.appendChild(tagsContainer);
       card.appendChild(statusSection);
     }
    
    // Handle companions and relationships as linked pairs
    if (tags.companions && tags.relationships && 
        Object.keys(tags.companions).length > 0 && Object.keys(tags.relationships).length > 0) {
      
      const companions = Object.keys(tags.companions);
      const relationships = Object.keys(tags.relationships);
      
      // Create relationships section
      const relationshipsSection = document.createElement('div');
      relationshipsSection.className = 'character-tags-section';
      
      const sectionTitle = document.createElement('h6');
      sectionTitle.textContent = 'RELATIONSHIPS';
      relationshipsSection.appendChild(sectionTitle);
      
      // Create mini table for companion-relationship pairs
      const relationshipsTable = document.createElement('div');
      relationshipsTable.className = 'relationships-table';
      
      // Pair companions with relationships (assuming they're in the same order)
      const pairs = Math.min(companions.length, relationships.length);
      for (let i = 0; i < pairs; i++) {
        const pairRow = document.createElement('div');
        pairRow.className = 'relationship-pair';
        
        const companionCell = document.createElement('div');
        companionCell.className = 'companion-name';
        companionCell.textContent = companions[i];
        
        const relationshipCell = document.createElement('div');
        relationshipCell.className = 'relationship-tag';
        const tagElement = this.createTagElement(relationships[i]);
        relationshipCell.appendChild(tagElement);
        
        pairRow.appendChild(companionCell);
        pairRow.appendChild(relationshipCell);
        relationshipsTable.appendChild(pairRow);
      }
      
      relationshipsSection.appendChild(relationshipsTable);
      card.appendChild(relationshipsSection);
    }
    
    // Group theme attributes by type
    const themeGroups = {};
    Object.entries(tags).forEach(([tagName, tagData]) => {
      if (typeof tagName === 'string' && tagName.includes(': ') && typeof tagData === 'object') {
        // This is a theme attribute tag (e.g., "Circumstances: Crown Courtier")
        const [themeType, tagPart] = tagName.split(': ');
        
        if (!themeGroups[themeType]) {
          themeGroups[themeType] = [];
        }
        themeGroups[themeType].push(tagPart);
      }
    });
    
    // Create theme sections for each type
    Object.entries(themeGroups).forEach(([themeType, tagParts]) => {
      const tagsSection = document.createElement('div');
      tagsSection.className = 'character-tags-section';
      
      const sectionTitle = document.createElement('h6');
      sectionTitle.textContent = themeType.toUpperCase();
      tagsSection.appendChild(sectionTitle);
      
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'character-tags';
      
      tagParts.forEach(tagPart => {
        const tagElement = this.createTagElement(tagPart);
        tagsContainer.appendChild(tagElement);
      });
      
      tagsSection.appendChild(tagsContainer);
      card.appendChild(tagsSection);
    });
    
    return card;
  }

  /**
   * View character details
   */
  viewCharacter(characterId) {
    const characterObj = this.gameState?.gameObjects?.find(obj => obj.id === characterId && obj.type === 'character');
    if (!characterObj) return;

    const contents = characterObj.contents;
    const tags = characterObj.tags;
    
    // Format character data for display
    const quintessences = Object.keys(tags.quintessences || {}).join(', ');
    const companions = Object.keys(tags.companions || {}).join(', ');
    const relationships = Object.keys(tags.relationships || {}).join(', ');
    const backpackItems = Object.keys(tags.backpack || {}).join(', ');
    
         // Format statuses with their track values
     const statuses = [];
     Object.entries(tags).forEach(([tagName, tagData]) => {
       if (tagData && tagData.isStatus) {
         const checkedValues = tagData.checkedValues || [];
         const statusText = checkedValues.length > 0 
           ? `${tagName}-${tagData.trackValue || 0} (${checkedValues.join(',')})`
           : `${tagName}-${tagData.trackValue || 0}`;
         statuses.push(statusText);
       }
     });
     const statusesText = statuses.join(', ');

    const details = `
Character: ${contents.characterName}
Player: ${contents.playerName}
Promise Progress: ${contents.promise?.progress || 0}/5
Quintessences: ${quintessences || 'None'}
Companions: ${companions || 'None'}
Relationships: ${relationships || 'None'}
Items: ${backpackItems || 'None'}
Statuses: ${statusesText || 'None'}
Notes: ${contents.notes || 'None'}
    `;
    
    alert(details);
  }

  /**
   * Edit character
   */
  editCharacter(characterId) {
    console.log('=== DEBUG: editCharacter called ===');
    console.log('Character ID:', characterId);
    console.log('Game state:', this.gameState);
    console.log('Game objects:', this.gameState?.gameObjects);
    
    const characterObj = this.gameState?.gameObjects?.find(obj => obj.id === characterId && obj.type === 'character');
    console.log('Found character object:', characterObj);
    
    if (!characterObj) {
      console.error('Character object not found!');
      return;
    }

    // Set editing mode and store the character being edited
    this.isEditing = true;
    this.editingCharacterId = characterId;

    // Show the modal first
    const overlay = document.getElementById('character-creation-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      // Setup modal event listeners (only once)
      this.setupModalEventListeners();
    }
    
    // Populate form with character data
    this.populateCharacterForm(characterObj);
  }

  /**
   * Populate character form with existing data
   */
  populateCharacterForm(character) {
    console.log('=== DEBUG: populateCharacterForm called ===');
    console.log('Character object:', character);
    console.log('Character contents:', character.contents);
    console.log('Character name from contents:', character.contents.characterName);
    
    const characterNameField = document.getElementById('character-name');
    console.log('Character name field found:', characterNameField);
    if (characterNameField) {
      characterNameField.value = character.contents.characterName || '';
      console.log('Set character name field value to:', characterNameField.value);
    } else {
      console.error('Character name field not found!');
    }
    
    // Set player name and make it read-only
    const playerNameField = document.getElementById('player-name-char');
    if (playerNameField) {
      playerNameField.value = character.contents.playerName || '';
      playerNameField.readOnly = true;
      playerNameField.style.backgroundColor = '#f5f5f5';
      playerNameField.style.color = '#666';
    }
    
    document.getElementById('character-notes').value = character.contents.notes || '';

    // Set promise progress
    this.setPromiseProgress(character.contents.promise?.progress || 0);

    // Populate companions
    console.log('=== DEBUG: Populating companions ===');
    console.log('Companions from character.tags:', character.tags.companions);
    const companionsList = document.getElementById('companions-list');
    console.log('Companions list element found:', companionsList);
    if (companionsList) {
      companionsList.innerHTML = '';
      if (character.tags.companions && Object.keys(character.tags.companions).length > 0) {
        const companionNames = Object.keys(character.tags.companions);
        console.log('Adding companions to form:', companionNames);
        companionNames.forEach(companion => {
          const item = document.createElement('div');
          item.className = 'fellowship-item';
          item.innerHTML = `
            <input type="text" class="tag-input" value="${this.escapeHtml(companion)}" placeholder="Companion name">
            <button type="button" class="remove-btn">×</button>
          `;
          companionsList.appendChild(item);
        });
      } else {
        const item = document.createElement('div');
        item.className = 'fellowship-item';
        item.innerHTML = `
          <input type="text" class="tag-input" placeholder="Companion name">
          <button type="button" class="remove-btn">×</button>
        `;
        companionsList.appendChild(item);
      }
    }

    // Populate relationships
    console.log('=== DEBUG: Populating relationships ===');
    console.log('Relationships from character.tags:', character.tags.relationships);
    const relationshipsList = document.getElementById('relationships-list');
    console.log('Relationships list element found:', relationshipsList);
    if (relationshipsList) {
      relationshipsList.innerHTML = '';
      if (character.tags.relationships && Object.keys(character.tags.relationships).length > 0) {
        const relationshipNames = Object.keys(character.tags.relationships);
        console.log('Adding relationships to form:', relationshipNames);
        relationshipNames.forEach(relationship => {
          const item = document.createElement('div');
          item.className = 'fellowship-item';
          item.innerHTML = `
            <input type="text" class="tag-input" value="${this.escapeHtml(relationship)}" placeholder="Relationship tag">
            <button type="button" class="remove-btn">×</button>
          `;
          relationshipsList.appendChild(item);
        });
      } else {
        const item = document.createElement('div');
        item.className = 'fellowship-item';
        item.innerHTML = `
          <input type="text" class="tag-input" placeholder="Relationship tag">
          <button type="button" class="remove-btn">×</button>
        `;
        relationshipsList.appendChild(item);
      }
    }

    // Populate quintessences
    const quintessencesItems = document.getElementById('quintessences-items');
    if (quintessencesItems) {
      quintessencesItems.innerHTML = '';
      if (character.tags.quintessences && Object.keys(character.tags.quintessences).length > 0) {
        const quintessenceNames = Object.keys(character.tags.quintessences);
        quintessenceNames.forEach(quintessence => {
          const item = document.createElement('div');
          item.className = 'quintessence-item';
          item.innerHTML = `
            <input type="text" class="tag-input" value="${this.escapeHtml(quintessence)}" placeholder="Quintessence tag">
            <button type="button" class="remove-btn">×</button>
          `;
          quintessencesItems.appendChild(item);
        });
      } else {
        const item = document.createElement('div');
        item.className = 'quintessence-item';
        item.innerHTML = `
          <input type="text" class="tag-input" placeholder="Quintessence tag">
          <button type="button" class="remove-btn">×</button>
        `;
        quintessencesItems.appendChild(item);
      }
    }

    // Populate backpack items
    console.log('=== DEBUG: Populating backpack items ===');
    console.log('Backpack items from character.tags:', character.tags.backpack);
    const backpackItems = document.getElementById('backpack-items');
    console.log('Backpack items element found:', backpackItems);
    if (backpackItems) {
      backpackItems.innerHTML = '';
      if (character.tags.backpack && Object.keys(character.tags.backpack).length > 0) {
        const backpackItemNames = Object.keys(character.tags.backpack);
        console.log('Adding backpack items to form:', backpackItemNames);
        backpackItemNames.forEach(item => {
          const itemElement = document.createElement('div');
          itemElement.className = 'backpack-item';
          itemElement.innerHTML = `
            <input type="text" class="tag-input" value="${this.escapeHtml(item)}" placeholder="Item name">
            <button type="button" class="remove-btn">×</button>
          `;
          backpackItems.appendChild(itemElement);
        });
      } else {
        const itemElement = document.createElement('div');
        itemElement.className = 'backpack-item';
        itemElement.innerHTML = `
          <input type="text" class="tag-input" placeholder="Item name">
          <button type="button" class="remove-btn">×</button>
        `;
        backpackItems.appendChild(itemElement);
      }
    }

         // Populate statuses
     console.log('=== DEBUG: Populating statuses ===');
     const statusesContainer = document.getElementById('statuses-container');
     console.log('Statuses container element found:', statusesContainer);
     if (statusesContainer) {
       statusesContainer.innerHTML = '';
       // Find status tags in character.tags
       const statusTags = [];
       Object.entries(character.tags).forEach(([tagName, tagData]) => {
         if (tagData && tagData.isStatus) {
           statusTags.push({ 
             name: tagName, 
             trackValue: tagData.trackValue || 0,
             checkedValues: tagData.checkedValues || []
           });
         }
       });
       console.log('Status tags found:', statusTags);
       
       if (statusTags.length > 0) {
         statusTags.forEach(status => {
           this.createStatusFromData(status);
         });
       }
     }

    // Populate theme cards
    const themeCardsContainer = document.getElementById('theme-cards-container');
    if (themeCardsContainer) {
      themeCardsContainer.innerHTML = '';
      if (character.contents.themeCards && character.contents.themeCards.length > 0) {
        character.contents.themeCards.forEach(themeCard => {
          this.createThemeCardFromData(themeCard);
        });
      }
    }

    // Setup event listeners for populated form elements
    this.setupFormEventListeners();
  }

  /**
   * Setup event listeners for form elements after population
   */
  setupFormEventListeners() {
    // Setup event listeners for companions
    const companionsList = document.getElementById('companions-list');
    if (companionsList) {
      companionsList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.target.closest('.fellowship-item').remove();
        });
      });
    }

    // Setup event listeners for relationships
    const relationshipsList = document.getElementById('relationships-list');
    if (relationshipsList) {
      relationshipsList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.target.closest('.fellowship-item').remove();
        });
      });
    }

    // Setup event listeners for quintessences
    const quintessencesItems = document.getElementById('quintessences-items');
    if (quintessencesItems) {
      quintessencesItems.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.target.closest('.quintessence-item').remove();
        });
      });
    }

    // Setup event listeners for backpack items
    const backpackItems = document.getElementById('backpack-items');
    if (backpackItems) {
      backpackItems.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.target.closest('.backpack-item').remove();
        });
      });
    }
  }

  /**
   * Handle joining a session
   */
  handleJoinSession() {
    const sessionId = document.getElementById('session-id').value.trim();
    const playerName = document.getElementById('player-name').value.trim();
    const isGM = document.getElementById('is-gm').checked;

    if (!sessionId || !playerName) {
      this.showError('Please enter both session ID and player name');
      return;
    }

    console.log('🔗 Attempting to join session:', { sessionId, playerName, isGM });
    this.showLoading(true);

    this.socket.emit('join-session', {
      sessionId: sessionId,
      playerName: playerName,
      isGM: isGM
    });
  }

  /**
   * Handle creating a new session
   */
  handleCreateSession() {
    const sessionId = this.generateSessionId();
    const playerName = document.getElementById('player-name').value.trim();
    
    if (!playerName) {
      this.showError('Please enter your name first');
      return;
    }

    document.getElementById('session-id').value = sessionId;
    document.getElementById('is-gm').checked = true;
    
    this.showError(`New session created: ${sessionId}. You are the Narrator.`, 'info');
  }

  /**
   * Handle leaving the current session
   */
  handleLeaveSession() {
    if (this.socket && this.currentSession) {
      this.socket.emit('leave-session');
      this.showWelcomeScreen();
    }
  }

  /**
   * Handle sending a chat message
   */
  handleSendChat() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;

    this.socket.emit('chat-message', { message: message });
    chatInput.value = '';
  }

  /**
   * Handle adding a note
   */
  handleAddNote() {
    const notesInput = document.getElementById('notes-input');
    const note = notesInput.value.trim();
    
    if (!note) return;

    this.socket.emit('game-action', {
      type: 'add_note',
      note: note,
      author: this.currentPlayer?.name || 'Unknown'
    });
    
    notesInput.value = '';
  }

  /**
   * Handle session joined event
   */
  handleSessionJoined(data) {
    console.log('🎉 Session joined event received:', data);
    this.currentSession = data.session;
    this.currentPlayer = data.player;
    this.gameState = data.gameState;
    
    console.log('📊 Current session state:', {
      sessionJoinComplete: this.sessionJoinComplete,
      currentSession: this.currentSession,
      currentPlayer: this.currentPlayer,
      gameState: this.gameState
    });
    
    // Log detailed game state information
    if (this.gameState) {
      console.log('📊 Game state details:', {
        gameObjectsCount: this.gameState.gameObjects?.length || 0,
        currentScene: this.gameState.currentScene,
        activeChallenge: this.gameState.activeChallenge,
        scenes: this.gameState.gameObjects?.filter(obj => obj.type === 'scene').map(s => ({ id: s.id, name: s.contents.name })) || [],
        characters: this.gameState.gameObjects?.filter(obj => obj.type === 'character').map(c => ({ id: c.id, name: c.contents.characterName })) || []
      });
    }
    
    this.showGameScreen();
    this.updateGameUI();
    this.showLoading(false);
    
    // Add a small delay to ensure server-side processing is complete
    setTimeout(() => {
      this.sessionJoinComplete = true; // Mark session join as complete
      console.log('✅ Session join complete, dice rolls now allowed');
    }, 100);
  }

  /**
   * Handle player joined event
   */
  handlePlayerJoined(data) {
    // Update session data if provided
    if (data.session) {
      this.currentSession = data.session;
    }
    
    this.updatePlayersList();
    this.showNotification(`${data.player.name} joined the session`);
  }

  /**
   * Handle player left event
   */
  handlePlayerLeft(data) {
    // Update session data if provided
    if (data.session) {
      this.currentSession = data.session;
    }
    
    this.updatePlayersList();
    this.showNotification(`${data.playerName} left the session`);
  }

  /**
   * Handle player disconnected event
   */
  handlePlayerDisconnected(data) {
    // Update session data if provided
    if (data.session) {
      this.currentSession = data.session;
    }
    
    this.updatePlayersList();
    this.showNotification(`${data.playerName} disconnected`);
  }

  /**
   * Handle game state update
   */
  handleGameStateUpdate(data) {
    console.log('🔄 Game state update received:', {
      gameObjectsCount: data.gameState?.gameObjects?.length || 0,
      scenes: data.gameState?.gameObjects?.filter(obj => obj.type === 'scene').map(s => ({ id: s.id, name: s.contents.name })) || [],
      currentScene: data.gameState?.currentScene,
      activeChallenge: data.gameState?.activeChallenge
    });
    
    this.gameState = data.gameState;
    
    // Update the entire UI (which includes updateActiveScene)
    this.updateGameUI();
  }

  /**
   * Handle chat message
   */
  handleChatMessage(data) {
    this.addChatMessage(data);
  }

  /**
   * Handle dice roll response
   */
  handleDiceRoll(data) {
    console.log('🎲 handleDiceRoll received data:', data);
    this.addDiceResult(data);
    
    // Clear selected tags after receiving the dice roll result
    console.log('🧹 Clearing selected tags after dice roll');
    this.selectedTags = [];
    this.updateSelectedTagsDisplay();
    this.updateRollButton();
    this.isRolling = false; // Reset rolling flag
    
    console.log('✅ Dice roll processing complete');
  }

  /**
   * Update the game UI with current state
   */
  updateGameUI() {
    if (!this.gameState) return;

    // Update session info
    document.getElementById('session-name').textContent = this.currentSession?.name || 'Unknown';
    const playerCount = Array.isArray(this.currentSession?.players) 
      ? this.currentSession.players.length 
      : this.currentSession?.players?.size || 0;
    document.getElementById('player-count').textContent = `Players: ${playerCount}`;

    // Update active scene from game state (this handles scene loading for new users)
    this.updateActiveScene();

    // Update scene display
    this.updateSceneDisplay();

    // Update scene tags
    this.updateSceneTags();

    // Update challenge display (important for broadcasting challenge state changes)
    this.updateChallengeDisplay();

    // Update challenges dropdown (important for reflecting challenge state changes)
    if (this.currentPlayer?.isGM) {
      this.populateChallengesDropdown();
    }

    // Show/hide create scene button for Narrators
    this.updateSceneControls();

    // Update players list
    this.updatePlayersList();

    // Update chat
    this.updateChatMessages();

    // Update notes
    this.updateNotesList();

    // Update dice results
    this.updateDiceResults();

    // Update characters list
    this.updateCharactersList();
  }

  /**
   * Update scene tags display
   */
  updateSceneTags() {
    const sceneTagsContainer = document.getElementById('scene-tags');
    if (!sceneTagsContainer) return;

    sceneTagsContainer.innerHTML = '';
    
    // Only show tags if there's an active scene
    if (!this.activeScene || !this.activeScene.tags) {
      sceneTagsContainer.innerHTML = '<span style="color: #558b2f; font-style: italic;">No scene tags</span>';
      return;
    }

    // Display all tags from the active scene
    Object.entries(this.activeScene.tags).forEach(([tagName, tagData]) => {
      const tagElement = this.createTagElement(tagName);
      sceneTagsContainer.appendChild(tagElement);
    });

    if (sceneTagsContainer.children.length === 0) {
      sceneTagsContainer.innerHTML = '<span style="color: #558b2f; font-style: italic;">No scene tags</span>';
    }
  }

  /**
   * Update players list
   */
  updatePlayersList() {
    const playersList = document.getElementById('players-list');
    if (!playersList || !this.currentSession) return;

    playersList.innerHTML = '';
    
    // Handle different formats for players data
    let players = [];
    if (this.currentSession.players) {
      if (Array.isArray(this.currentSession.players)) {
        players = this.currentSession.players;
      } else if (this.currentSession.players.values && typeof this.currentSession.players.values === 'function') {
        // It's a Map-like object
        players = Array.from(this.currentSession.players.values());
      } else if (typeof this.currentSession.players === 'object') {
        // It's a plain object, convert to array
        players = Object.values(this.currentSession.players);
      }
    }
    
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
  }

  /**
   * Update chat messages
   */
  updateChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages || !this.gameState) return;

    chatMessages.innerHTML = '';
    
    this.gameState.chat.forEach(message => {
      this.addChatMessage(message);
    });
  }

  /**
   * Add a chat message to the UI
   */
  addChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    messageElement.innerHTML = `
      <div class="chat-author">${message.playerName}</div>
      <div class="chat-text">${this.escapeHtml(message.message)}</div>
      <div class="chat-timestamp">${timestamp}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Update notes list
   */
  updateNotesList() {
    const notesList = document.getElementById('notes-list');
    if (!notesList || !this.gameState) return;

    notesList.innerHTML = '';
    
    this.gameState.notes.forEach(note => {
      const noteElement = document.createElement('div');
      noteElement.className = 'note-item';
      
      const timestamp = new Date(note.timestamp).toLocaleString();
      
      noteElement.innerHTML = `
        <div class="note-text">${this.escapeHtml(note.text)}</div>
        <div class="note-meta">
          <span>${note.author}</span>
          <span>${timestamp}</span>
        </div>
      `;
      
      notesList.appendChild(noteElement);
    });
  }

  /**
   * Update dice results
   */
  updateDiceResults() {
    const diceResults = document.getElementById('dice-results');
    if (!diceResults || !this.gameState) return;

    diceResults.innerHTML = '';
    
    this.gameState.diceRolls.forEach(roll => {
      this.addDiceResult(roll);
    });
  }

  /**
   * Add a dice result to the UI
   */
  addDiceResult(rollData) {
    const diceResults = document.getElementById('dice-results');
    if (!diceResults) return;

    // Remove 'most-recent' class from any existing rolls
    const existingRolls = diceResults.querySelectorAll('.dice-result');
    existingRolls.forEach(roll => roll.classList.remove('most-recent'));

    const resultElement = document.createElement('div');
    resultElement.className = 'dice-result most-recent';
    
    const modifierText = rollData.modifier > 0 ? `+${rollData.modifier}` : 
                        rollData.modifier < 0 ? `${rollData.modifier}` : '';
    
    // Handle both old and new data structures
    const rolls = rollData.rolls || (rollData.result ? rollData.result.rolls : []);
    const total = rollData.total || (rollData.result ? rollData.result.total : 0);
    
    resultElement.innerHTML = `
      <div class="dice-roll-header">
        <strong>${rollData.playerName}</strong> rolled ${rollData.dice || '2d6'}${modifierText} = 
        <strong class="dice-total recent">${total}</strong>
      </div>
      <div class="dice-roll-details">
        <small>Rolls: [${rolls.join(', ')}]</small>
        ${rollData.description ? `<br><small>${rollData.description}</small>` : ''}
      </div>
    `;
    
    // Prepend the new result at the top
    diceResults.insertBefore(resultElement, diceResults.firstChild);
    
    // Scroll to top to show the new result
    diceResults.scrollTop = 0;
  }

  /**
   * Show welcome screen
   */
  showWelcomeScreen() {
    document.getElementById('welcome-screen').classList.add('active');
    document.getElementById('game-screen').classList.remove('active');
    
    this.currentSession = null;
    this.currentPlayer = null;
    this.gameState = null;
    this.sessionJoinComplete = false; // Reset session join flag
  }

  /**
   * Show game screen
   */
  showGameScreen() {
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(text, status) {
    const statusText = document.getElementById('status-text');
    const indicator = document.getElementById('connection-indicator');
    
    if (statusText) statusText.textContent = text;
    if (indicator) {
      indicator.className = `indicator ${status}`;
    }
  }

  /**
   * Show loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  /**
   * Show error message
   */
  showError(message, type = 'error') {
    const errorContainer = document.getElementById('error-container');
    const errorText = document.getElementById('error-text');
    
    if (errorContainer && errorText) {
      errorText.textContent = message;
      errorContainer.classList.remove('hidden');
      
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
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
  }

  /**
   * Show notification
   */
  showNotification(message) {
    // Simple notification - could be enhanced with a proper notification system
    console.log('Notification:', message);
  }

  /**
   * Generate a random session ID
   */
  generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the game client when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.gameClient = new GameClient();
});
