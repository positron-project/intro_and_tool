import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // 单文件交付物（nchu-cs-club-standalone.html）必须打成一个不含 ESM import 的整包：
  // 多 chunk 的入口带着 `import ... from './vendor-xxx.js'`，内联进 <script> 后会直接
  // 报 "Cannot use import statement outside a module" 并白屏，所以 --mode standalone
  // 关掉 manualChunks 并强制 inlineDynamicImports。
  const isStandalone = mode === 'standalone'

  return {
    // Tailwind is pulled in as a utility-only skeleton: src/tailwind.css imports
    // the theme + utilities layers but deliberately skips preflight, so the
    // existing hand-written stylesheet keeps owning resets and base styles.
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      // Keep the port fixed: the Windows Firewall rule that opens this app to the
      // WireGuard subnet (10.114.114.0/24, fd42:42:42::/64) is pinned to 5173/4173,
      // so an auto-incremented port would silently be unreachable from other hosts.
      strictPort: true,
      // Proxy the API and uploaded files to the local FastAPI backend so that
      // VITE_API_BASE_URL=/api stays same-origin and never hits CORS.
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
      watch: {
        // Editors (VS Code / JetBrains) write atomically through a sibling
        // ".<name>.<pid>.<uuid>.tmpdir" directory. Watching it used to crash the
        // dev server with `EBUSY: resource busy or locked, watch ...README.md.tmp`,
        // so temp artifacts and the local backup archive stay out of the watcher.
        ignored: ['**/*.zip', '**/dist/**', '**/.git/**', '**/*.tmpdir/**', '**/*.tmp', '**/backups/**'],
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
    build: {
      // Standalone intentionally inlines the whole app into one classic file;
      // keep the normal multi-chunk budget strict while allowing that artifact's
      // known single-bundle size without a misleading warning.
      chunkSizeWarningLimit: isStandalone ? 1200 : 600,
      rollupOptions: {
        output: isStandalone
          ? { inlineDynamicImports: true }
          : {
              manualChunks: (id) => {
                const normalizedId = id.replaceAll('\\', '/')
                if (
                  normalizedId.includes('/src/components/admin/AdminPage.tsx') ||
                  normalizedId.includes('/src/components/admin-modals.tsx')
                ) {
                  return 'page-admin'
                }
                if (
                  normalizedId.includes('/src/components/interviews.tsx') ||
                  normalizedId.includes('/src/components/prompt-modals.tsx')
                ) {
                  return 'page-tools'
                }
                if (id.includes('node_modules/framer-motion')) {
                  return 'vendor-motion'
                }
                if (id.includes('node_modules/lucide-react')) {
                  return 'vendor-lucide'
                }
                if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                  return 'vendor-react'
                }
                if (id.includes('node_modules/lenis')) {
                  return 'vendor-lenis'
                }
              },
            },
      },
    },
  }
})
