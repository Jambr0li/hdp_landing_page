// src/script.js
import { createClient } from '@supabase/supabase-js';
import Auth from './auth.js';

// TODO: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Auth module
  Auth.init();

  // Initialize navigation
  import('./nav.js').then(({ default: Nav }) => {
    const navigation = new Nav();
    navigation.setupSmoothScrolling();
  });

  // Pricing card interactions
  const pricingCards = document.querySelectorAll('.pricing-card');
  pricingCards.forEach((card) => {
    const handleHover = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', handleHover);

    card.addEventListener('mouseenter', () => {
      if (!card.classList.contains('featured')) {
        card.style.transform = 'translateY(-10px)';
      } else {
        card.style.transform = 'scale(1.08)';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('featured')) {
        card.style.transform = 'translateY(0)';
      } else {
        card.style.transform = 'scale(1.05)';
      }
    });
  });

  // Add pricing card styles
  const style = document.createElement('style');
  style.textContent = `
    .pricing-card {
        position: relative;
    }

    .pricing-card::after {
        content: '';
        position: absolute;
        top: var(--mouse-y, 0);
        left: var(--mouse-x, 0);
        transform: translate(-50%, -50%);
        width: 100px;
        height: 100px;
        background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .pricing-card:hover::after {
        opacity: 1;
    }
  `;
  document.head.appendChild(style);

  // Handle auth error from query params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('error') === 'auth-failed') {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) errorMessage.style.display = 'block';
  }
});