// main.js - Handles Stripe Checkout form submissions and redirects

document.addEventListener('DOMContentLoaded', () => {
  // Attach to all forms that post to /api/create-checkout-session
  document.querySelectorAll('form[action="/api/create-checkout-session"]').forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => (data[key] = value));

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
