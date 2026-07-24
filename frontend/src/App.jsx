import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import TransaksiPage from './components/TransaksiPage'
import LabaRugi from './components/LabaRugi'
import Neraca from './components/Neraca'
import ProcessPage from './components/ProcessPage'
import FirebasePage from './components/FirebasePage'
import './style.css'

const mainNavItems = [
  { id: 'dashboard', label: 'Treasury Dashboard', icon: '🏛️', badge: 'LIVE' },
  { id: 'transaksi', label: 'Transfer & Jurnal', icon: '💳' },
  { id: 'laba-rugi', label: 'Income Statement', icon: '📊' },
  { id: 'neraca', label: 'Balance & Reserves', icon: '⚖️' },
]

const engineNavItems = [
  { id: 'process', label: 'ETL Engine & Output', icon: '⚡', badge: 'AUTO' },
  { id: 'firebase', label: 'Cloud Vault Sync', icon: '☁️' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ' • ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">🏛️</div>
          <div className="brand-text">
            <span className="brand-title">TIRTA SERUYAN</span>
            <span className="brand-sub">COMMERCIAL BANKING</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Corporate Treasury</div>
          {mainNavItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}

          <div className="nav-section-title" style={{ marginTop: '0.85rem' }}>Automation & Vault</div>
          {engineNavItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="/research" target="_blank" rel="noopener noreferrer" className="nav-btn">
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Research Engine</span>
          </a>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Navigation Sidebar">
            ☰
          </button>
          <div className="topbar-title">
            <span>PERUMDAM TIRTA SERUYAN</span>
            <span className="topbar-tag">💳 TIER-1 CAPITAL</span>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>| Executive Banking & Automated Treasury System</span>
          </div>
          <div className="topbar-right">
            <span className="system-clock">{currentTime}</span>
            <span className="badge-online">VAULT • ONLINE</span>
          </div>
        </header>

        <main className="main-content">
          {page === 'dashboard' && <Dashboard setPage={setPage} />}
          {page === 'transaksi' && <TransaksiPage />}
          {page === 'laba-rugi' && <LabaRugi />}
          {page === 'neraca' && <Neraca />}
          {page === 'process' && <ProcessPage />}
          {page === 'firebase' && <FirebasePage />}
        </main>
      </div>
    </div>
  )
}
