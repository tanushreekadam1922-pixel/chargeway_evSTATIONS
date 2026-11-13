import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app runs on :5173 and forwards every /api request to the Node backend on :3000,
// so the browser sees a single origin (no CORS setup needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
