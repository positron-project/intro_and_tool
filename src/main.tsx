import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { AppConfirmationHost } from './components/AppConfirmation'
import './styles.css'
// Tailwind 骨架：只提供 theme + utilities 两个 layer，不含 preflight，
// 不会覆盖 styles.css 里的既有样式（未分层 CSS 在层叠中优先于 @layer）。
import './tailwind.css'
import { AuthProvider } from './services/auth.context'
import { ContentProvider } from './services/content.context'
import { ClubConfigProvider } from './services/club-config.context'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ContentProvider>
          <ClubConfigProvider>
            <App />
            <AppConfirmationHost />
          </ClubConfigProvider>
        </ContentProvider>
      </AuthProvider>
    </MotionConfig>
  </React.StrictMode>,
)
