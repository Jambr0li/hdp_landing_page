import Auth from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('login-button');
  loginButton.addEventListener('click', async () => {
    await Auth.signInWithGoogle();
  });
});