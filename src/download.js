export default class Download {
  constructor() {
    this.downloadButton = null;
    this.originalButtonText = '';
  }

  init() {
    this.downloadButton = document.querySelector('.btn-download');
    if (!this.downloadButton) {
      console.warn('Download button not found');
      return;
    }

    this.originalButtonText = this.downloadButton.textContent;
    this.downloadButton.addEventListener('click', this.handleDownload.bind(this));
  }

  async handleDownload(event) {
    event.preventDefault();
    
    try {
      // Update button state
      this.setLoadingState(true);

      // First, get download information
      const infoResponse = await fetch('/api/download-latest-release?info=true');
      
      if (!infoResponse.ok) {
        const errorData = await infoResponse.json();
        throw new Error(errorData.error || 'Failed to get download information');
      }

      const downloadInfo = await infoResponse.json();
      
      // Show download information to user (optional)
      const confirmDownload = confirm(
        `Download ${downloadInfo.fileName}?\n\n` +
        `Version: ${downloadInfo.releaseVersion}\n` +
        `Size: ${this.formatFileSize(downloadInfo.fileSize)}\n` +
        `Released: ${new Date(downloadInfo.publishedAt).toLocaleDateString()}`
      );

      if (!confirmDownload) {
        this.setLoadingState(false);
        return;
      }

      // Trigger download by creating a hidden link
      this.triggerDownload();

    } catch (error) {
      console.error('Download failed:', error);
      this.showError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  triggerDownload() {
    // Create a hidden link that triggers the download
    const link = document.createElement('a');
    link.href = '/api/download-latest-release';
    link.style.display = 'none';
    link.target = '_blank'; // Open in new tab as backup
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setLoadingState(isLoading) {
    if (!this.downloadButton) return;

    if (isLoading) {
      this.downloadButton.disabled = true;
      this.downloadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing Download...';
    } else {
      this.downloadButton.disabled = false;
      this.downloadButton.textContent = this.originalButtonText;
    }
  }

  showError(message) {
    // Create or update error message
    let errorElement = document.querySelector('.download-error');
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'download-error';
      errorElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        max-width: 400px;
      `;
      document.body.appendChild(errorElement);
    }

    errorElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Download failed: ${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none; 
          border: none; 
          color: white; 
          cursor: pointer; 
          font-size: 16px;
          margin-left: auto;
        ">&times;</button>
      </div>
    `;

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorElement && errorElement.parentNode) {
        errorElement.remove();
      }
    }, 5000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 