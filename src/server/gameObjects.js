/**
 * Game Object Manager for LitMPlayer
 * Manages all game objects (characters, scenes, challenges, etc.) with universal JSON structure
 */

class GameObjectManager {
  constructor() {
    this.gameObjects = new Map(); // sessionId -> Map of objectId -> gameObject
    this.nextObjectId = 1;
  }

  /**
   * Create a new game object
   * @param {string} sessionId - Session identifier
   * @param {string} type - Object type (character, scene, challenge, etc.)
   * @param {Object} contents - Custom content for the object type
   * @param {Object} tags - Tags object with different tag types
   * @param {string} createdBy - Player ID who created the object
   * @returns {Object} The created game object
   */
  createGameObject(sessionId, type, contents = {}, tags = {}, createdBy = null) {
    if (!this.gameObjects.has(sessionId)) {
      this.gameObjects.set(sessionId, new Map());
    }

    const sessionObjects = this.gameObjects.get(sessionId);
    const objectId = this.generateObjectId();
    
    const gameObject = {
      id: objectId,
      type: type,
      contents: contents,
      tags: tags,
      createdBy: createdBy,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      lastModifiedBy: createdBy
    };

    sessionObjects.set(objectId, gameObject);
    console.log(`🎯 Created ${type} object ${objectId} in session ${sessionId}`);
    console.log(`🎯 Object details:`, {
      id: objectId,
      type: type,
      contents: contents,
      tagsCount: Object.keys(tags).length,
      createdBy: createdBy
    });
    
    return gameObject;
  }

  /**
   * Get a game object by ID
   * @param {string} sessionId - Session identifier
   * @param {string} objectId - Object identifier
   * @returns {Object|null} Game object or null
   */
  getGameObject(sessionId, objectId) {
    const sessionObjects = this.gameObjects.get(sessionId);
    if (!sessionObjects) return null;
    
    return sessionObjects.get(objectId) || null;
  }

  /**
   * Get all game objects in a session
   * @param {string} sessionId - Session identifier
   * @param {string} type - Optional filter by object type
   * @returns {Array} Array of game objects
   */
  getSessionObjects(sessionId, type = null) {
    const sessionObjects = this.gameObjects.get(sessionId);
    if (!sessionObjects) return [];

    const objects = Array.from(sessionObjects.values());
    
    if (type) {
      return objects.filter(obj => obj.type === type);
    }
    
    return objects;
  }

  /**
   * Update a game object
   * @param {string} sessionId - Session identifier
   * @param {string} objectId - Object identifier
   * @param {Object} updates - Object with fields to update
   * @param {string} modifiedBy - Player ID who made the changes
   * @returns {Object|null} Updated game object or null
   */
  updateGameObject(sessionId, objectId, updates, modifiedBy = null) {
    const gameObject = this.getGameObject(sessionId, objectId);
    if (!gameObject) return null;

    // Update allowed fields
    if (updates.contents !== undefined) {
      gameObject.contents = { ...gameObject.contents, ...updates.contents };
    }
    
    if (updates.tags !== undefined) {
      gameObject.tags = updates.tags;
    }

    gameObject.lastModified = new Date().toISOString();
    gameObject.lastModifiedBy = modifiedBy;

    console.log(`✏️ Updated ${gameObject.type} object ${objectId} in session ${sessionId}`);
    
    return gameObject;
  }

  /**
   * Delete a game object
   * @param {string} sessionId - Session identifier
   * @param {string} objectId - Object identifier
   * @returns {boolean} True if object was deleted
   */
  deleteGameObject(sessionId, objectId) {
    const sessionObjects = this.gameObjects.get(sessionId);
    if (!sessionObjects) return false;

    const deleted = sessionObjects.delete(objectId);
    if (deleted) {
      console.log(`🗑️ Deleted object ${objectId} from session ${sessionId}`);
    }
    
    return deleted;
  }

  /**
   * Add a tag to a game object
   * @param {string} sessionId - Session identifier
   * @param {string} objectId - Object identifier
   * @param {string} tagType - Type of tag (e.g., 'helpful', 'harmful', 'environmental')
   * @param {string} tagName - Name of the tag
   * @param {number} modifier - Modifier value (+1 or -1)
   * @param {string} addedBy - Player ID who added the tag
   * @returns {Object|null} Updated game object or null
   */
  addTag(sessionId, objectId, tagType, tagName, modifier, addedBy = null) {
    const gameObject = this.getGameObject(sessionId, objectId);
    if (!gameObject) return null;

    if (!gameObject.tags[tagType]) {
      gameObject.tags[tagType] = {};
    }

    gameObject.tags[tagType][tagName] = {
      modifier: modifier,
      addedBy: addedBy,
      addedAt: new Date().toISOString()
    };

    gameObject.lastModified = new Date().toISOString();
    gameObject.lastModifiedBy = addedBy;

    console.log(`🏷️ Added tag ${tagName} (${modifier > 0 ? '+' : ''}${modifier}) to ${gameObject.type} ${objectId}`);
    
    return gameObject;
  }

