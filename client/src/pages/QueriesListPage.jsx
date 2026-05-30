import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function QueriesListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      const { data } = await api.get('/queries/all');
      setQueries(data.queries || []);
    } catch {
      toast.error('Failed to load queries');
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await api.patch(`/queries/${id}/resolve`);
      toast.success('Query resolved');
      fetchQueries();
    } catch {
      toast.error('Failed to resolve query');
    } finally {
      setResolvingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Logged out');
  };

  const statusColors = {
    open: { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
    in_progress: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
    resolved: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
    closed: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
  };

  return (
    <div className="auth-container" style={{ flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/user')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            display: 'flex', color: 'var(--text-secondary)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Samagama FAQs</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff'
          }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{user?.name}</span>
          <button onClick={handleLogout} style={{
            padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: 13, background: 'transparent', color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit'
          }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--error)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '32px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>All Queries</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Queries raised by all users</p>
          </div>
          <button onClick={() => navigate('/query')} style={{
            padding: '8px 18px', border: 'none', borderRadius: 'var(--radius-md)',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit'
          }}>Raise a Query</button>
        </div>

        {loading ? (
          <div>{[1,2,3,4].map(i => (
            <div key={i} style={{ height: 72, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 8 }} />
          ))}</div>
        ) : queries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 15 }}>No queries have been raised yet.</p>
          </div>
        ) : (
          queries.map(q => {
            const sc = statusColors[q.status] || statusColors.open;
            const isOwner = user?._id === q.user?._id;
            return (
              <div key={q._id} style={{
                background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: '16px 20px', marginBottom: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{q.question}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      by {q.user?.name || 'Unknown'} · {q.category}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: 12, fontWeight: 600,
                      background: sc.bg, color: sc.color, textTransform: 'capitalize'
                    }}>{q.status.replace(/_/g, ' ')}</span>
                    {(q.status === 'open' || q.status === 'in_progress') && (
                      <button onClick={() => handleResolve(q._id)} disabled={resolvingId === q._id} style={{
                        padding: '5px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
                        background: 'var(--success)', color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', opacity: resolvingId === q._id ? 0.6 : 1
                      }}>{resolvingId === q._id ? '...' : 'Resolve'}</button>
                    )}
                  </div>
                </div>
                {q.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 4 }}>{q.description}</p>
                )}
                {q.adminResponse && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-primary)',
                    borderLeft: '3px solid var(--accent)'
                  }}>
                    <strong>Admin:</strong> {q.adminResponse}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
