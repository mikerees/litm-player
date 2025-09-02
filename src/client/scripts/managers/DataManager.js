/**
 * Data Manager for LitMPlayer Game Client
 * Handles data persistence and file uploads
 */

import { DEFAULTS } from '../utils/constants.js';
import { validateFileType, validateFileSize } from '../utils/helpers.js';

export class DataManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.uploadedImageUrl = null; // Store uploaded image URL for scene creation
  }

  /**
   * Upload image file to server
   * @param {File} file - File to upload
   * @returns {Promise<string>} Uploaded file URL
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
   * @param {Event} event - File selection event
   */
  handleSceneImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('scene-image-preview');
    const previewImg = document.getElementById('scene-preview-img');
    const removeBtn = document.getElementById('remove-scene-image');

    if (file) {
      // Validate file type
      if (!validateFileType(file)) {
        alert('Please select an image file.');
        event.target.value = '';
        return;
      }

      // Validate file size
      if (!validateFileSize(file, DEFAULTS.MAX_FILE_SIZE)) {
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
   * Handle scene edit image file selection
   * @param {Event} event - File selection event
   */
  handleSceneEditImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('scene-edit-image-preview');
    const previewImg = document.getElementById('scene-edit-preview-img');
    const removeBtn = document.getElementById('remove-scene-edit-image');

    if (file) {
      // Validate file type
      if (!validateFileType(file)) {
        alert('Please select an image file.');
        event.target.value = '';
        return;
      }

      // Validate file size
      if (!validateFileSize(file, DEFAULTS.MAX_FILE_SIZE)) {
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
   * Set uploaded image URL
   * @param {string} url - Image URL
   */
  setUploadedImageUrl(url) {
    this.uploadedImageUrl = url;
  }

  /**
   * Get uploaded image URL
   * @returns {string|null} Uploaded image URL
   */
  getUploadedImageUrl() {
    return this.uploadedImageUrl;
  }

  /**
   * Clear uploaded image URL
   */
  clearUploadedImageUrl() {
    this.uploadedImageUrl = null;
  }

  /**
   * Validate file for upload
   * @param {File} file - File to validate
   * @returns {boolean} Whether file is valid
   */
  validateFile(file) {
    if (!validateFileType(file)) {
      this.gameClient.uiManager.showError('Please select an image file.');
      return false;
    }

    if (!validateFileSize(file, DEFAULTS.MAX_FILE_SIZE)) {
      this.gameClient.uiManager.showError('File size must be less than 10MB.');
      return false;
    }

    return true;
  }

  /**
   * Handle file upload error
   * @param {Error} error - Upload error
   */
  handleUploadError(error) {
    console.error('❌ Upload error:', error);
    this.gameClient.uiManager.showError(`Upload failed: ${error.message}`);
  }
}
