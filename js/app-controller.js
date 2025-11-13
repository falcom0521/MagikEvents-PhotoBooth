/**
 * Main Application Controller
 * MagikEvents PhotoBooth Application
 */

class AppController {
    constructor() {
        this.currentStep = 1;
        this.isInitialized = false;
    }

    /**
     * Update loader message
     * @param {string} message - Loader message
     */
    updateLoaderMessage(message) {
        const loaderText = document.querySelector('.loader-text');
        if (loaderText) {
            loaderText.textContent = message;
        }
    }

    /**
     * Hide initialization loader
     */
    hideLoader() {
        const loader = document.getElementById('initLoader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Show initialization loader
     */
    showLoader() {
        const loader = document.getElementById('initLoader');
        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('hidden');
        }
    }

    /**
     * Initialize the application
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('Initializing MagikEvents PhotoBooth...');
            
            // Show loader
            this.showLoader();
            
            // Initialize Firebase
            this.updateLoaderMessage('Connecting to Firebase...');
            await window.firebaseService.initialize();
            console.log('Firebase connected');
            
            // Initialize Data Manager
            this.updateLoaderMessage('Initializing database...');
            await window.dataManager.initialize();
            console.log('Data manager initialized');
            
            // Load target image from Firebase
            this.updateLoaderMessage('Loading frame image...');
            await window.imageProcessor.loadTargetImage();
            console.log('Target image loaded');
            
            // Initialize Camera Manager
            this.updateLoaderMessage('Initializing camera...');
            await window.cameraManager.initialize();
            console.log('Camera manager initialized');
            
            this.isInitialized = true;
            console.log('Application initialized successfully');
            
            // Hide loader and show step 1
            this.hideLoader();
            this.goToStep(1);
            
        } catch (error) {
            console.error('Application initialization failed:', error);
            // Update loader with error message
            this.updateLoaderMessage('Failed to initialize. Please refresh the page.');
            // Hide loader after delay to show error
            setTimeout(() => {
                this.hideLoader();
                alert('Failed to initialize application. Please refresh the page.');
            }, 2000);
            throw error;
        }
    }

    /**
     * Navigate to a specific step
     * @param {number} step - Step number (1, 2, or 3)
     */
    goToStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target step
        document.getElementById(`step${step}`).classList.add('active');
        this.currentStep = step;
        
        // Setup step-specific functionality
        this.setupStep(step);
    }

    /**
     * Setup step-specific functionality
     * @param {number} step - Step number
     */
    setupStep(step) {
        switch (step) {
            case 1:
                this.setupCameraStep();
                break;
            case 2:
                this.setupControlsStep();
                break;
            case 3:
                this.setupResultStep();
                break;
        }
    }

    /**
     * Setup camera step
     */
    setupCameraStep() {
        this.updateCameraUI(!!window.cameraManager.stream);
    }

    /**
     * Setup controls step
     */
    setupControlsStep() {
        window.imageProcessor.setupBackgroundControls();
    }

    /**
     * Setup result step
     */
    setupResultStep() {
        // Result step is already set up when processing images
    }

    /**
     * Capture photo from camera
     * @returns {Promise<void>}
     */
    async capturePhoto() {
        try {
            const image = await window.cameraManager.capturePhoto();
            window.imageProcessor.setBackgroundImage(image);
            this.goToStep(2);
        } catch (error) {
            console.error('Error capturing photo:', error);
            alert(error.message);
        }
    }

    /**
     * Handle file selection
     * @param {Event} event - File input event
     * @returns {Promise<void>}
     */
    async handleFileSelect(input) {
        try {
            let files = null;
            
            if (input instanceof Event) {
                files = input.target && input.target.files ? input.target.files : null;
            } else if (input && typeof input.length === 'number') {
                files = input;
            }

            if (!files || files.length === 0) return;

            const imageFile = Array.from(files).find(file => file.type.startsWith('image/'));
            if (!imageFile) {
                alert('Please select an image file.');
                return;
            }

            await window.imageProcessor.loadImageFromFile(imageFile);
            this.goToStep(2);

            if (input instanceof Event && input.target) {
                input.target.value = '';
            }
        } catch (error) {
            console.error('Error handling file select:', error);
            alert('Error loading image. Please try again.');
        }
    }

