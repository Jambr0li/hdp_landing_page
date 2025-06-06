import { defineConfig } from 'vite';

export default defineConfig({
  // Configure Vite for multi-page app
  build: {
    rollupOptions: {
      input: {
        main: '/index.html',
        dashboard: '/dashboard.html',
        'callback': '/callback.html',
        login: '/login.html',
        cancel: '/cancel.html',
        success: '/success.html',
      },
    },
  },

  server: {
    port: 3000,
  },
});