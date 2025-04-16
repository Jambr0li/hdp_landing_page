// src/dashboard.js
import Auth from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Auth and wait for session
  await Auth.init();

  // Update user email display
  Auth.onUserChange((user) => {
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) {
      if (user && user.email) {
        userEmailElement.textContent = `Logged in as: ${user.email}`;
      } else {
        userEmailElement.textContent = 'Please log in';
      }
    }
  });

  // Initialize navigation
  import('./nav.js').then(({ default: Nav }) => {
    new Nav();
  });
});