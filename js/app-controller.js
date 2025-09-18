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
     * Initialize the application
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('Initializing MagikEvents PhotoBooth...');
            
            // Initialize all services
            await window.firebaseService.initialize();
            await window.dataManager.initialize();
            await window.cameraManager.initialize();
            await window.imageProcessor.loadTargetImage();
            
            this.isInitialized = true;
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Application initialization failed:', error);
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
    async setupCameraStep() {
        try {
            await window.cameraManager.startCamera();
        } catch (error) {
            console.error('Error setting up camera step:', error);
        }
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
    async handleFileSelect(event) {
        try {
            await window.imageProcessor.handleFileSelect(event);
            this.goToStep(2);
        } catch (error) {
            console.error('Error handling file select:', error);
            alert('Error loading image. Please try again.');
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
    processImages() {
        try {
            const imageDataUrl = window.imageProcessor.processImages();
            
            // Show final result
            const finalResult = document.getElementById('finalResult');
            finalResult.src = imageDataUrl;
            finalResult.style.display = 'block';
            
            this.goToStep(3);
        } catch (error) {
            console.error('Error processing images:', error);
            alert('Error processing images. Please try again.');
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
            window.cameraManager.stopCamera();
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

        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
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
        await window.appController.initialize();
        window.appController.setupEventListeners();
        console.log('MagikEvents PhotoBooth is ready!');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        alert('Failed to initialize application. Please refresh the page.');
    }
});
