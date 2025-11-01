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
     * Save frame image to database
     * @param {string} imageDataUrl - Base64 image data
     * @returns {Promise<string>} Frame ID
     */
    async saveFrameImage(imageDataUrl) {
        if (!this.isInitialized) {
            throw new Error('Data manager not initialized');
        }

        try {
            const { ref, push, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
            
            // Prepare frame data
            const frameData = {
                imageData: imageDataUrl,
                uploadedAt: serverTimestamp(),
                type: 'frame',
                active: true
            };

            // Save to Firebase Realtime Database in frame-images collection
            const framesRef = ref(this.database, 'frame-images');
            
            // First, deactivate all existing frames
            const allFramesRef = ref(this.database, 'frame-images');
            const { get, child } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
            const snapshot = await get(allFramesRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                const { update } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
                const updates = {};
                Object.keys(data).forEach(key => {
                    updates[`frame-images/${key}/active`] = false;
                });
                await update(ref(this.database), updates);
            }
            
            // Push new frame
            const result = await push(framesRef, frameData);
            
            console.log('Frame image saved successfully:', result.key);
            return result.key;
            
        } catch (error) {
            console.error('Error saving frame image:', error);
            throw error;
        }
    }

    /**
     * Load active frame image from database
     * @returns {Promise<string|null>} Base64 image data or null
     */
    async loadActiveFrameImage() {
        if (!this.isInitialized) {
            throw new Error('Data manager not initialized');
        }

        try {
            const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
            
            const framesRef = ref(this.database, 'frame-images');
            const snapshot = await get(framesRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Find the active frame manually (more reliable than query)
                let activeFrame = null;
                let activeFrameKey = null;
                
                // First, try to find a frame with active: true
                Object.keys(data).forEach(key => {
                    if (data[key].active === true) {
                        activeFrame = data[key];
                        activeFrameKey = key;
                    }
                });
                
                // If no active frame found, use the most recent one (by upload time)
                if (!activeFrame) {
                    let mostRecent = null;
                    let mostRecentKey = null;
                    let mostRecentTime = 0;
                    
                    Object.keys(data).forEach(key => {
                        const uploadTime = data[key].uploadedAt || 0;
                        if (uploadTime > mostRecentTime) {
                            mostRecentTime = uploadTime;
                            mostRecent = data[key];
                            mostRecentKey = key;
                        }
                    });
                    
                    activeFrame = mostRecent;
                    activeFrameKey = mostRecentKey;
                }
                
                if (activeFrame) {
                    console.log('Active frame loaded from database:', activeFrameKey);
                    return activeFrame.imageData;
                }
            }
            
            console.log('No active frame found in database, using default');
            return null;
            
        } catch (error) {
            console.error('Error loading active frame image:', error);
            // Return null to fallback to default frame
            return null;
        }
    }

    /**
     * Get current active frame preview
     * @param {Function} callback - Callback function for real-time updates
     * @returns {Promise<void>}
     */
    async getActiveFramePreview(callback) {
        if (!this.isInitialized) {
            throw new Error('Data manager not initialized');
        }

        try {
            const { ref, onValue } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
            
            const framesRef = ref(this.database, 'frame-images');
            
            onValue(framesRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    // Find the active frame manually
                    let activeFrame = null;
                    
                    // First, try to find a frame with active: true
                    Object.keys(data).forEach(key => {
                        if (data[key].active === true) {
                            activeFrame = data[key];
                        }
                    });
                    
                    // If no active frame found, use the most recent one
                    if (!activeFrame) {
                        let mostRecent = null;
                        let mostRecentTime = 0;
                        
                        Object.keys(data).forEach(key => {
                            const uploadTime = data[key].uploadedAt || 0;
                            if (uploadTime > mostRecentTime) {
                                mostRecentTime = uploadTime;
                                mostRecent = data[key];
                            }
                        });
                        
                        activeFrame = mostRecent;
                    }
                    
                    callback(activeFrame ? activeFrame.imageData : null);
                } else {
                    callback(null);
                }
            }, (error) => {
                console.error('Error getting active frame preview:', error);
                callback(null);
            });
            
        } catch (error) {
            console.error('Error setting up frame preview listener:', error);
            throw error;
        }
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
