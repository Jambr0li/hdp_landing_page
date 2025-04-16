// src/auth.js
import { createClient } from '@supabase/supabase-js';

// Encapsulated Supabase authentication module
const Auth = (function () {
  // Private variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; 
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; 
  const supabase = createClient(supabaseUrl, supabaseKey);
  let currentUser = null;
  const listeners = []; // Array to store subscriber callbacks

  // Notify all listeners of user state change
  function notifyListeners() {
    listeners.forEach((callback) => callback(currentUser));
  }

  // Subscribe to user state changes
  function onUserChange(callback) {
    listeners.push(callback);
    callback(currentUser); // Call immediately with current state
    return () => {
      const index = listeners.indexOf(callback);
      if (index !== -1) listeners.splice(index, 1);
    };
  }

  // Initialize session
  async function init() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session fetch error:', error.message);
        throw error;
      }
      currentUser = session?.user || null;
      console.log('Initial user state:', currentUser);
      updateAuthButton();
      notifyListeners();
    } catch (error) {
      console.error('Error initializing session:', error.message);
      currentUser = null;
      updateAuthButton();
      notifyListeners();
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      currentUser = session?.user || null;
      updateAuthButton();
      notifyListeners();
    });
  }

  // Sign in with Google
  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });
      if (error) {
        console.error('OAuth error:', error.message);
        throw error;
      }
    } catch (error) {
      console.error('Google sign-in error:', error.message);
      throw error;
    }
  }

  // Sign out
  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error.message);
        // Clear local storage/session anyway to log out locally even if server call fails
        currentUser = null;
        updateAuthButton();
        notifyListeners();
        return;
      }
      // Explicitly clear any local storage or tokens too
      await supabase.auth.clearSession();
      currentUser = null;
      updateAuthButton();
      notifyListeners();
    } catch (error) {
      console.error('Sign-out error:', error.message);
    }
  }

  // Get current user
  function getUser() {
    return currentUser;
  }

  // Update auth button based on user state
  function updateAuthButton() {
    const authButtons = document.querySelectorAll('.btn-login');
    authButtons.forEach((button) => {
      button.textContent = currentUser ? 'Log Out' : 'Log In';
    });
  }

  // Public API
  return {
    init,
    signInWithGoogle,
    signOut,
    getUser,
    onUserChange,
  };
})();

export default Auth;