import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
  },
  // Relative asset URLs make the production build work from file:// when users
  // double-click dist/index.html, while remaining valid in the dev server.
  base: './',
})
