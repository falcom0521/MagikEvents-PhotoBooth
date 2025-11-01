/**
 * Image Processing System
 * MagikEvents PhotoBooth Application
 */

class ImageProcessor {
    constructor() {
        this.targetImage = null;
        this.backgroundImage = null;
        this.zoomLevel = 100;
        this.xPosition = 0;
        this.yPosition = 0;
    }

    /**
     * Load target frame image
     * @returns {Promise<void>}
     */
    async loadTargetImage() {
        try {
            // Load frame from Firebase only
            const frameDataUrl = await window.dataManager.loadActiveFrameImage();
            
            if (frameDataUrl) {
                // Load frame from Firebase
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        this.targetImage = img;
                        console.log('Frame loaded from Firebase');
                        resolve();
                    };
                    img.onerror = () => {
                        console.error('Error loading frame from Firebase, creating default placeholder');
                        // Fall back to default frame instead of rejecting
                        this.createDefaultFrame();
                        resolve();
                    };
                    img.src = frameDataUrl;
                });
            } else {
                // No frame in Firebase - create a default placeholder
                console.log('No active frame in Firebase, creating default placeholder');
                this.createDefaultFrame();
                return Promise.resolve();
            }
        } catch (error) {
            console.error('Error loading target image:', error);
            // Create a default placeholder frame
            this.createDefaultFrame();
            return Promise.resolve();
        }
    }

    /**
     * Create default placeholder frame if no frame is available in Firebase
     */
    createDefaultFrame() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use high resolution for the frame
        const qualitySettings = window.cameraManager?.getQualitySettings() || { finalWidth: 1200, finalHeight: 1800 };
        canvas.width = qualitySettings.finalWidth;
        canvas.height = qualitySettings.finalHeight;
        
        // Draw a high-quality frame with smooth edges
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const frameThickness = Math.floor(canvas.width * 0.08); // 8% of width
        const innerWidth = canvas.width - (frameThickness * 2);
        const innerHeight = canvas.height - (frameThickness * 2);
        
        ctx.clearRect(frameThickness, frameThickness, innerWidth, innerHeight);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.floor(frameThickness * 0.2);
        ctx.strokeRect(frameThickness, frameThickness, innerWidth, innerHeight);
        
        // Create and load the default frame image
        this.targetImage = new Image();
        this.targetImage.onload = () => {
            console.log('Default placeholder frame created and loaded');
        };
        this.targetImage.src = canvas.toDataURL('image/png');
    }

    /**
     * Set background image
     * @param {Image} image - Background image
     */
    setBackgroundImage(image) {
        this.backgroundImage = image;
        console.log(`Loaded image: ${image.width}x${image.height}`);
    }

    /**
     * Handle file selection
     * @param {Event} event - File input event
     * @returns {Promise<void>}
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.setBackgroundImage(img);
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Update zoom level
     * @param {number} zoom - Zoom percentage
     */
    setZoom(zoom) {
        this.zoomLevel = zoom;
        this.updatePreview();
    }

    /**
     * Update X position
     * @param {number} x - X position
     */
    setXPosition(x) {
        this.xPosition = x;
        this.updatePreview();
    }

    /**
     * Update Y position
     * @param {number} y - Y position
     */
    setYPosition(y) {
        this.yPosition = y;
        this.updatePreview();
    }

    /**
     * Reset all settings
     */
    reset() {
        this.zoomLevel = 100;
        this.xPosition = 0;
        this.yPosition = 0;
        this.backgroundImage = null;
    }

    /**
     * Update background preview
     */
    updatePreview() {
        const previewImg = document.getElementById('backgroundPreviewImage');
        const container = document.getElementById('backgroundPreviewContainer');
        
        if (!this.backgroundImage) return;
        
        const containerW = container.offsetWidth;
        const containerH = container.offsetHeight;
        const imgAspect = this.backgroundImage.width / this.backgroundImage.height;
        let previewWidth, previewHeight;
        
        if (imgAspect > containerW / containerH) {
            previewHeight = containerH;
            previewWidth = previewHeight * imgAspect;
        } else {
            previewWidth = containerW;
            previewHeight = previewWidth / imgAspect;
        }
        
        const scale = this.zoomLevel / 100;
        previewWidth *= scale;
        previewHeight *= scale;
        
        const maxOffsetX = Math.max(0, (previewWidth - containerW) / 2);
        const maxOffsetY = Math.max(0, (previewHeight - containerH) / 2);
        const xOffset = (this.xPosition / 100) * maxOffsetX;
        const yOffset = (this.yPosition / 100) * maxOffsetY;
        
        previewImg.style.width = previewWidth + 'px';
        previewImg.style.height = previewHeight + 'px';
        previewImg.style.left = (containerW - previewWidth) / 2 + xOffset + 'px';
        previewImg.style.top = (containerH - previewHeight) / 2 + yOffset + 'px';
    }

    /**
     * Setup background controls
     */
    setupBackgroundControls() {
        if (!this.backgroundImage) return;
        
        const previewImg = document.getElementById('backgroundPreviewImage');
        previewImg.src = this.backgroundImage.src;
        previewImg.style.display = 'block';
        
        // Keep current control values when coming back from final result
        document.getElementById('zoomSlider').value = this.zoomLevel;
        document.getElementById('xSlider').value = this.xPosition;
        document.getElementById('ySlider').value = this.yPosition;
        document.getElementById('zoomValue').textContent = this.zoomLevel + '%';
        document.getElementById('xValue').textContent = this.xPosition;
        document.getElementById('yValue').textContent = this.yPosition;
        
        this.updatePreview();
        this.setupControlListeners();
    }

    /**
     * Setup control event listeners
     */
    setupControlListeners() {
        document.getElementById('zoomSlider').oninput = (e) => {
            this.setZoom(parseInt(e.target.value));
            document.getElementById('zoomValue').textContent = this.zoomLevel + '%';
        };
        
        document.getElementById('xSlider').oninput = (e) => {
            this.setXPosition(parseInt(e.target.value));
            document.getElementById('xValue').textContent = this.xPosition;
        };
        
        document.getElementById('ySlider').oninput = (e) => {
            this.setYPosition(parseInt(e.target.value));
            document.getElementById('yValue').textContent = this.yPosition;
        };
    }

    /**
     * Process images and create final composite
     * @returns {string} Data URL of final image
     */
    processImages() {
        if (!this.targetImage || !this.backgroundImage) {
            throw new Error('Missing target or background image');
        }
        
        const canvas = document.getElementById('compositeCanvas');
        const ctx = canvas.getContext('2d');
        
        // Use high resolution for final output
        const qualitySettings = window.cameraManager?.getQualitySettings() || { finalWidth: 1200, finalHeight: 1800 };
        canvas.width = qualitySettings.finalWidth;
        canvas.height = qualitySettings.finalHeight;
        
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        console.log(`Processing at ${canvas.width}x${canvas.height} resolution`);
        console.log(`Target image: ${this.targetImage ? 'loaded' : 'missing'} (${this.targetImage?.width}x${this.targetImage?.height})`);
        console.log(`Background image: ${this.backgroundImage ? 'loaded' : 'missing'} (${this.backgroundImage?.width}x${this.backgroundImage?.height})`);
        
        // Calculate scaling and positioning for high resolution
        const scaleX = canvas.width / this.backgroundImage.width;
        const scaleY = canvas.height / this.backgroundImage.height;
        const baseScale = Math.max(scaleX, scaleY);
        const finalScale = baseScale * (this.zoomLevel / 100);
        const scaledWidth = this.backgroundImage.width * finalScale;
        const scaledHeight = this.backgroundImage.height * finalScale;
        
        const baseOffsetX = (canvas.width - scaledWidth) / 2;
        const baseOffsetY = (canvas.height - scaledHeight) / 2;
        const maxOffsetX = Math.max(0, (scaledWidth - canvas.width) / 2);
        const maxOffsetY = Math.max(0, (scaledHeight - canvas.height) / 2);
        const finalOffsetX = baseOffsetX + (this.xPosition / 100) * maxOffsetX;
        const finalOffsetY = baseOffsetY + (this.yPosition / 100) * maxOffsetY;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background image at high quality
        ctx.drawImage(this.backgroundImage, finalOffsetX, finalOffsetY, scaledWidth, scaledHeight);
        
        // Draw target frame/overlay at high quality
        ctx.drawImage(this.targetImage, 0, 0, canvas.width, canvas.height);
        
        console.log('Final composite created at maximum quality');
        console.log('Composite canvas dimensions:', canvas.width, 'x', canvas.height);
        
        return canvas.toDataURL('image/png');
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return {
            zoom: this.zoomLevel,
            xPosition: this.xPosition,
            yPosition: this.yPosition
        };
    }

    /**
     * Check if ready for processing
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.targetImage !== null && this.backgroundImage !== null;
    }

    /**
     * Reload frame image from Firebase (call this after uploading a new frame)
     * @returns {Promise<void>}
     */
    async reloadFrameImage() {
        try {
            console.log('Reloading frame image from Firebase...');
            await this.loadTargetImage();
            console.log('Frame image reloaded successfully');
        } catch (error) {
            console.error('Error reloading frame image:', error);
            // Fallback to default if reload fails
            this.createDefaultFrame();
        }
    }
}

// Global image processor instance
window.imageProcessor = new ImageProcessor();
