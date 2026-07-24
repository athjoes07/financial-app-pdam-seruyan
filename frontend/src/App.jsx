import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import TransaksiPage from './components/TransaksiPage'
import LabaRugi from './components/LabaRugi'
import Neraca from './components/Neraca'
import ProcessPage from './components/ProcessPage'
import FirebasePage from './components/FirebasePage'
import './style.css'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '\u{1F3E0}' },
  { id: 'transaksi', label: 'Transaksi', icon: '\u{1F4CB}' },
  { id: 'laba-rugi', label: 'Laba Rugi', icon: '\u{1F4C9}' },
  { id: 'neraca', label: 'Neraca', icon: '\u{1F4CA}' },
  { id: 'process', label: 'Proses', icon: '\u{2699}\u{FE0F}' },
  { id: 'firebase', label: 'Firebase', icon: '\u{2601}\u{FE0F}' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">PDAM</div>
          <div className="brand-text">
            <span className="brand-title">TIRTA SERUYAN</span>
            <span className="brand-sub">Keuangan</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="/research" target="_blank" rel="noopener noreferrer" className="nav-btn">
            <span className="nav-icon">{'\u{1F50D}'}</span>
            <span className="nav-label">Research Skills</span>
          </a>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '\u{2630}' : '\u{2630}'}
          </button>
          <span className="topbar-title">PERUMDAM TIRTA SERUYAN</span>
          <div className="topbar-right">
            <span className="badge-online">Online</span>
          </div>
        </header>
        <main className="main-content">
          {page === 'dashboard' && <Dashboard />}
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
