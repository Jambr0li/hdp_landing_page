export default function handler(req, res) {
    // Send HTML response that handles the OAuth data
    res.status(200).send(`
      <script>
        const params = new URLSearchParams(window.location.hash.substring(1));
        const authData = {
          accessToken: params.get('access_token'),
          refreshToken: params.get('refresh_token'),
          expiresIn: params.get('expires_in')
        };
        // Post message back to electron app
        window.close();
      </script>
      <h1>Authentication successful! You can close this window.</h1>
    `);
  }
  