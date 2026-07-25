import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import TransaksiPage from './components/TransaksiPage'
import LabaRugi from './components/LabaRugi'
import Neraca from './components/Neraca'
import ProcessPage from './components/ProcessPage'
import FirebasePage from './components/FirebasePage'
import './style.css'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏛️' },
  { id: 'transaksi', label: 'Transaksi', icon: '💳' },
  { id: 'laba-rugi', label: 'Laba Rugi', icon: '📈' },
  { id: 'neraca', label: 'Neraca', icon: '⚖️' },
  { id: 'process', label: 'Proses', icon: '⚡' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="app-layout">
      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Desktop Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">💧</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">PDAM Seruyan</span>
            <span className="sidebar-brand-sub">Sistem Keuangan Digital</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Menu</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn${page === item.id ? ' active' : ''}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false) }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          <div className="sidebar-section-title" style={{ marginTop: '0.75rem' }}>Lainnya</div>
          <a href="/research" target="_blank" rel="noopener noreferrer" className="nav-btn">
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Research Engine</span>
          </a>
        </nav>
      </aside>

      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-brand">
            <div className="topbar-logo">💧</div>
            <div className="topbar-title">
              <span className="topbar-name">PDAM Seruyan</span>
              <span className="topbar-subtitle">Sistem Keuangan Digital</span>
            </div>
          </div>
          
          <div className="topbar-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" placeholder="Cari transaksi, menu, laporan..." />
          </div>

          <div className="topbar-right">
            <span className="topbar-clock">{currentTime}</span>
            <span className="topbar-status">Online</span>
            <button className="toggle-btn hide-mobile" onClick={() => setSidebarOpen(!sidebarOpen)} title="Menu">
              ☰
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {page === 'dashboard' && <Dashboard setPage={setPage} />}
          {page === 'transaksi' && <TransaksiPage />}
          {page === 'laba-rugi' && <LabaRugi />}
          {page === 'neraca' && <Neraca />}
          {page === 'process' && <ProcessPage />}
          {page === 'firebase' && <FirebasePage />}
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <nav className="bottom-nav">
        <ul className="bottom-nav-list">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`bottom-nav-item${page === item.id ? ' active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          ))}
        </ul>
      </nav>
    </div>
  )
}