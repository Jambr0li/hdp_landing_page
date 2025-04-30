// src/auth.js
import { createClient } from '@supabase/supabase-js';

// Encapsulated Supabase authentication module
const Auth = (function () {
  // Private variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; 
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; 
  const supabase = createClient(supabaseUrl, supabaseKey);
  window.supabase = supabase;
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
      console.log("HERE")
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


  async function signInWithGoogle() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const client = urlParams.get('client');
      const redirectTo = `${window.location.origin}/callback.html${client ? '?client=' + client : ''}`;
      console.log('OAuth redirectTo:', redirectTo);
      
      // Use signInWithOAuth in a way that doesn't immediately redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true // This prevents automatic redirect
        },
      });
  
      if (error) {
        console.error('OAuth error:', error.message);
        // Here you can handle the error however you want
        // For example, you could update UI to show error message
        return;
      }
  
      // If no error, manually redirect
      if (data?.url) {
        window.location.href = data.url;
      }
      
    } catch (error) {
      console.error('Google sign-in error:', error.message);
      // Handle error without redirecting
      // You could show an error message to the user here
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