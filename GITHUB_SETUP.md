# GitHub Download Setup

This guide explains how to set up the download functionality for your Electron app releases from a private GitHub repository.

## Prerequisites

1. Your Electron app releases are stored in GitHub Releases
2. The repository is private and requires authentication

## Required Environment Variables

Add these environment variables to your `.env` file:

```bash
# GitHub Repository Configuration
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-electron-app-repo-name
GITHUB_TOKEN=your-github-personal-access-token
```

## Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "Health Parse Download API"
4. Set expiration as needed
5. Select these scopes:
   - `repo` (Full control of private repositories)
   - `contents:read` (Read access to repository contents)
6. Click "Generate token"
7. Copy the token and add it to your `.env` file

## File Naming Conventions

The system automatically detects the user's operating system and selects the appropriate download file. Make sure your release assets follow these naming conventions:

### macOS
- Files containing: `mac`, `darwin`, `macos`
- File extensions: `.dmg`, `.pkg`

### Windows
- Files containing: `win`, `windows`
- File extensions: `.exe`, `.msi`

### Linux
- Files containing: `linux`
- File extensions: `.AppImage`, `.deb`, `.rpm`, `.tar.gz`

## How It Works

1. User clicks the "Download App" button
2. System fetches the latest release information from GitHub API
3. Automatically selects the appropriate file based on the user's OS
4. Shows a confirmation dialog with release details
5. Downloads the file through a proxy endpoint (keeping your GitHub token secure)

## Security

- GitHub token is stored securely in environment variables
- Downloads are proxied through your server to avoid exposing the token
- Users never have direct access to your private repository

## Testing

1. Install dependencies: `npm install`
2. Set up your environment variables
3. Start the development server: `npm run dev`
4. Click the "Download App" button to test

## Troubleshooting

### "GitHub configuration missing" error
- Make sure all three environment variables are set: `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN`

### "Failed to fetch release information" error
- Check that your GitHub token has the correct permissions
- Verify the repository owner and name are correct
- Ensure there is at least one published release in your repository

### "No downloadable files found" error
- Make sure your GitHub release has uploaded assets
- Check that the files are properly attached to the release 