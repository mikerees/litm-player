/**
 * Constants for LitMPlayer Game Client
 */

// WebSocket Events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTED: 'connected',
  SESSION_JOINED: 'session-joined',
  SESSION_LEFT: 'session-left',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  PLAYER_DISCONNECTED: 'player-disconnected',
  GAME_STATE_UPDATED: 'game-state-updated',
  CURRENT_GAME_STATE: 'current-game-state',
  CHAT_MESSAGE: 'chat-message',
  DICE_ROLLED: 'dice-rolled',
  SAVED_SESSIONS: 'saved-sessions',
  SESSION_PLAYERS: 'session-players',
  ERROR: 'error'
};

// Client Events
export const CLIENT_EVENTS = {
  JOIN_SESSION: 'join-session',
  LEAVE_SESSION: 'leave-session',
  GAME_ACTION: 'game-action',
  CHAT_MESSAGE: 'chat-message',
  ROLL_DICE: 'roll-dice',
  GET_SAVED_SESSIONS: 'get-saved-sessions',
  GET_SESSION_PLAYERS: 'get-session-players',
  GET_CURRENT_GAME_STATE: 'get-current-game-state',
  GET_CURRENT_SESSION_STATE: 'get-current-session-state'
};

// Game Action Types
export const ACTION_TYPES = {
  CREATE_OBJECT: 'create_object',
  UPDATE_OBJECT: 'update_object',
  DELETE_OBJECT: 'delete_object',
  ADD_TAG: 'add_tag',
  REMOVE_TAG: 'remove_tag',
  ROLL_DICE: 'roll_dice',
  SET_SCENE: 'set_scene',
  SET_CHALLENGE: 'set_challenge',
  SET_ACTIVE_CHALLENGE: 'set_active_challenge',
  CLEAR_ACTIVE_CHALLENGE: 'clear_active_challenge',
  OVERCOME_CHALLENGE: 'overcome_challenge',
  TOGGLE_OVERCOME_CHALLENGE: 'toggle_overcome_challenge',
  ADD_NOTE: 'add_note'
};

// Object Types
export const OBJECT_TYPES = {
  CHARACTER: 'character',
  SCENE: 'scene',
  CHALLENGE: 'challenge',
  FELLOWSHIP: 'fellowship'
};

// Tag Effects
export const TAG_EFFECTS = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  BURN: 'burn'
};

// UI States
export const UI_STATES = {
  CONNECTING: 'connecting',
  ONLINE: 'online',
  OFFLINE: 'offline'
};

// CSS Classes
export const CSS_CLASSES = {
  HIDDEN: 'hidden',
  SHOW: 'show',
  ACTIVE: 'active',
  SCRATCHED: 'scratched',
  FILLED: 'filled',
  CHECKED: 'checked',
  MOST_RECENT: 'most-recent'
};

// Default Values
export const DEFAULTS = {
  SESSION_ID_LENGTH: 6,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  SESSION_TIMEOUT: 3600000 // 1 hour
};

// DOM Element IDs
export const ELEMENT_IDS = {
  WELCOME_SCREEN: 'welcome-screen',
  GAME_SCREEN: 'game-screen',
  LOADING_OVERLAY: 'loading-overlay',
  ERROR_CONTAINER: 'error-container',
  ERROR_TEXT: 'error-text',
  ERROR_CLOSE: 'error-close',
  STATUS_TEXT: 'status-text',
  CONNECTION_INDICATOR: 'connection-indicator',
  SESSION_NAME: 'session-name',
  PLAYER_COUNT: 'player-count',
  PLAYERS_LIST: 'players-list',
  CHAT_MESSAGES: 'chat-messages',
  CHAT_INPUT: 'chat-input',
  SEND_CHAT_BTN: 'send-chat-btn',
  NOTES_LIST: 'notes-list',
  NOTES_INPUT: 'notes-input',
  ADD_NOTE_BTN: 'add-note-btn',
  DICE_RESULTS: 'dice-results',
  ROLL_DICE_BTN: 'roll-dice-btn',
  SELECTED_TAGS_CONTAINER: 'selected-tags-container',
  CHARACTERS_LIST: 'characters-list',
  SCENE_TITLE: 'scene-title',
  SCENE_IMAGE: 'scene-image',
  SCENE_DESCRIPTION: 'scene-description',
  SCENE_TAGS: 'scene-tags',
  ACTIVE_CHALLENGE_OVERLAY: 'active-challenge-overlay',
  ACTIVE_CHALLENGE_TITLE: 'active-challenge-title',
  ACTIVE_CHALLENGE_TAGS: 'active-challenge-tags',
  ACTIVE_CHALLENGE_DETAILS: 'active-challenge-details',
  ACTIVE_CHALLENGE_SUCCESS: 'active-challenge-success',
  ACTIVE_CHALLENGE_CONSEQUENCES: 'active-challenge-consequences'
};
