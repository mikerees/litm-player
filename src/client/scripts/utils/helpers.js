/**
 * Helper functions for LitMPlayer Game Client
 */

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate a random session ID
 * @param {number} length - Length of the session ID
 * @returns {string} Random session ID
 */
export function generateSessionId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique challenge ID
 * @returns {string} Unique challenge ID
 */
export function generateChallengeId() {
  return 'challenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Format timestamp for display
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format time for display
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted time
 */
export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {string} expectedType - Expected MIME type prefix
 * @returns {boolean} Whether file is valid
 */
export function validateFileType(file, expectedType = 'image/') {
  return file.type.startsWith(expectedType);
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {boolean} Whether file size is valid
 */
export function validateFileSize(file, maxSize = 10 * 1024 * 1024) {
  return file.size <= maxSize;
}

/**
 * Get element by ID with error handling
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null if not found
 */
export function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with ID '${id}' not found`);
  }
  return element;
}

/**
 * Add class to element
 * @param {string} id - Element ID
 * @param {string} className - Class to add
 */
export function addClass(id, className) {
  const element = getElement(id);
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Remove class from element
 * @param {string} id - Element ID
 * @param {string} className - Class to remove
 */
export function removeClass(id, className) {
  const element = getElement(id);
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * Toggle class on element
 * @param {string} id - Element ID
 * @param {string} className - Class to toggle
 */
export function toggleClass(id, className) {
  const element = getElement(id);
  if (element) {
    element.classList.toggle(className);
  }
}

/**
 * Set element text content
 * @param {string} id - Element ID
 * @param {string} text - Text to set
 */
export function setText(id, text) {
  const element = getElement(id);
  if (element) {
    element.textContent = text;
  }
}

/**
 * Set element inner HTML
 * @param {string} id - Element ID
 * @param {string} html - HTML to set
 */
export function setHTML(id, html) {
  const element = getElement(id);
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Show element
 * @param {string} id - Element ID
 */
export function showElement(id) {
  removeClass(id, 'hidden');
}

/**
 * Hide element
 * @param {string} id - Element ID
 */
export function hideElement(id) {
  addClass(id, 'hidden');
}

/**
 * Check if element is visible
 * @param {string} id - Element ID
 * @returns {boolean} Whether element is visible
 */
export function isElementVisible(id) {
  const element = getElement(id);
  return element && !element.classList.contains('hidden');
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Merge objects deeply
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
export function deepMerge(...objects) {
  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];
      
      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal);
      } else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = deepMerge(pVal, oVal);
      } else {
        prev[key] = oVal;
      }
    });
    return prev;
  }, {});
}

/**
 * Check if value is an object
 * @param {*} val - Value to check
 * @returns {boolean} Whether value is an object
 */
function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Get random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate dice roll result
 * @param {number} diceCount - Number of dice
 * @param {number} sides - Number of sides per die
 * @param {number} modifier - Modifier to add
 * @returns {Object} Roll result with rolls array and total
 */
export function calculateDiceRoll(diceCount = 2, sides = 6, modifier = 0) {
  const rolls = [];
  for (let i = 0; i < diceCount; i++) {
    rolls.push(getRandomInt(1, sides));
  }
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  return { rolls, total };
}
