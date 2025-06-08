export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // GitHub repository details - replace with your actual values
    const GITHUB_OWNER = process.env.GITHUB_OWNER; // e.g., 'your-username'
    const GITHUB_REPO = process.env.GITHUB_REPO; // e.g., 'your-electron-app'
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Your GitHub Personal Access Token

    if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
      return res.status(500).json({ 
        error: 'GitHub configuration missing. Please set GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN environment variables.' 
      });
    }

    // Fetch the latest release from GitHub API
    const releaseResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HealthParse-Landing-Page'
        }
      }
    );

    if (!releaseResponse.ok) {
      console.error('GitHub API response:', releaseResponse.status, releaseResponse.statusText);
      return res.status(500).json({ 
        error: 'Failed to fetch release information from GitHub' 
      });
    }

    const releaseData = await releaseResponse.json();
    
    // Check if there are any assets
    if (!releaseData.assets || releaseData.assets.length === 0) {
      return res.status(404).json({ 
        error: 'No downloadable files found in the latest release' 
      });
    }

    // Enhanced OS and architecture detection
    function detectPlatformAndArch(userAgent) {
      const ua = userAgent.toLowerCase();
      
      // Detect OS
      let os = 'unknown';
      if (ua.includes('mac') || ua.includes('darwin')) {
        os = 'mac';
      } else if (ua.includes('win')) {
        os = 'windows';  
      } else if (ua.includes('linux')) {
        os = 'linux';
      }
      
      // Detect architecture
      let arch = 'unknown';
      
      if (os === 'mac') {
        // For Mac, check if it's Apple Silicon or Intel
        // Note: User-Agent detection for Apple Silicon is limited
        // Most browsers don't clearly indicate ARM vs Intel in User-Agent
        if (ua.includes('arm') || ua.includes('apple silicon')) {
          arch = 'arm64';
        } else {
          // Default to Intel for older detection, but this is not reliable
          arch = 'x64';
        }
      } else if (os === 'windows') {
        if (ua.includes('arm') || ua.includes('wow64')) {
          arch = 'arm64';
        } else if (ua.includes('x64') || ua.includes('win64')) {
          arch = 'x64';
        } else {
          arch = 'x86'; // 32-bit
        }
      } else if (os === 'linux') {
        if (ua.includes('arm') || ua.includes('aarch64')) {
          arch = 'arm64';
        } else if (ua.includes('x86_64') || ua.includes('x64')) {
          arch = 'x64';
        } else {
          arch = 'x86';
        }
      }
      
      return { os, arch };
    }

    function findBestAsset(assets, platform) {
      const { os, arch } = platform;
      
      // Priority-based matching
      const candidates = assets.filter(asset => {
        const name = asset.name.toLowerCase();
        
        // First filter by OS
        if (os === 'mac') {
          if (!(name.includes('mac') || name.includes('darwin') || 
                name.includes('macos') || name.endsWith('.dmg') || 
                name.endsWith('.pkg'))) {
            return false;
          }
        } else if (os === 'windows') {
          if (!(name.includes('win') || name.includes('windows') || 
                name.endsWith('.exe') || name.endsWith('.msi'))) {
            return false;
          }
        } else if (os === 'linux') {
          if (!(name.includes('linux') || name.endsWith('.appimage') || 
                name.endsWith('.deb') || name.endsWith('.rpm') || 
                name.endsWith('.tar.gz'))) {
            return false;
          }
        }
        
        return true;
      });
      
      if (candidates.length === 0) return null;
      
      // Now try to match architecture
      let bestMatch = null;
      
      // Look for exact architecture match
      for (const asset of candidates) {
        const name = asset.name.toLowerCase();
        
        if (arch === 'arm64' || arch === 'apple-silicon') {
          if (name.includes('arm64') || name.includes('apple-silicon') || 
              name.includes('m1') || name.includes('m2') || name.includes('silicon')) {
            bestMatch = asset;
            break;
          }
        } else if (arch === 'x64') {
          if (name.includes('x64') || name.includes('intel') || name.includes('amd64')) {
            bestMatch = asset;
            break;
          }
        }
      }
      
      // If no architecture-specific match, return the first OS match
      return bestMatch || candidates[0];
    }

    // Replace the OS detection logic with:
    const platform = detectPlatformAndArch(req.headers['user-agent'] || '');
    const targetAsset = findBestAsset(releaseData.assets, platform);

    // Create a secure download URL by proxying through this endpoint
    // or redirect directly to the GitHub asset download URL
    const downloadUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/assets/${targetAsset.id}`;
    
    // Option 1: Return download information for frontend to handle
    if (req.query.info === 'true') {
      return res.json({
        success: true,
        downloadUrl: downloadUrl,
        fileName: targetAsset.name,
        fileSize: targetAsset.size,
        releaseVersion: releaseData.tag_name,
        releaseName: releaseData.name,
        publishedAt: releaseData.published_at
      });
    }

    // Option 2: Directly proxy the download
    const assetResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/octet-stream',
        'User-Agent': 'HealthParse-Landing-Page'
      }
    });

    if (!assetResponse.ok) {
      return res.status(500).json({ 
        error: 'Failed to fetch download URL' 
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${targetAsset.name}"`);
    res.setHeader('Content-Length', targetAsset.size);

    // Stream the file to the client
    const buffer = await assetResponse.arrayBuffer();
    return res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error in download-latest-release:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 