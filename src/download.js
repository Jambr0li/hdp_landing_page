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

      // Get download information first
      const infoResponse = await fetch('/api/download-latest-release?info=true');
      
      if (!infoResponse.ok) {
        const errorData = await infoResponse.json();
        throw new Error(errorData.error || 'Failed to get download information');
      }

      const downloadInfo = await infoResponse.json();
      
      // Show download information - but use a custom modal instead of confirm()
      this.showDownloadModal(downloadInfo);

    } catch (error) {
      console.error('Download failed:', error);
      this.showError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  showDownloadModal(downloadInfo) {
    // Create a custom modal that doesn't break the user gesture chain
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      ">
        <h3 style="margin: 0 0 16px 0; color: #333;">Download Ready</h3>
        <p style="margin: 0 0 8px 0; color: #666;">
          <strong>${downloadInfo.fileName}</strong><br>
          Version: ${downloadInfo.releaseVersion}<br>
          Size: ${this.formatFileSize(downloadInfo.fileSize)}<br>
          Released: ${new Date(downloadInfo.publishedAt).toLocaleDateString()}
        </p>
        <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
          <button id="download-confirm" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Download</button>
          <button id="download-cancel" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle button clicks (these maintain the user gesture chain)
    modal.querySelector('#download-confirm').addEventListener('click', () => {
      modal.remove();
      this.triggerDownload();
    });

    modal.querySelector('#download-cancel').addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  triggerDownload() {
    // Use window.location.href - most reliable method
    window.location.href = '/api/download-latest-release';
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