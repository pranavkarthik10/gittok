import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { LikedReposProvider } from './contexts/LikedReposContext'
import { Analytics } from '@vercel/analytics/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LikedReposProvider>
      <App />
      <Analytics />
    </LikedReposProvider>
  </React.StrictMode>,
)
