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

    // Detect the user's operating system from User-Agent
    const userAgent = req.headers['user-agent'] || '';
    let targetAsset = null;

    // Logic to select the appropriate asset based on the user's OS
    if (userAgent.includes('Mac') || userAgent.includes('Darwin')) {
      // Look for macOS assets (.dmg, .pkg, or .app.zip)
      targetAsset = releaseData.assets.find(asset => 
        asset.name.includes('mac') || 
        asset.name.includes('darwin') || 
        asset.name.endsWith('.dmg') || 
        asset.name.endsWith('.pkg') ||
        asset.name.includes('macos')
      );
    } else if (userAgent.includes('Windows') || userAgent.includes('Win')) {
      // Look for Windows assets (.exe, .msi)
      targetAsset = releaseData.assets.find(asset => 
        asset.name.includes('win') || 
        asset.name.includes('windows') || 
        asset.name.endsWith('.exe') || 
        asset.name.endsWith('.msi')
      );
    } else if (userAgent.includes('Linux')) {
      // Look for Linux assets (.AppImage, .deb, .rpm, .tar.gz)
      targetAsset = releaseData.assets.find(asset => 
        asset.name.includes('linux') || 
        asset.name.endsWith('.AppImage') || 
        asset.name.endsWith('.deb') || 
        asset.name.endsWith('.rpm') ||
        asset.name.endsWith('.tar.gz')
      );
    }

    // If no OS-specific asset found, use the first asset as fallback
    if (!targetAsset) {
      targetAsset = releaseData.assets[0];
    }

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