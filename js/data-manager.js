/**
 * Data Management System
 * MagikEvents PhotoBooth Application
 */

class DataManager {
    constructor() {
        this.database = null;
        this.isInitialized = false;
    }

    /**
     * Initialize data manager
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            if (!window.firebaseService || !window.firebaseService.isInitialized) {
                throw new Error('Firebase service not initialized');
            }
            
            this.database = window.firebaseService.getDatabase();
            this.isInitialized = true;
            console.log('Data manager initialized successfully');
        } catch (error) {
            console.error('Data manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Save image to database
     * @param {string} imageDataUrl - Base64 image data
     * @param {Object} metadata - Image metadata
     * @returns {Promise<string>} Image ID
     */
    async saveImage(imageDataUrl, metadata = {}) {
        if (!this.isInitialized) {
            throw new Error('Data manager not initialized');
        }

        try {
            const { ref, push, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
            
            // Generate timestamp for filename
            const now = new Date();
            const timestamp = now.getFullYear() + 
                            String(now.getMonth() + 1).padStart(2, '0') + 
                            String(now.getDate()).padStart(2, '0') + '_' +
                            String(now.getHours()).padStart(2, '0') + 
                            String(now.getMinutes()).padStart(2, '0') + 
                            String(now.getSeconds()).padStart(2, '0');
            
            const filename = `magik-events-hq-${timestamp}.png`;
            
            // Calculate image size (approximate)
            const imageSize = Math.round((imageDataUrl.length * 3) / 4);
            const imageSizeMB = (imageSize / (1024 * 1024)).toFixed(2);
            
            // Prepare image data
            const imageData = {
                filename: filename,
                imageData: imageDataUrl,
                uploadedAt: serverTimestamp(),
                size: imageSize,
                sizeMB: imageSizeMB,
                type: 'image/png',
                quality: 'high',
                resolution: metadata.resolution || '1200x1800',
                settings: metadata.settings || {},
                ...metadata
            };

            // Save to Firebase Realtime Database
            const imagesRef = ref(this.database, 'magik-events-images');
            const result = await push(imagesRef, imageData);
            
            console.log('Image saved successfully:', result.key);
            return result.key;
            
        } catch (error) {
            console.error('Error saving image:', error);
            throw error;
        }
    }

    /**
     * Load images from database
     * @param {Function} callback - Callback function for real-time updates
     * @returns {Promise<void>}
     */
    async loadImages(callback) {
        if (!this.isInitialized) {
            throw new Error('Data manager not initialized');
        }

        try {
            const { ref, onValue } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
            
            const imagesRef = ref(this.database, 'magik-events-images');
            
            onValue(imagesRef, (snapshot) => {
                const images = [];
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    Object.keys(data).forEach(key => {
                        images.push({
                            id: key,
                            ...data[key]
                        });
                    });

                    // Sort by upload date (newest first)
                    images.sort((a, b) => {
                        if (a.uploadedAt && b.uploadedAt) {
                            return b.uploadedAt - a.uploadedAt;
                        }
                        return 0;
                    });
                }

                callback(images);
            }, (error) => {
                console.error('Error loading images:', error);
                callback([], error);
            });
            
        } catch (error) {
            console.error('Error setting up image listener:', error);
            throw error;
        }
    }

    /**
     * Delete image from database
     * @param {string} imageId - Image ID to delete
     * @returns {Promise<void>}
     */
    async deleteImage(imageId) {
        if (!this.isInitialized) {
            throw new Error('Data manager not initialized');
        }

        try {
            const { ref, remove } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
            
            const imageRef = ref(this.database, `magik-events-images/${imageId}`);
            await remove(imageRef);
            
            console.log('Image deleted successfully:', imageId);
            
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    /**
     * Download image locally
     * @param {string} imageDataUrl - Base64 image data
     * @param {string} filename - Filename for download
     */
    downloadImage(imageDataUrl, filename) {
        try {
            const link = document.createElement('a');
            link.href = imageDataUrl;
            link.download = filename;
            link.click();
            console.log('Image downloaded:', filename);
        } catch (error) {
            console.error('Error downloading image:', error);
            throw error;
        }
    }

    /**
     * Format file size
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Check if data manager is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized && this.database !== null;
    }
}

// Global data manager instance
window.dataManager = new DataManager();