    /**
     * Handle files dropped into the drop zone
     * @param {DragEvent} event
     */
    async handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.classList.remove('is-dragover');
        }

        const files = event.dataTransfer ? event.dataTransfer.files : null;
        if (!files || files.length === 0) return;

        await this.handleFileSelect(files);
    }

    /**
     * Start camera on demand
     * @returns {Promise<void>}
     */
    async startCamera() {
        const startBtn = document.getElementById('startCameraBtn');
        const stopBtn = document.getElementById('stopCameraBtn');
        const errorDiv = document.getElementById('cameraError');

        try {
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.textContent = '🎥 Starting...';
            }

            if (!window.cameraManager.isInitialized) {
                await window.cameraManager.initialize();
            }

            await window.cameraManager.startCamera();
            this.updateCameraUI(true);

            if (stopBtn) {
                stopBtn.style.display = 'inline-flex';
            }

            if (startBtn) {
                startBtn.textContent = '🔄 Restart Camera';
            }

            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }
        } catch (error) {
            console.error('Error starting camera:', error);
            if (errorDiv) {
                errorDiv.textContent = `Camera error: ${error.message || 'Unable to access camera.'}`;
                errorDiv.style.display = 'block';
            }
            this.updateCameraUI(false);
            if (startBtn) {
                startBtn.textContent = '🎥 Start Camera';
            }
        } finally {
            if (startBtn) {
                startBtn.disabled = false;
            }
        }
    }

    /**
     * Stop camera stream
     */
    stopCamera() {
        window.cameraManager.stopCamera();
        this.updateCameraUI(false);
    }

    /**
     * Update camera UI state
     * @param {boolean} isActive
     */
    updateCameraUI(isActive) {
        const video = document.getElementById('cameraVideo');
        const placeholder = document.getElementById('cameraPlaceholder');
        const controls = document.getElementById('cameraControls');
        const stopBtn = document.getElementById('stopCameraBtn');
        const startBtn = document.getElementById('startCameraBtn');

        if (isActive && window.cameraManager.stream) {
            if (video) {
                video.style.display = 'block';
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            if (controls) {
                controls.style.display = 'block';
            }
            if (stopBtn) {
                stopBtn.style.display = 'inline-flex';
            }
            if (startBtn) {
                startBtn.textContent = '🔄 Restart Camera';
            }
        } else {
            if (video) {
                video.style.display = 'none';
            }
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            if (controls) {
                controls.style.display = 'none';
            }
            if (stopBtn) {
                stopBtn.style.display = 'none';
            }
            if (startBtn) {
                startBtn.textContent = '🎥 Start Camera';
            }
        }
    }

    /**
     * Setup upload drag-and-drop interactions
     */
    setupUploadInteractions() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('backgroundInput');

        if (!dropZone || !fileInput) return;

        const preventDefaults = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (event) => {
                preventDefaults(event);
                dropZone.classList.add('is-dragover');
            });
        });

        ['dragleave', 'dragend'].forEach(eventName => {
            dropZone.addEventListener(eventName, (event) => {
                preventDefaults(event);
                dropZone.classList.remove('is-dragover');
            });
        });

        dropZone.addEventListener('drop', (event) => this.handleFileDrop(event));
        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (event) => this.handleFileSelect(event));
    }

    /**
     * Setup camera action buttons
     */
    setupCameraButtons() {
        const startBtn = document.getElementById('startCameraBtn');
        const stopBtn = document.getElementById('stopCameraBtn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startCamera());
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopCamera());
        }
    }

    /**
     * Retake photo
     */
    retakePhoto() {
        window.imageProcessor.reset();
        this.goToStep(1);
    }

    /**
     * Process images and create final result
     */
    async processImages() {
        try {
            // Show loading state
            const processBtn = document.querySelector('button[onclick*="processImages"]');
            const originalText = processBtn ? processBtn.textContent : '';
            if (processBtn) {
                processBtn.disabled = true;
                processBtn.textContent = '⏳ Processing...';
            }
            
            const imageDataUrl = await window.imageProcessor.processImages();
            
            // Show final result
            const finalResult = document.getElementById('finalResult');
            finalResult.src = imageDataUrl;
            finalResult.style.display = 'block';
            
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.textContent = originalText;
            }
            
            this.goToStep(3);
        } catch (error) {
            console.error('Error processing images:', error);
            
            // Restore button state
            const processBtn = document.querySelector('button[onclick*="processImages"]');
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.textContent = '✨ Create Final Image';
            }
            
            // Show more specific error message
            const errorMessage = error.message || 'Error processing images. Please try again.';
            alert(errorMessage);
        }
    }

    /**
     * Save image to database
     * @returns {Promise<void>}
     */
    async saveImage() {
        const saveBtn = document.getElementById('saveBtn');
        const uploadStatus = document.getElementById('uploadStatus');
        const uploadMessage = document.getElementById('uploadMessage');
        const uploadProgressBar = document.getElementById('uploadProgressBar');

        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
        uploadStatus.style.display = 'block';
        uploadMessage.textContent = 'Preparing high-quality image for save...';
        uploadMessage.className = '';
        uploadProgressBar.style.width = '20%';

        try {
            // Get canvas data
            const canvas = document.getElementById('compositeCanvas');
            const imageDataUrl = canvas.toDataURL('image/png');
            
            uploadProgressBar.style.width = '50%';
            uploadMessage.textContent = 'Saving high-quality image to database...';

            // Prepare metadata
            const metadata = {
                resolution: `${canvas.width}x${canvas.height}`,
                settings: window.imageProcessor.getSettings()
            };

            uploadProgressBar.style.width = '70%';

            // Save to database
            const imageId = await window.dataManager.saveImage(imageDataUrl, metadata);

            uploadProgressBar.style.width = '90%';
            uploadMessage.textContent = 'Finalizing high-quality save...';

            // Calculate final size
            const imageSize = Math.round((imageDataUrl.length * 3) / 4);
            const imageSizeMB = (imageSize / (1024 * 1024)).toFixed(2);

            uploadProgressBar.style.width = '100%';
            uploadMessage.textContent = `✅ High-quality image (${imageSizeMB}MB, ${canvas.width}x${canvas.height}) successfully saved!`;
            uploadMessage.className = 'success';

            // Reset button after success
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Save Image';
                uploadStatus.style.display = 'none';
                uploadProgressBar.style.width = '0%';
            }, 4000);

        } catch (error) {
            console.error('Save failed:', error);
            uploadProgressBar.style.width = '0%';
            uploadMessage.textContent = `❌ Save failed: ${error.message}`;
            uploadMessage.className = 'error';

            // Reset button after error
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Save Image';
                uploadStatus.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Download the final image (iPad-friendly fallback)
     */
    downloadImage() {
        try {
            const canvas = document.getElementById('compositeCanvas');
            if (!canvas || !canvas.width || !canvas.height) {
                alert('No image available to download. Please create the final image first.');
                return;
            }

            // Use PNG for lossless by default
            const dataUrl = canvas.toDataURL('image/png');

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            if (isIOS) {
                // iOS Safari does not respect download attribute; open in new tab
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.document.write('<html><head><title>Download Image</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#000;"><img src="' + dataUrl + '" style="max-width:100%;max-height:100%;object-fit:contain;"/></body></html>');
                    newWindow.document.close();
                } else {
                    // Popup blocked: fallback to navigating current tab
                    window.location.href = dataUrl;
                }
                return;
            }

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `photobooth_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Could not download image. Please try again.');
        }
    }

    /**
     * Start over with new photo
     */
    startOver() {
        window.imageProcessor.reset();
        document.getElementById('finalResult').style.display = 'none';
        this.goToStep(1);
    }

    /**
     * View gallery
     */
    viewGallery() {
        window.open('gallery.html', '_blank');
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden && window.cameraManager.stream) {
            this.stopCamera();
        } else if (!document.hidden) {
            // When page becomes visible again, reload frame in case it was updated
            this.reloadFrameIfNeeded();
        }
    }

    /**
     * Reload frame image if needed (when returning from upload page)
     */
    async reloadFrameIfNeeded() {
        try {
            // Only reload if we're not in the middle of processing
            if (this.currentStep === 1) {
                await window.imageProcessor.reloadFrameImage();
            }
        } catch (error) {
            console.error('Error reloading frame:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Window focus event - reload frame when user returns to the page
        window.addEventListener('focus', () => {
            this.reloadFrameIfNeeded();
        });

        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });

        this.setupUploadInteractions();
        this.setupCameraButtons();
    }

    /**
     * Check if app is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}

// Global app controller instance
window.appController = new AppController();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Setup event listeners first
        window.appController.setupEventListeners();
        // Then initialize (which will show loader)
        await window.appController.initialize();
        console.log('MagikEvents PhotoBooth is ready!');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Error handling is done in initialize() method
    }
});
