// src/nav.js
import Auth from './auth.js';

export default class Nav {
  constructor() {
    this.header = document.querySelector('.header');
    this.nav = document.querySelector('.nav');
    this.isNavVisible = false;
    this.init();
  }

  init() {
    this.setupMobileNav();
    this.setupScrollEffect();
    this.setupButtonEffects();
    this.addRippleStyles();
  }

  toggleNav = () => {
    this.isNavVisible = !this.isNavVisible;
    this.nav.classList.toggle('active');

    const menuIcon = document.querySelector('.mobile-menu-btn i');
    if (menuIcon) {
      menuIcon.className = this.isNavVisible ? 'fas fa-times' : 'fas fa-bars';
    }

    document.body.style.overflow = this.isNavVisible ? 'hidden' : '';
  }

  setupMobileNav() {
    if (window.innerWidth <= 768) {
      const menuButton = document.createElement('button');
      menuButton.className = 'mobile-menu-btn';
      menuButton.setAttribute('aria-label', 'Toggle navigation menu');
      menuButton.innerHTML = '<i class="fas fa-bars"></i>';
      this.header.appendChild(menuButton);

      menuButton.addEventListener('click', this.toggleNav);

      document.addEventListener('click', (e) => {
        if (this.isNavVisible && !this.nav.contains(e.target) && !menuButton.contains(e.target)) {
          this.toggleNav();
        }
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && this.isNavVisible) {
          this.toggleNav();
        }
      });
    }
  }

  setupScrollEffect() {
    let lastScroll = 0;
    let ticking = false;
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.pageYOffset;

          this.header.style.backgroundColor = currentScroll > 50 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 1)';
          this.header.style.backdropFilter = currentScroll > 50 ? 'blur(8px)' : 'none';

          if (!this.isNavVisible) {
            if (currentScroll > lastScroll && currentScroll > scrollThreshold) {
              this.header.style.transform = 'translateY(-100%)';
            } else {
              this.header.style.transform = 'translateY(0)';
            }
          }

          lastScroll = currentScroll;
          ticking = false;
        });

        ticking = true;
      }
    });
  }

  setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          if (this.isNavVisible) {
            this.toggleNav();
          }

          const headerHeight = this.header.offsetHeight;
          const targetPosition = target.offsetTop - headerHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });
        }
      });
    });
  }

  setupButtonEffects() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach((button) => {
      button.addEventListener('click', (e) => {
        this.addRippleEffect(e, button);
        this.handleButtonAction(button);
      });
    });
  }

  addRippleEffect(e, button) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  handleButtonAction(button) {
    const buttonText = button.textContent.toLowerCase();
    if (buttonText.includes('download')) {
      window.location.href = '#download';
    } else if (buttonText.includes('log in')) {
      console.log('Triggering signInWithGoogle');
      Auth.signInWithGoogle();
    } else if (buttonText.includes('log out')) {
      console.log('Triggering signOut');
      Auth.signOut();
    } else if (buttonText.includes('free trial')) {
      window.location.href = '/signup';
    } else if (buttonText.includes('contact sales')) {
      window.location.href = '/contact';
    }
  }

  addRippleStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ripple {
        position: absolute;
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        background-color: rgba(255, 255, 255, 0.7);
      }

      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ripple {
          animation: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}