/**
 * Camera Management System
 * MagikEvents PhotoBooth Application
 */

class CameraManager {
    constructor() {
        this.stream = null;
        this.availableCameras = [];
        this.currentCameraIndex = 0;
        this.isInitialized = false;
        
        // High quality settings
        this.HIGH_QUALITY_SETTINGS = {
            finalWidth: 1200,
            finalHeight: 1800,
            jpegQuality: 1.0,
            pngQuality: 1.0,
            baseVideoConstraints: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                aspectRatio: 16/9
            }
        };
    }

    /**
     * Initialize camera system
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await this.setupCameraOptions();
            await this.startCamera();
            this.isInitialized = true;
            console.log('Camera manager initialized successfully');
        } catch (error) {
            console.error('Camera manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup front and back camera options
     * @returns {Promise<void>}
     */
    async setupCameraOptions() {
        // Always create front and back camera options
        this.availableCameras = [
            {
                deviceId: null,
                label: 'Front Camera',
                type: 'Front',
                icon: '🤳',
                index: 0,
                facingMode: 'user'
            },
            {
                deviceId: null,
                label: 'Back Camera',
                type: 'Back',
                icon: '📸',
                index: 1,
                facingMode: 'environment'
            }
        ];

        // Set front camera as default
        this.currentCameraIndex = 0;
        
        console.log('Camera options set:', this.availableCameras);
        this.createCameraSwitchButtons();
    }

    /**
     * Create camera switch buttons
     */
    createCameraSwitchButtons() {
        const container = document.getElementById('cameraSwitchContainer');
        container.innerHTML = '';
        
        // Create a simple switch button for front/back cameras
        const switchButton = document.createElement('button');
        switchButton.className = 'camera-switch-btn';
        switchButton.innerHTML = '🔄 Switch Camera';
        switchButton.onclick = () => this.switchToNextCamera();
        
        container.appendChild(switchButton);
    }

    /**
     * Switch to the next available camera
     */
    switchToNextCamera() {
        // Switch between front (0) and back (1) camera
        this.currentCameraIndex = this.currentCameraIndex === 0 ? 1 : 0;
        
        // Update button text to show current camera
        const switchButton = document.querySelector('.camera-switch-btn');
        if (switchButton) {
            const currentCamera = this.availableCameras[this.currentCameraIndex];
            switchButton.innerHTML = `📷 ${currentCamera.type} Camera`;
        }
        
        // Restart camera with new device
        this.startCamera();
    }

    /**
     * Switch to a different camera
     * @param {number} index - Camera index
     * @returns {Promise<void>}
     */
    async switchCamera(index) {
        if (index === this.currentCameraIndex || !this.availableCameras[index]) return;
        
        this.currentCameraIndex = index;
        
        // Update button states
        document.querySelectorAll('.camera-switch-btn').forEach((btn, i) => {
            if (i === index) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Restart camera with new device
        await this.startCamera();
    }

    /**
     * Start camera with current settings
     * @returns {Promise<void>}
     */
    async startCamera() {
        const video = document.getElementById('cameraVideo');
        const errorDiv = document.getElementById('cameraError');
        
        // Stop existing stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        try {
            let constraints = {
                video: {
                    ...this.HIGH_QUALITY_SETTINGS.baseVideoConstraints
                }
            };

            // Add device-specific constraints
            if (this.availableCameras.length > 0 && this.availableCameras[this.currentCameraIndex]) {
                const selectedCamera = this.availableCameras[this.currentCameraIndex];
                constraints.video.facingMode = selectedCamera.facingMode;
            } else {
                // Default to front camera
                constraints.video.facingMode = 'user';
            }
            
            console.log('Starting camera with constraints:', constraints);
            
            // Request camera stream
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = this.stream;
            errorDiv.style.display = 'none';
            
            // Log actual video capabilities
            const track = this.stream.getVideoTracks()[0];
            const settings = track.getSettings();
            console.log('Camera started with settings:', settings);
            
        } catch (error) {
            console.error('Camera access error:', error);
            errorDiv.style.display = 'block';
            
            let errorMessage = 'Camera access denied. ';
            
            if (error.name === 'NotFoundError' || error.name === 'DeviceNotFoundError') {
                errorMessage += 'Selected camera not found. ';
            } else if (error.name === 'NotAllowedError') {
                errorMessage += 'Camera permission denied. ';
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Camera is being used by another app. ';
            }
            
            errorMessage += 'Please use "Choose from Gallery" option below.';
            errorDiv.textContent = errorMessage;
        }
    }

    /**
     * Capture photo from current camera stream
     * @returns {Promise<Image>} Captured image
     */
    async capturePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('captureCanvas');
        const ctx = canvas.getContext('2d');
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Camera not ready. Please wait a moment and try again.');
        }
        
        // Set canvas to the actual video resolution for maximum quality
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Ensure high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the video frame to canvas at full resolution
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to high-quality PNG (lossless)
        return new Promise((resolve, reject) => {
            canvas.toBlob(function(blob) {
                const img = new Image();
                img.onload = function() {
                    console.log(`Captured image: ${img.width}x${img.height}`);
                    resolve(img);
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(blob);
            }, 'image/png');
        });
    }

    /**
     * Stop camera stream
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    /**
     * Get high quality settings
     * @returns {Object} Quality settings
     */
    getQualitySettings() {
        return this.HIGH_QUALITY_SETTINGS;
    }

    /**
     * Check if camera is initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized && this.stream !== null;
    }
}

// Global camera manager instance
window.cameraManager = new CameraManager();
