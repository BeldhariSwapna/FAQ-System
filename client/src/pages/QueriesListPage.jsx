import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const FILTERS = [
  { key: 'trending', label: 'Trending', icon: '🔥' },
  { key: 'oldest', label: 'Oldest', icon: '⏱️' },
  { key: 'high-priority', label: 'High Priority', icon: '⚡' },
  { key: 'answered', label: 'Answered', icon: null },
  { key: 'unanswered', label: 'Unanswered', icon: '❓' },
  { key: 'my', label: 'My Questions', icon: null },
  { key: 'needs-admin', label: 'Needs Admin Attention', icon: null },
];

export default function QueriesListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('unanswered');
  const [resolvingId, setResolvingId] = useState(null);
  const [upvotingId, setUpvotingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchQueries = useCallback(async (filter, p) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/queries/queue?filter=${filter}&page=${p}&limit=15`);
      setQueries(data.queries || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      toast.error('Failed to load queries');
      setQueries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchQueries(activeFilter, 1);
  }, [activeFilter, fetchQueries]);

  useEffect(() => {
    fetchQueries(activeFilter, page);
  }, [page, activeFilter, fetchQueries]);

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await api.patch(`/queries/${id}/resolve`);
      toast.success('Query resolved');
      fetchQueries(activeFilter, page);
    } catch {
      toast.error('Failed to resolve query');
    } finally {
      setResolvingId(null);
    }
  };

  const handleUpvote = async (id) => {
    setUpvotingId(id);
    try {
      const { data } = await api.post(`/queries/${id}/upvote`);
      setQueries(prev => prev.map(q => q._id === id ? { ...q, upvotes: data.upvotes || q.upvotes } : q));
    } catch {
      toast.error('Failed to upvote');
    } finally {
      setUpvotingId(null);
    }
  };

  const handleEscalate = async (id) => {
    try {
      await api.post(`/queries/${id}/escalate`);
      toast.success('Question escalated to admin');
      fetchQueries(activeFilter, page);
    } catch {
      toast.error('Failed to escalate');
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

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
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

      <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', padding: '24px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Question Queue</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Browse questions from all users</p>
          </div>
          <button onClick={() => navigate('/query')} style={{
            padding: '8px 18px', border: 'none', borderRadius: 'var(--radius-md)',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit'
          }}>Raise a Query</button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {FILTERS.map(f => {
            const isActive = f.key === activeFilter;
            return (
              <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
                padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms ease'
              }}>
                {f.icon && `${f.icon} `}{f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div>{[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 80, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 8 }} />
          ))}</div>
        ) : queries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 15 }}>No questions found in this view.</p>
          </div>
        ) : (
          queries.map(q => {
            const sc = statusColors[q.status] || statusColors.open;
            const userUpvoted = q.upvotes?.includes?.(user?._id);
            return (
              <div key={q._id} style={{
                background: q.escalated && q.status !== 'resolved' ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${q.escalated && q.status !== 'resolved' ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 8
              }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 44 }}>
                    <button onClick={() => handleUpvote(q._id)} disabled={upvotingId === q._id} title="Upvote" style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      color: userUpvoted ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'inherit'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={userUpvoted ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{q.upvotes?.length || 0}</span>
                    </button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                          {q.isUrgent && <span style={{ color: '#dc2626', marginRight: 4 }}>⚡</span>}
                          {q.escalated && !q.isUrgent && <span style={{ color: '#dc2626', marginRight: 4 }}>🔔</span>}
                          {q.question}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          by {q.user?.name || 'Unknown'} · {q.category}
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                        background: sc.bg, color: sc.color, textTransform: 'capitalize'
                      }}>{q.status.replace(/_/g, ' ')}</span>
                    </div>

                    {q.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                        {q.tags.map(t => (
                          <span key={t} style={{
                            padding: '1px 8px', borderRadius: '10px', fontSize: 11,
                            background: 'var(--bg-secondary)', color: 'var(--text-muted)'
                          }}>#{t}</span>
                        ))}
                      </div>
                    )}

                    {q.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
                        {q.description.substring(0, 200)}{q.description.length > 200 ? '…' : ''}
                      </p>
                    )}

                    {q.adminResponse && (
                      <div style={{
                        marginTop: 6, padding: '8px 12px', background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-primary)',
                        borderLeft: '3px solid var(--accent)'
                      }}>
                        {q.answeredBy?.name && <strong style={{ fontSize: 12 }}>{q.answeredBy.name}: </strong>}
                        {q.adminResponse}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{timeAgo(q.createdAt)}</span>
                      <span>{q.views} views</span>
                      {(q.status === 'open' || q.status === 'in_progress') && (
                        <>
                          <button onClick={() => handleResolve(q._id)} disabled={resolvingId === q._id} style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            fontSize: 12, color: 'var(--success)', fontFamily: 'inherit'
                          }}>Mark resolved</button>
                          <button onClick={() => handleEscalate(q._id)} style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            fontSize: 12, color: 'var(--error)', fontFamily: 'inherit'
                          }}>Escalate</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
              padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: page > 1 ? 'var(--bg-secondary)' : 'transparent', color: page > 1 ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: page > 1 ? 'pointer' : 'default', fontSize: 13, fontFamily: 'inherit'
            }}>Prev</button>
            <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
              padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: page < totalPages ? 'var(--bg-secondary)' : 'transparent', color: page < totalPages ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: page < totalPages ? 'pointer' : 'default', fontSize: 13, fontFamily: 'inherit'
            }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
