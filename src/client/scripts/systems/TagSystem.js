/**
 * Tag System for LitMPlayer Game Client
 * Manages tag creation, selection, and dice rolling integration
 */

import { TAG_EFFECTS, CSS_CLASSES } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export class TagSystem {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.selectedTags = []; // Array of {tag: string, effect: 'positive'|'negative'}
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
        <button class="burn-tag">Burn Tag</button>
        <button class="scratch-tag">${tagElement.classList.contains(CSS_CLASSES.SCRATCHED) ? 'Unscratch Tag' : 'Scratch Tag'}</button>
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
      contextMenu.classList.add(CSS_CLASSES.SHOW);
      
      // Handle context menu actions
      contextMenu.querySelector('.add-power').addEventListener('click', (e) => {
        e.stopPropagation();
        this.addTagToRoll(tagText, TAG_EFFECTS.POSITIVE);
        this.hideAllContextMenus();
      });
      
      contextMenu.querySelector('.add-weakness').addEventListener('click', (e) => {
        e.stopPropagation();
        this.addTagToRoll(tagText, TAG_EFFECTS.NEGATIVE);
        this.hideAllContextMenus();
      });
      
      contextMenu.querySelector('.burn-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        this.burnTag(tagElement, tagText);
        this.hideAllContextMenus();
      });
      
      contextMenu.querySelector('.scratch-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        if (tagElement.classList.contains(CSS_CLASSES.SCRATCHED)) {
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
      menu.classList.remove(CSS_CLASSES.SHOW);
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
    if (tagElement && tagElement.classList.contains(CSS_CLASSES.SCRATCHED)) {
      console.log(`❌ Cannot add scratched tag "${tagText}" to roll`);
      return;
    }
    
    // For theme attributes and statuses, we need to find the full stored tag name
    let storedTagName = tagText;
    let tagData = null;
    if (this.gameClient.gameState?.gameObjects) {
      this.gameClient.gameState.gameObjects.forEach(obj => {
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
   * Burn a tag (add to roll with +3 power and scratch it)
   * @param {HTMLElement} tagElement - The tag element
   * @param {string} tagText - The tag text
   */
  burnTag(tagElement, tagText) {
    console.log(`🔥 Burning tag: "${tagText}"`);
    
    // Add the tag to the roll with BURN effect (which gives +3 power)
    this.addTagToRoll(tagText, TAG_EFFECTS.BURN);
    
    // Scratch the tag (mark as unusable)
    this.scratchTag(tagElement, tagText);
    
    console.log(`✅ Tag "${tagText}" burned successfully`);
  }

  /**
   * Scratch a tag (mark as unusable)
   * @param {HTMLElement} tagElement - The tag element
   * @param {string} tagText - The tag text
   */
  scratchTag(tagElement, tagText) {
    console.log(`❌ Scratching tag: "${tagText}"`);
    
    // Add scratched class to tag element
    tagElement.classList.add(CSS_CLASSES.SCRATCHED);
    
    // Check if this tag is being burned (should stay in selected tags)
    const isBeingBurned = this.selectedTags.some(t => t.tag === tagText && t.effect === TAG_EFFECTS.BURN);
    
    // Only remove from selected tags if it's not being burned
    if (!isBeingBurned) {
      this.removeTagFromRoll(tagText);
    }
    
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
    tagElement.classList.remove(CSS_CLASSES.SCRATCHED);
    
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
      
      // Add special styling for burned tags
      let tagContent = escapeHtml(displayTag);
      if (tagData.effect === TAG_EFFECTS.BURN) {
        tagContent = `🔥 ${tagContent} (BURNED)`;
      }
      
      tagElement.innerHTML = `
        ${tagContent}
        <button class="remove-btn" onclick="gameClient.tagSystem.removeTagFromRoll('${escapeHtml(tagData.tag)}')">×</button>
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
      
      if (tag.effect === TAG_EFFECTS.POSITIVE) {
        modifier += tagModifier;
      } else if (tag.effect === TAG_EFFECTS.NEGATIVE) {
        modifier -= tagModifier;
      } else if (tag.effect === TAG_EFFECTS.BURN) {
        modifier += 3; // Burned tags give +3 power
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
   * Clear all selected tags
   */
  clearSelectedTags() {
    this.selectedTags = [];
    this.updateSelectedTagsDisplay();
    this.updateRollButton();
  }

  /**
   * Get selected tags
   * @returns {Array} Array of selected tags
   */
  getSelectedTags() {
    return this.selectedTags;
  }

  /**
   * Calculate modifier from selected tags
   * @returns {number} Total modifier
   */
  calculateModifier() {
    let modifier = 0;
    this.selectedTags.forEach(tag => {
      let tagModifier = 1; // Default modifier for regular tags
      
      // For status tags, use the track value
      if (tag.tagData && tag.tagData.isStatus && tag.tagData.trackValue > 0) {
        tagModifier = tag.tagData.trackValue;
      }
      
      if (tag.effect === TAG_EFFECTS.POSITIVE) {
        modifier += tagModifier;
      } else if (tag.effect === TAG_EFFECTS.NEGATIVE) {
        modifier -= tagModifier;
      } else if (tag.effect === TAG_EFFECTS.BURN) {
        modifier += 3; // Burned tags give +3 power
      }
    });
    return modifier;
  }
}
