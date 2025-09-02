/**
 * Notes Manager for LitMPlayer Game Client
 * Handles notes creation and management
 */

import { ACTION_TYPES } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export class NotesManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
  }

  /**
   * Handle adding a note
   */
  handleAddNote() {
    const notesInput = document.getElementById('notes-input');
    const noteText = notesInput.value.trim();
    
    if (!noteText) return;

    this.gameClient.webSocketManager.sendGameAction({
      type: ACTION_TYPES.ADD_NOTE,
      noteText: noteText
    });

    notesInput.value = '';
  }

  /**
   * Update notes list
   * @param {Array} notes - Array of note objects
   */
  updateNotesList(notes = []) {
    this.gameClient.uiManager.updateNotesList(notes);
  }

  /**
   * Add a note to the UI
   * @param {Object} note - Note object
   */
  addNote(note) {
    this.gameClient.uiManager.addNote(note);
  }

  /**
   * Clear notes input
   */
  clearNotesInput() {
    const notesInput = document.getElementById('notes-input');
    if (notesInput) {
      notesInput.value = '';
    }
  }

  /**
   * Focus notes input
   */
  focusNotesInput() {
    const notesInput = document.getElementById('notes-input');
    if (notesInput) {
      notesInput.focus();
    }
  }

  /**
   * Get all notes from game state
   * @returns {Array} Array of note objects
   */
  getAllNotes() {
    return this.gameClient.gameState?.notes || [];
  }

  /**
   * Create note element
   * @param {Object} note - Note object
   * @returns {HTMLElement} Note element
   */
  createNoteElement(note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    
    const timestamp = new Date(note.timestamp).toLocaleString();
    
    noteElement.innerHTML = `
      <div class="note-text">${escapeHtml(note.text)}</div>
      <div class="note-meta">
        <span>${note.author}</span>
        <span>${timestamp}</span>
      </div>
    `;
    
    return noteElement;
  }

  /**
   * Handle notes input key press
   * @param {Event} event - Key press event
   */
  handleNotesKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleAddNote();
    }
  }

  /**
   * Get notes count
   * @returns {number} Number of notes
   */
  getNotesCount() {
    return this.getAllNotes().length;
  }

  /**
   * Check if notes exist
   * @returns {boolean} Whether notes exist
   */
  hasNotes() {
    return this.getNotesCount() > 0;
  }

  /**
   * Get latest note
   * @returns {Object|null} Latest note object
   */
  getLatestNote() {
    const notes = this.getAllNotes();
    return notes.length > 0 ? notes[notes.length - 1] : null;
  }

  /**
   * Get notes by author
   * @param {string} author - Author name
   * @returns {Array} Array of notes by author
   */
  getNotesByAuthor(author) {
    return this.getAllNotes().filter(note => note.author === author);
  }

  /**
   * Get notes since timestamp
   * @param {Date} timestamp - Timestamp to filter from
   * @returns {Array} Array of notes since timestamp
   */
  getNotesSince(timestamp) {
    return this.getAllNotes().filter(note => new Date(note.timestamp) > timestamp);
  }
}
