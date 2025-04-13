document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const header = document.querySelector('.header');
    const nav = document.querySelector('.nav');
    let isNavVisible = false;

    function toggleNav() {
        isNavVisible = !isNavVisible;
        nav.classList.toggle('active');
        
        // Animate menu icon
        const menuIcon = document.querySelector('.mobile-menu-btn i');
        if (menuIcon) {
            menuIcon.className = isNavVisible ? 'fas fa-times' : 'fas fa-bars';
        }

        // Prevent body scroll when menu is open
        document.body.style.overflow = isNavVisible ? 'hidden' : '';
    }

    // Create mobile menu button
    if (window.innerWidth <= 768) {
        const menuButton = document.createElement('button');
        menuButton.className = 'mobile-menu-btn';
        menuButton.setAttribute('aria-label', 'Toggle navigation menu');
        menuButton.innerHTML = '<i class="fas fa-bars"></i>';
        header.appendChild(menuButton);
        
        menuButton.addEventListener('click', toggleNav);
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isNavVisible && !nav.contains(e.target) && !menuButton.contains(e.target)) {
                toggleNav();
            }
        });

        // Close menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && isNavVisible) {
                toggleNav();
            }
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                // Close mobile menu if open
                if (isNavVisible) {
                    toggleNav();
                }
                
                const headerHeight = header.offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Header scroll effect with throttle
    let lastScroll = 0;
    let ticking = false;
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScroll = window.pageYOffset;
                
                // Add/remove background blur based on scroll position
                header.style.backgroundColor = currentScroll > 50 
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 1)';
                header.style.backdropFilter = currentScroll > 50 ? 'blur(8px)' : 'none';

                // Hide/show header based on scroll direction
                if (!isNavVisible) { // Don't hide header when mobile menu is open
                    if (currentScroll > lastScroll && currentScroll > scrollThreshold) {
                        // Scrolling down
                        header.style.transform = 'translateY(-100%)';
                    } else {
                        // Scrolling up
                        header.style.transform = 'translateY(0)';
                    }
                }

                lastScroll = currentScroll;
                ticking = false;
            });

            ticking = true;
        }
    });

    // Button interactions with ripple effect
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
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
            
            // Remove ripple after animation
            ripple.addEventListener('animationend', () => ripple.remove());

            // Handle button actions
            const buttonText = button.textContent.toLowerCase();
            if (buttonText.includes('download')) {
                window.location.href = '#download';
            } else if (buttonText.includes('log in')) { 
                console.log("Handle Auth");
            } else if (buttonText.includes('free trial')) {
                window.location.href = '/signup';
            } else if (buttonText.includes('contact sales')) {
                window.location.href = '/contact';
            }
        });
    });

    // Pricing card interactions
    const pricingCards = document.querySelectorAll('.pricing-card');
    pricingCards.forEach(card => {
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
    
    // Add styles
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

        @media (prefers-reduced-motion: reduce) {
            .ripple {
                animation: none;
            }
        }
    `;
    document.head.appendChild(style);
});