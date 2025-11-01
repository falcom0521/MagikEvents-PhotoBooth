/**
 * Upload Frame Controller
 * MagikEvents PhotoBooth Application
 */

class UploadController {
    constructor() {
        this.selectedImage = null;
        this.isInitialized = false;
        this.isProcessing = false;
    }

    /**
     * Initialize the upload controller
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('Initializing Upload Controller...');
            
            // Initialize all services
            await window.firebaseService.initialize();
            await window.dataManager.initialize();
            
            this.isInitialized = true;
            console.log('Upload controller initialized successfully');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load current frame
            this.loadCurrentFrame();
            
        } catch (error) {
            console.error('Upload controller initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const fileInput = document.getElementById('frameInput');
        const uploadArea = document.querySelector('.upload-area');
        
        // Prevent clicks on file input from bubbling to upload area
        fileInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Click to upload (only if clicking on the placeholder area, not the input)
        uploadArea.addEventListener('click', (e) => {
            // Only trigger if not clicking directly on the file input
            if (e.target !== fileInput && !fileInput.contains(e.target)) {
                fileInput.click();
            }
        });
        
        // File input change - only process once
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#007bff';
            uploadArea.style.background = '#f8f9ff';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!this.selectedImage) {
                uploadArea.style.borderColor = '#dee2e6';
                uploadArea.style.background = 'white';
            }
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#dee2e6';
            uploadArea.style.background = 'white';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    this.processFile(file);
                } else {
                    alert('Please select an image file');
                }
            }
        });
    }

    /**
     * Handle file selection
     * @param {Event} event - File input event
     */
    handleFileSelect(event) {
        // Prevent duplicate processing
        if (this.isProcessing) {
            return;
        }
        
        const file = event.target.files[0];
        if (!file) {
            // Reset input if no file selected (user cancelled)
            event.target.value = '';
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            event.target.value = '';
            return;
        }
        
        this.isProcessing = true;
        this.processFile(file);
    }

    /**
     * Process selected file
     * @param {File} file - Selected file
     */
    processFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.selectedImage = e.target.result;
            this.showPreview();
            this.isProcessing = false;
        };
        
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            this.isProcessing = false;
            // Reset input on error
            const fileInput = document.getElementById('frameInput');
            if (fileInput) {
                fileInput.value = '';
            }
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * Show preview of selected image
     */
    showPreview() {
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const previewImage = document.getElementById('previewImage');
        const uploadBtn = document.getElementById('uploadBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        uploadPlaceholder.style.display = 'none';
        previewImage.src = this.selectedImage;
        previewImage.style.display = 'block';
        uploadBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
    }

    /**
     * Clear selected image
     */
    clearSelection() {
        this.selectedImage = null;
        this.isProcessing = false;
        
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const previewImage = document.getElementById('previewImage');
        const uploadBtn = document.getElementById('uploadBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const fileInput = document.getElementById('frameInput');
        
        uploadPlaceholder.style.display = 'block';
        previewImage.style.display = 'none';
        uploadBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        fileInput.value = '';
    }

    /**
     * Load current active frame
     */
    loadCurrentFrame() {
        const loadingCurrent = document.getElementById('loadingCurrent');
        const currentFrameContainer = document.getElementById('currentFrameContainer');
        const currentFrameImage = document.getElementById('currentFrameImage');
        const noCurrentFrame = document.getElementById('noCurrentFrame');
        
        window.dataManager.getActiveFramePreview((frameData) => {
            loadingCurrent.style.display = 'none';
            
            if (frameData) {
                currentFrameImage.src = frameData;
                currentFrameContainer.style.display = 'block';
                noCurrentFrame.style.display = 'none';
            } else {
                currentFrameContainer.style.display = 'none';
                noCurrentFrame.style.display = 'block';
            }
        });
    }

    /**
     * Upload frame to Firebase
     * @returns {Promise<void>}
     */
    async uploadFrame() {
        if (!this.selectedImage) {
            alert('Please select an image first');
            return;
        }
        
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadStatus = document.getElementById('uploadStatus');
        const uploadMessage = document.getElementById('uploadMessage');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        
        // Disable button and show loading
        uploadBtn.disabled = true;
        uploadBtn.textContent = '⏳ Uploading...';
        uploadStatus.style.display = 'block';
        uploadMessage.textContent = 'Preparing frame image...';
        uploadMessage.className = '';
        uploadProgressBar.style.width = '20%';
        
        try {
            uploadProgressBar.style.width = '40%';
            uploadMessage.textContent = 'Saving frame to Firebase...';
            
            // Save to database
            const frameId = await window.dataManager.saveFrameImage(this.selectedImage);
            
            uploadProgressBar.style.width = '80%';
            uploadMessage.textContent = 'Finalizing upload...';
            
            // Reload current frame
            setTimeout(() => {
                this.loadCurrentFrame();
            }, 1000);
            
            uploadProgressBar.style.width = '100%';
            uploadMessage.textContent = '✅ Frame uploaded successfully!';
            uploadMessage.className = 'success';
            
            // Reset after success
            setTimeout(() => {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Frame';
                uploadStatus.style.display = 'none';
                uploadProgressBar.style.width = '0%';
                this.clearSelection();
            }, 3000);
            
        } catch (error) {
            console.error('Upload failed:', error);
            uploadProgressBar.style.width = '0%';
            uploadMessage.textContent = `❌ Upload failed: ${error.message}`;
            uploadMessage.className = 'error';
            
            // Reset after error
            setTimeout(() => {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Frame';
                uploadStatus.style.display = 'none';
            }, 5000);
        }
    }
}

// Global upload controller instance
window.uploadController = new UploadController();

// Initialize upload controller when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.uploadController.initialize();
        console.log('Upload page is ready!');
    } catch (error) {
        console.error('Failed to initialize upload page:', error);
        alert('Failed to initialize upload page. Please refresh.');
    }
});
