import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'about-internship', 'certificate', 'code-of-conduct', 'coursework-vibe',
  'interviews', 'noc', 'rosetta', 'selection-offer', 'team-formation',
  'timing-dates', 'vibe-platform', 'work-mentorship', 'yaksha-chat',
];

export default function QueryPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const prefillQuestion = location.state?.question || '';

  const [form, setForm] = useState({
    question: prefillQuestion,
    category: 'general',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim()) {
      toast.error('Please enter your question');
      return;
    }
    setLoading(true);
    try {
      await api.post('/queries', form);
      setSubmitted(true);
      toast.success('Query submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit query');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Logged out');
  };

  if (submitted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
            <path d="M8 12l2 2 4-4" />
          </svg>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Query Submitted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>We'll review your question and get back to you soon.</p>
          <button onClick={() => navigate('/dashboard', { replace: true })} style={{
            padding: '10px 24px', border: 'none', borderRadius: 'var(--radius-md)',
            background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit'
          }}>Back to FAQs</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container" style={{ flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard')} style={{
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

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Raise a Query</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
          Didn't find what you were looking for? Let us know and we'll help.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="q-question" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Question <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              id="q-question"
              type="text"
              placeholder="What would you like to know?"
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
              required
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'inherit',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="q-category" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Category
            </label>
            <select
              id="q-category"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'inherit',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <option value="general">General</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>
              ))}
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="q-desc" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="q-desc"
              placeholder="Provide any additional details..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={5}
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'inherit',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', border: 'none',
            borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 600,
            background: loading ? 'var(--text-muted)' : 'var(--accent)',
            color: '#fff', cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'opacity 150ms ease'
          }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
            onMouseOut={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}>
            {loading ? 'Submitting...' : 'Submit Query'}
          </button>
        </form>
      </div>
    </div>
  );
}
