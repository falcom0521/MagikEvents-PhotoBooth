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
                        this.createDefaultFrame().then(() => resolve()).catch(() => resolve());
                    };
                    img.src = frameDataUrl;
                });
            } else {
                // No frame in Firebase - create a default placeholder
                console.log('No active frame in Firebase, creating default placeholder');
                await this.createDefaultFrame();
            }
        } catch (error) {
            console.error('Error loading target image:', error);
            // Create a default placeholder frame
            await this.createDefaultFrame();
        }
    }

    /**
     * Create default placeholder frame if no frame is available in Firebase
     * @returns {Promise<void>}
     */
    createDefaultFrame() {
        return new Promise((resolve) => {
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
            const img = new Image();
            img.onload = () => {
                this.targetImage = img;
                console.log('Default placeholder frame created and loaded');
                resolve();
            };
            img.onerror = () => {
                console.error('Error loading default frame image');
                // Still set it even if there's an error so we don't break the app
                this.targetImage = img;
                resolve();
            };
            img.src = canvas.toDataURL('image/png');
        });
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

        await this.loadImageFromFile(file);
    }

    /**
     * Load image from a file object
     * @param {File} file
     * @returns {Promise<void>}
     */
    async loadImageFromFile(file) {
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
        
        // Display target image if available
        const targetImg = document.getElementById('targetImagePreview');
        if (this.targetImage && targetImg) {
            // Helper function to display target image
            const displayTargetImage = () => {
                try {
                    // The targetImage is an Image object - convert it to data URL for display
                    if (this.targetImage.complete && this.targetImage.width > 0 && this.targetImage.height > 0) {
                        // Image is already loaded, convert to data URL via canvas
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = this.targetImage.width;
                        canvas.height = this.targetImage.height;
                        ctx.drawImage(this.targetImage, 0, 0);
                        targetImg.src = canvas.toDataURL('image/png');
                        targetImg.style.display = 'block';
                    } else if (this.targetImage.src) {
                        // Image is still loading, wait for it and then convert
                        const handleLoad = () => {
                            try {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                if (this.targetImage.width > 0 && this.targetImage.height > 0) {
                                    canvas.width = this.targetImage.width;
                                    canvas.height = this.targetImage.height;
                                    ctx.drawImage(this.targetImage, 0, 0);
                                    targetImg.src = canvas.toDataURL('image/png');
                                    targetImg.style.display = 'block';
                                } else {
                                    // Fallback: use src directly
                                    targetImg.src = this.targetImage.src;
                                    targetImg.style.display = 'block';
                                }
                            } catch (error) {
                                console.error('Error displaying target image:', error);
                                // Fallback: use src directly
                                if (this.targetImage.src) {
                                    targetImg.src = this.targetImage.src;
                                    targetImg.style.display = 'block';
                                }
                            }
                        };
                        
                        if (this.targetImage.complete) {
                            handleLoad();
                        } else {
                            this.targetImage.addEventListener('load', handleLoad, { once: true });
                            // Also set a timeout to handle cases where load event doesn't fire
                            setTimeout(() => {
                                if (this.targetImage.complete && this.targetImage.width > 0) {
                                    handleLoad();
                                }
                            }, 100);
                        }
                    }
                } catch (error) {
                    console.error('Error in displayTargetImage:', error);
                    // If all else fails, try using the src directly
                    if (this.targetImage.src) {
                        targetImg.src = this.targetImage.src;
                        targetImg.style.display = 'block';
                    }
                }
            };
            
            displayTargetImage();
        }
        
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
     * Wait for image to be fully loaded
     * @param {Image} img - Image to wait for
     * @param {number} maxWaitMs - Maximum wait time in milliseconds
     * @returns {Promise<boolean>} True if image loaded, false if timeout
     */
    waitForImageLoad(img, maxWaitMs = 2000) {
        return new Promise((resolve) => {
            if (!img) {
                resolve(false);
                return;
            }
            
            // If image is already complete and has dimensions, resolve immediately
            if (img.complete && img.width > 0 && img.height > 0) {
                resolve(true);
                return;
            }
            
            // For data URLs (canvas-generated images), they might load synchronously
            if (img.src && img.src.startsWith('data:')) {
                // Give it a moment for dimensions to be set
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (img.width > 0 && img.height > 0) {
                        clearInterval(checkInterval);
                        resolve(true);
                    } else if (attempts * 50 >= maxWaitMs) {
                        clearInterval(checkInterval);
                        resolve(false);
                    }
                }, 50);
                return;
            }
            
            // For regular images, wait for load event
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    // Final check - even if load event didn't fire, check dimensions
                    if (img.width > 0 && img.height > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            }, maxWaitMs);
            
            img.addEventListener('load', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    // Verify dimensions after load
                    if (img.width > 0 && img.height > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            }, { once: true });
            
            img.addEventListener('error', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(false);
                }
            }, { once: true });
        });
    }

    /**
     * Process images and create final composite
     * @returns {string} Data URL of final image
     */
    async processImages() {
        if (!this.backgroundImage) {
            throw new Error('Missing background image. Please capture a photo first.');
        }
        
        // If target image is missing, try to load it first
        if (!this.targetImage) {
            console.log('Target image not loaded, attempting to load...');
            try {
                await this.loadTargetImage();
            } catch (error) {
                console.error('Failed to load target image:', error);
                // Continue with default frame if load fails
                if (!this.targetImage) {
                    await this.createDefaultFrame();
                }
            }
        }
        
        // If still no target image, create a default one
        if (!this.targetImage) {
            console.log('Creating default frame...');
            await this.createDefaultFrame();
        }
        
        // Wait for both images to be fully loaded
        console.log('Waiting for images to be ready...');
        console.log(`Target image state: complete=${this.targetImage?.complete}, width=${this.targetImage?.width}, height=${this.targetImage?.height}`);
        console.log(`Background image state: complete=${this.backgroundImage.complete}, width=${this.backgroundImage.width}, height=${this.backgroundImage.height}`);
        
        const targetReady = await this.waitForImageLoad(this.targetImage, 5000);
        const backgroundReady = await this.waitForImageLoad(this.backgroundImage, 5000);
        
        if (!targetReady || !this.targetImage.width || !this.targetImage.height) {
            throw new Error('Frame image failed to load. Please wait a moment and try again, or refresh the page.');
        }
        
        if (!backgroundReady || !this.backgroundImage.width || !this.backgroundImage.height) {
            throw new Error('Background image failed to load. Please capture the photo again.');
        }
        
        console.log('Both images are ready. Processing...');
        
        const canvas = document.getElementById('compositeCanvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        
        // Use high resolution for final output
        const qualitySettings = window.cameraManager?.getQualitySettings() || { finalWidth: 1200, finalHeight: 1800 };
        canvas.width = qualitySettings.finalWidth;
        canvas.height = qualitySettings.finalHeight;
        
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        console.log(`Processing at ${canvas.width}x${canvas.height} resolution`);
        console.log(`Target image: ${this.targetImage.width}x${this.targetImage.height}`);
        console.log(`Background image: ${this.backgroundImage.width}x${this.backgroundImage.height}`);
        
        try {
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
        } catch (error) {
            console.error('Error drawing images to canvas:', error);
            throw new Error(`Failed to create composite image: ${error.message}`);
        }
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
            await this.createDefaultFrame();
        }
    }
}

// Global image processor instance
window.imageProcessor = new ImageProcessor();
