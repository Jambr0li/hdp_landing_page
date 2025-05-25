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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          if (result.url) {
            window.location = result.url; // Redirect to Stripe Checkout
            return;
          } else {
            alert(result.error || 'An error occurred');
            return;
          }
        } else {
          // Fallback: if the response is not JSON, just replace the page content
          const text = await response.text();
          document.body.innerHTML = text;
        }
      } catch (err) {
        alert('Network error. Please try again.');
      }
    });
  });
});
