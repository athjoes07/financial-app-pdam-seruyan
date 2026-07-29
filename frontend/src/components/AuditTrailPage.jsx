import React, { useState, useEffect } from 'react';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/process/audit-logs');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    (log.kategori && log.kategori.toLowerCase().includes(search.toLowerCase())) ||
    (log.sumber_file && log.sumber_file.toLowerCase().includes(search.toLowerCase())) ||
    (log.deskripsi && log.deskripsi.toLowerCase().includes(search.toLowerCase())) ||
    (log.hash && log.hash.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    if (status === 'SUCCESS' || status === 'BALANCED') {
      return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#def7ec', color: '#03543f', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
    }
    if (status === 'UNBALANCED' || status === 'WARNING') {
      return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fdf6b2', color: '#723b13', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
    }
    return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fde8e8', color: '#9b1c1c', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
  };

  const parseState = (stateStr) => {
    if (!stateStr) return 'null';
    try {
      return JSON.stringify(JSON.parse(stateStr), null, 2);
    } catch (e) {
      return stateStr;
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', backgroundColor: '#f9fafb', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Riwayat Audit (Forensik)</h1>
          <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Pantau seluruh aktivitas pengubahan data dan validasi integritas hash.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔄</span> Segarkan
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Cari berdasarkan file, deskripsi, atau Hash..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Memuat riwayat audit...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Gagal memuat: {error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f3f4f6', color: '#4b5563', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>Waktu</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>Aktivitas / File</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>Detail</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>Integritas (Hash)</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>Aksi</th>
                </tr>
              </thead>
              <tbody style={{ color: '#1f2937' }}>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Tidak ada riwayat audit ditemukan.</td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <React.Fragment key={log.id}>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: expandedId === log.id ? '#f8fafc' : 'white' }}>
                        <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600 }}>{log.kategori}</div>
                          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>{log.deskripsi}</div>
                          {log.sumber_file && <div style={{ color: '#3b82f6', fontSize: '0.75rem', marginTop: '0.1rem' }}>📁 {log.sumber_file}</div>}
                        </td>
                        <td style={{ padding: '1rem' }}>{getStatusBadge(log.status)}</td>
                        <td style={{ padding: '1rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.detail}
                        </td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.7rem', color: '#6b7280', maxWidth: '150px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.hash}>
                            🔒 {log.hash || 'N/A'}
                          </div>
                          {log.prev_hash && (
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.25rem', opacity: 0.7 }} title={log.prev_hash}>
                              ⏮️ {log.prev_hash}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button 
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', color: '#374151' }}
                          >
                            {expandedId === log.id ? 'Tutup' : 'Lihat JSON'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan="6" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#4b5563', textTransform: 'uppercase' }}>Before State</h4>
                                <div style={{ backgroundColor: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                                  <pre style={{ margin: 0 }}>
                                    {parseState(log.before_state)}
                                  </pre>
                                </div>
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#4b5563', textTransform: 'uppercase' }}>After State</h4>
                                <div style={{ backgroundColor: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                                  <pre style={{ margin: 0 }}>
                                    {parseState(log.after_state)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                              <strong>Full SHA-256 Hash:</strong> <span style={{ fontFamily: 'monospace', userSelect: 'all' }}>{log.hash}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
