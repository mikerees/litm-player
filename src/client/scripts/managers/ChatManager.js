/**
 * Chat Manager for LitMPlayer Game Client
 * Handles chat message sending and receiving
 */

export class ChatManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
  }

  /**
   * Handle sending a chat message
   */
  handleSendChat() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;

    this.gameClient.webSocketManager.sendChatMessage({ message: message });
    chatInput.value = '';
  }

  /**
   * Handle chat message from server
   * @param {Object} data - Chat message data
   */
  handleChatMessage(data) {
    this.gameClient.uiManager.addChatMessage(data);
  }

  /**
   * Update chat messages from game state
   * @param {Array} messages - Array of chat messages
   */
  updateChatMessages(messages = []) {
    this.gameClient.uiManager.updateChatMessages(messages);
  }

  /**
   * Add a chat message to the UI
   * @param {Object} message - Chat message object
   */
  addChatMessage(message) {
    this.gameClient.uiManager.addChatMessage(message);
  }

  /**
   * Clear chat input
   */
  clearChatInput() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = '';
    }
  }

  /**
   * Focus chat input
   */
  focusChatInput() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.focus();
    }
  }

  /**
   * Send a system message (for notifications, etc.)
   * @param {string} message - System message
   */
  sendSystemMessage(message) {
    // This could be enhanced to send system messages to chat
    console.log('System message:', message);
  }
}
