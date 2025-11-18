import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // React plugin for Vite
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(), // React plugin to support React syntax
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Django backend (make sure it's running)
        changeOrigin: true,
        secure: false, // If your backend uses HTTP, this is fine
      },
    },
  },
});
