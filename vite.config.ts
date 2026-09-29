import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    watch: {
      ignored: ['**/*.zip', '**/dist/**', '**/.git/**'],
    },
  },
  preview: {
    host: true,
  },
  // Relative asset URLs make the production build work from file:// when users
  // double-click dist/index.html, while remaining valid in the dev server.
  base: './',
})
