import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Keep the port fixed: the Windows Firewall rule that opens this app to the
    // WireGuard subnet (10.114.114.0/24, fd42:42:42::/64) is pinned to 5173/4173,
    // so an auto-incremented port would silently be unreachable from other hosts.
    strictPort: true,
    watch: {
      ignored: ['**/*.zip', '**/dist/**', '**/.git/**'],
    },
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  // Relative asset URLs make the production build work from file:// when users
  // double-click dist/index.html, while remaining valid in the dev server.
  base: './',
})
