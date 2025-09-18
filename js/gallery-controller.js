/**
 * Gallery Controller
 * MagikEvents PhotoBooth Application
 */

class GalleryController {
    constructor() {
        this.allImages = [];
        this.isInitialized = false;
    }

    /**
     * Initialize gallery controller
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('Initializing Gallery Controller...');
            
            // Initialize Firebase service
            await window.firebaseService.initialize();
            await window.dataManager.initialize();
            
            this.isInitialized = true;
            console.log('Gallery Controller initialized successfully');
            
        } catch (error) {
            console.error('Gallery Controller initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load gallery images
     * @returns {Promise<void>}
     */
    async loadGalleryImages() {
        const loadingMessage = document.getElementById('loadingMessage');
        const errorMessage = document.getElementById('errorMessage');
        const galleryTable = document.getElementById('galleryTable');
        const galleryStats = document.getElementById('galleryStats');
        const emptyGallery = document.getElementById('emptyGallery');
        const imageCount = document.getElementById('imageCount');

        try {
            // Show loading state
            this.showLoadingState(loadingMessage, errorMessage, galleryTable, galleryStats, emptyGallery);

            // Load images from database
            await window.dataManager.loadImages((images, error) => {
                if (error) {
                    this.showErrorState(errorMessage, loadingMessage, error.message);
                    return;
                }

                this.allImages = images;
                this.handleImagesLoaded(images, loadingMessage, galleryTable, galleryStats, emptyGallery, imageCount);
            });

        } catch (error) {
            console.error('Error loading gallery images:', error);
            this.showErrorState(errorMessage, loadingMessage, error.message);
        }
    }

    /**
     * Show loading state
     * @param {HTMLElement} loadingMessage - Loading message element
     * @param {HTMLElement} errorMessage - Error message element
     * @param {HTMLElement} galleryTable - Gallery table element
     * @param {HTMLElement} galleryStats - Gallery stats element
     * @param {HTMLElement} emptyGallery - Empty gallery element
     */
    showLoadingState(loadingMessage, errorMessage, galleryTable, galleryStats, emptyGallery) {
        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        galleryTable.style.display = 'none';
        galleryStats.style.display = 'none';
        emptyGallery.style.display = 'none';
    }

    /**
     * Show error state
     * @param {HTMLElement} errorMessage - Error message element
     * @param {HTMLElement} loadingMessage - Loading message element
     * @param {string} message - Error message
     */
    showErrorState(errorMessage, loadingMessage, message) {
        loadingMessage.style.display = 'none';
        errorMessage.textContent = `Error loading gallery: ${message}`;
        errorMessage.style.display = 'block';
    }

    /**
     * Handle images loaded
     * @param {Array} images - Array of images
     * @param {HTMLElement} loadingMessage - Loading message element
     * @param {HTMLElement} galleryTable - Gallery table element
     * @param {HTMLElement} galleryStats - Gallery stats element
     * @param {HTMLElement} emptyGallery - Empty gallery element
     * @param {HTMLElement} imageCount - Image count element
     */
    handleImagesLoaded(images, loadingMessage, galleryTable, galleryStats, emptyGallery, imageCount) {
        loadingMessage.style.display = 'none';

        if (images.length === 0) {
            emptyGallery.style.display = 'block';
        } else {
            imageCount.textContent = images.length;
            galleryStats.style.display = 'flex';
            this.displayImages(images);
            galleryTable.style.display = 'block';
        }
    }

    /**
     * Display images in table
     * @param {Array} images - Array of images
     */
    displayImages(images) {
        const tableBody = document.getElementById('galleryTableBody');
        tableBody.innerHTML = '';

        images.forEach((image, index) => {
            // Display numbers from highest to lowest (total - current index)
            const rowNumber = images.length - index;
            const row = this.createImageRow(image, rowNumber);
            tableBody.appendChild(row);
        });
    }

    /**
     * Create image row
     * @param {Object} image - Image object
     * @param {number} rowNumber - Row number
     * @returns {HTMLElement} Table row element
     */
    createImageRow(image, rowNumber) {
        const row = document.createElement('tr');
        
        const dateString = this.formatDate(image.uploadedAt);

        row.innerHTML = `
            <td class="row-number">${rowNumber}</td>
            <td>
                <img class="image-thumbnail" 
                     src="${image.imageData}" 
                     alt="${image.filename}"
                     onclick="window.galleryController.openModal('${image.imageData}', '${image.filename}')"
                     loading="lazy">
            </td>
            <td class="image-info">
                <div class="image-filename">${image.filename}</div>
                <div class="image-date">${dateString}</div>
            </td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="action-btn download-btn" onclick="window.galleryController.downloadImage('${image.imageData}', '${image.filename}')">
                        Download
                    </button>
                    <button class="action-btn print-btn" onclick="window.galleryController.printImage('${image.imageData}', '${image.filename}')">
                        Print
                    </button>
                    <button class="action-btn delete-btn" onclick="window.galleryController.deleteImage('${image.id}', '${image.filename}')">
                        Delete
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Format date
     * @param {number} timestamp - Timestamp
     * @returns {string} Formatted date
     */
    formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Open modal with image
     * @param {string} imageData - Base64 image data
     * @param {string} filename - Image filename
     */
    openModal(imageData, filename) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        modalImage.src = imageData;
        modalImage.alt = filename;
        modal.style.display = 'block';
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('imageModal');
        modal.style.display = 'none';
    }

    /**
     * Download image
     * @param {string} imageData - Base64 image data
     * @param {string} filename - Image filename
     */
    downloadImage(imageData, filename) {
        try {
            window.dataManager.downloadImage(imageData, filename);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Error downloading image. Please try again.');
        }
    }

    /**
     * Print image
     * @param {string} imageData - Base64 image data
     * @param {string} filename - Image filename
     */
    printImage(imageData, filename) {
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        // Create the print content HTML - only the image
        const printContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Print Image</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        background: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 0;
                    }
                    
                    .print-image {
                        max-width: 100%;
                        max-height: 100vh;
                        object-fit: contain;
                    }
                    
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        
                        .print-image {
                            max-width: 100%;
                            max-height: 100vh;
                            object-fit: contain;
                        }
                        
                        @page {
                            margin: 0;
                            size: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <img src="${imageData}" alt="Print Image" class="print-image">
                
                <script>
                    // Auto-print when page loads
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            // Close the window after printing
                            setTimeout(() => {
                                window.close();
                            }, 1000);
                        }, 500);
                    };
                    
                    // Handle print dialog close
                    window.onafterprint = function() {
                        window.close();
                    };
                </script>
            </body>
            </html>
        `;
        
        // Write content to the new window
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Focus the new window
        printWindow.focus();
    }

    /**
     * Delete image
     * @param {string} imageId - Image ID
     * @param {string} filename - Image filename
     * @returns {Promise<void>}
     */
    async deleteImage(imageId, filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await window.dataManager.deleteImage(imageId);
            // The onValue listener will automatically update the UI
        } catch (error) {
            console.error('Error deleting image:', error);
            alert(`Error deleting image: ${error.message}`);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close modal when clicking outside the image
        document.getElementById('imageModal').addEventListener('click', (e) => {
            if (e.target === this) {
                this.closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
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
     * Check if gallery is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}

// Global gallery controller instance
window.galleryController = new GalleryController();

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.galleryController.initialize();
        window.galleryController.setupEventListeners();
        await window.galleryController.loadGalleryImages();
        console.log('Gallery is ready!');
    } catch (error) {
        console.error('Failed to initialize gallery:', error);
        alert('Failed to initialize gallery. Please refresh the page.');
    }
});
