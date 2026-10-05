import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App'
import './styles.css'
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
          </ClubConfigProvider>
        </ContentProvider>
      </AuthProvider>
    </MotionConfig>
  </React.StrictMode>,
)
