// main.js - Handles Stripe Checkout form submissions and redirects
import { supabase } from './script.js'; // Import the supabase client

document.addEventListener('DOMContentLoaded', () => {
  // Attach to all forms that post to /api/create-checkout-session
  document.querySelectorAll('form[action="/api/create-checkout-session"]').forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      // 1. Get Supabase session to retrieve the access token
      if (!supabase) {
        console.error('Supabase client is not available in redirect.js. Ensure it is initialized and exported from script.js.');
        alert('Client-side configuration error. Unable to proceed with checkout.');
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('User not authenticated or session error:', sessionError?.message);
        alert('You must be logged in to subscribe. Please log in and try again.');
        // Optionally, redirect to a login page or show a login modal
        // e.g., window.location.href = '/login.html';
        return;
      }

      const accessToken = session.access_token;

      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => (data[key] = value));

      try {
        // 2. Add Authorization header to the fetch request
        const response = await fetch(form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`, // <-- ADDED THIS LINE
          },
          body: JSON.stringify(data),
        });

        if (response.ok) { // Check for successful HTTP status (e.g., 200-299)
          try {
            const result = await response.json(); // Attempt to parse the response body as JSON
            if (result.url) {
              window.location.href = result.url; // Redirect to the Stripe Checkout URL
              return; // Stop further execution after redirect
            } else {
              // The response was JSON, but didn't contain a URL or contained an error message
              alert(result.error || 'Checkout session could not be created. Please try again.');
            }
          } catch (jsonError) {
            // The response was successful (response.ok), but was not valid JSON.
            // This is unexpected if the server is supposed to send JSON with a URL.
            console.error('Failed to parse JSON response:', jsonError);
            alert('The server sent a response that was not in the expected format. Please contact support or try again later.');
          }
        } else {
          // Handle HTTP errors (e.g., 4xx, 5xx)
          let errorText = `Server error: ${response.status} ${response.statusText}.`;
          try {
            // Try to get a more specific error message from the response body (if JSON)
            const errorResult = await response.json();
            errorText = errorResult.error || errorResult.message || errorText;
          } catch (e) {
            // If the error response body is not JSON, try to read it as text
            try {
              const plainTextError = await response.text();
              if (plainTextError) {
                // Append a snippet of the plain text error to the error message
                errorText = `${errorText} Details: ${plainTextError.substring(0, 100)}`;
              }
            } catch (textErr) {
              // If reading as text also fails, just use the status-based errorText
            }
          }
          alert(errorText);
        }
      } catch (err) {
        // Handle network errors or other issues with the fetch request itself
        console.error('Fetch error:', err);
        alert('A network error occurred. Please check your connection and try again. See console for details.');
      }
    });
  });
});