  /**
   * Remove a tag from a game object
   * @param {string} sessionId - Session identifier
   * @param {string} objectId - Object identifier
   * @param {string} tagType - Type of tag
   * @param {string} tagName - Name of the tag
   * @param {string} removedBy - Player ID who removed the tag
   * @returns {Object|null} Updated game object or null
   */
  removeTag(sessionId, objectId, tagType, tagName, removedBy = null) {
    const gameObject = this.getGameObject(sessionId, objectId);
    if (!gameObject || !gameObject.tags[tagType] || !gameObject.tags[tagType][tagName]) {
      return null;
    }

    delete gameObject.tags[tagType][tagName];
    
    // Clean up empty tag types
    if (Object.keys(gameObject.tags[tagType]).length === 0) {
      delete gameObject.tags[tagType];
    }

    gameObject.lastModified = new Date().toISOString();
    gameObject.lastModifiedBy = removedBy;

    console.log(`🏷️ Removed tag ${tagName} from ${gameObject.type} ${objectId}`);
    
    return gameObject;
  }

  /**
   * Calculate total modifier for a dice roll based on relevant tags
   * @param {string} sessionId - Session identifier
   * @param {Array} relevantObjectIds - Array of object IDs that are relevant to the roll
   * @returns {number} Total modifier
   */
  calculateModifier(sessionId, relevantObjectIds) {
    let totalModifier = 0;
    
    for (const objectId of relevantObjectIds) {
      const gameObject = this.getGameObject(sessionId, objectId);
      if (!gameObject) continue;

      // Sum up all tag modifiers
      for (const tagType in gameObject.tags) {
        for (const tagName in gameObject.tags[tagType]) {
          const tag = gameObject.tags[tagType][tagName];
          totalModifier += tag.modifier;
        }
      }
    }
    
    return totalModifier;
  }

  /**
   * Get all tags from relevant objects for display
   * @param {string} sessionId - Session identifier
   * @param {Array} relevantObjectIds - Array of object IDs that are relevant
   * @returns {Object} Object with tag information for display
   */
  getRelevantTags(sessionId, relevantObjectIds) {
    const relevantTags = {
      helpful: [],
      harmful: [],
      environmental: [],
      character: [],
      other: []
    };
    
    for (const objectId of relevantObjectIds) {
      const gameObject = this.getGameObject(sessionId, objectId);
      if (!gameObject) continue;

      for (const tagType in gameObject.tags) {
        for (const tagName in gameObject.tags[tagType]) {
          const tag = gameObject.tags[tagType][tagName];
          const tagInfo = {
            name: tagName,
            modifier: tag.modifier,
            source: `${gameObject.type}: ${gameObject.contents.name || gameObject.id}`,
            objectId: objectId,
            addedBy: tag.addedBy
          };

          if (relevantTags[tagType]) {
            relevantTags[tagType].push(tagInfo);
          } else {
            relevantTags.other.push(tagInfo);
          }
        }
      }
    }
    
    return relevantTags;
  }

  /**
   * Restore a game object from saved data
   * @param {string} sessionId - Session identifier
   * @param {Object} gameObject - Game object to restore
   */
  restoreGameObject(sessionId, gameObject) {
    if (!this.gameObjects.has(sessionId)) {
      this.gameObjects.set(sessionId, new Map());
    }

    const sessionObjects = this.gameObjects.get(sessionId);
    sessionObjects.set(gameObject.id, gameObject);
    
    // Update nextObjectId to ensure it's higher than any existing object ID
    const objectIdNumber = parseInt(gameObject.id.replace('obj_', ''));
    if (objectIdNumber >= this.nextObjectId) {
      this.nextObjectId = objectIdNumber + 1;
    }
    
    console.log(`📂 Restored ${gameObject.type} object ${gameObject.id} in session ${sessionId}`);
  }

  /**
   * Clean up game objects for a session
   * @param {string} sessionId - Session identifier
   */
  cleanupSession(sessionId) {
    this.gameObjects.delete(sessionId);
    console.log(`🧹 Cleaned up game objects for session ${sessionId}`);
  }

  /**
   * Generate a unique object ID
   * @returns {string} Unique object ID
   */
  generateObjectId() {
    return `obj_${this.nextObjectId++}`;
  }

  /**
   * Get statistics about game objects in a session
   * @param {string} sessionId - Session identifier
   * @returns {Object} Statistics object
   */
  getSessionStats(sessionId) {
    const objects = this.getSessionObjects(sessionId);
    const stats = {
      totalObjects: objects.length,
      objectTypes: {},
      totalTags: 0
    };

    for (const obj of objects) {
      // Count by type
      stats.objectTypes[obj.type] = (stats.objectTypes[obj.type] || 0) + 1;
      
      // Count tags
      for (const tagType in obj.tags) {
        stats.totalTags += Object.keys(obj.tags[tagType]).length;
      }
    }

    return stats;
  }
}

module.exports = GameObjectManager;
