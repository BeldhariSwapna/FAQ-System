import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'about-internship', 'certificate', 'code-of-conduct', 'coursework-vibe',
  'interviews', 'noc', 'rosetta', 'selection-offer', 'team-formation',
  'timing-dates', 'vibe-platform', 'work-mentorship', 'yaksha-chat',
];

const DRAFT_KEY = 'query-draft';
const SUGGESTED_TAGS = ['HR', 'onboarding', 'tools', 'project', 'certificate', 'noc', 'team', 'deadline', 'stipend', 'attendance'];

export default function QueryPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const prefillQuestion = location.state?.question || '';

  const [form, setForm] = useState({
    question: prefillQuestion,
    category: 'general',
    description: '',
    tags: [],
    isAnonymous: false,
    notifyOnResponse: false,
    isUrgent: false,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [charCount, setCharCount] = useState(prefillQuestion.length);
  const [duplicates, setDuplicates] = useState([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [similarSuggestions, setSimilarSuggestions] = useState([]);
  const [showSimilar, setShowSimilar] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [blockSubmit, setBlockSubmit] = useState(false);
  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const debounceRef = useRef(null);
  const categoryDebounceRef = useRef(null);
  const similarDebounceRef = useRef(null);
  const autosaveRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (prefillQuestion) {
      checkDuplicates(prefillQuestion);
      fetchSuggestedCategory(prefillQuestion);
      fetchSimilar(prefillQuestion);
      return;
    }
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm(parsed);
        setCharCount(parsed.question?.length || 0);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      if (form.question || form.description) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      }
    }, 2000);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [form]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'question') {
      setCharCount(value.length);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => checkDuplicates(value), 500);
      if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current);
      categoryDebounceRef.current = setTimeout(() => fetchSuggestedCategory(value), 700);
      if (similarDebounceRef.current) clearTimeout(similarDebounceRef.current);
      similarDebounceRef.current = setTimeout(() => fetchSimilar(value), 400);
      setBlockSubmit(false);
    }
  };

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase().replace(/^#/, '');
    if (!t || form.tags.includes(t)) return;
    setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput('');
  };

  const removeTag = (tag) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const checkDuplicates = async (q) => {
    if (q.trim().length < 5) { setDuplicates([]); return; }
    setDuplicateLoading(true);
    try {
      const { data } = await api.post('/queries/check-duplicate', { question: q });
      setDuplicates(data.duplicates || []);
    } catch {
      setDuplicates([]);
    } finally {
      setDuplicateLoading(false);
    }
  };

  const fetchSuggestedCategory = async (q) => {
    if (q.trim().length < 5) { setSuggestedCategory(null); return; }
    try {
      const { data } = await api.post('/queries/suggest-category', { question: q });
      if (data.category && data.category !== 'general' && data.confidence > 0.5) {
        setSuggestedCategory(data.category);
      } else {
        setSuggestedCategory(null);
      }
    } catch {
      setSuggestedCategory(null);
    }
  };

  const fetchSimilar = async (q) => {
    if (q.trim().length < 3) { setSimilarSuggestions([]); setShowSimilar(false); return; }
    try {
      const res = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`);
      const results = (res.data.results || []).filter(r => r.score > 0.3);
      setSimilarSuggestions(results);
      setShowSimilar(results.length > 0);
    } catch {
      setSimilarSuggestions([]);
      setShowSimilar(false);
    }
  };

  const applySuggestion = (suggestion) => {
    updateField('question', suggestion.question);
    setShowSimilar(false);
  };

  const acceptCategorySuggestion = () => {
    if (suggestedCategory) {
      setForm(prev => ({ ...prev, category: suggestedCategory }));
      setSuggestedCategory(null);
    }
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (!form.question.trim()) { toast.error('Please enter your question'); return; }

    const hasFaqDup = duplicates.some(d => d.type === 'faq' && d.score > 0.8);
    if (hasFaqDup && !blockSubmit) {
      setShowDupConfirm(true);
      return;
    }

    submitQuery();
  };

  const submitQuery = async () => {
    setShowDupConfirm(false);
    setLoading(true);
    try {
      await api.post('/queries', form);
      setSubmitted(true);
      localStorage.removeItem(DRAFT_KEY);
      toast.success('Query submitted successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit query';
      toast.error(msg);
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
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>We'll review your question and get back to you soon.</p>
          {form.notifyOnResponse && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>You'll be notified when there's a response.</p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => navigate('/user', { replace: true })} style={{
              padding: '10px 24px', border: 'none', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>Back to FAQs</button>
            <button onClick={() => navigate('/queries')} style={{
              padding: '10px 24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>View All Queries</button>
          </div>
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

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Raise a Query</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
          Didn't find what you were looking for? Let us know and we'll help.
        </p>

        <form ref={formRef} onSubmit={handleSubmitClick}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="q-question" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              <span>Question <span style={{ color: 'var(--error)' }}>*</span></span>
              <span style={{ fontSize: 12, fontWeight: 400, color: charCount > 150 ? 'var(--error)' : 'var(--text-muted)' }}>{charCount} / 200</span>
            </label>

            <div style={{ position: 'relative' }}>
              <input
                id="q-question"
                type="text"
                placeholder="What would you like to know?"
                value={form.question}
                onChange={(e) => updateField('question', e.target.value.slice(0, 200))}
                required
                style={{
                  width: '100%', padding: '10px 14px', border: `1px solid ${blockSubmit ? 'var(--error)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'inherit',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = blockSubmit ? 'var(--error)' : 'var(--border)'}
              />

              {showSimilar && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  marginTop: 4, maxHeight: 200, overflowY: 'auto'
                }}>
                  <div style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    Similar questions found
                  </div>
                  {similarSuggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => applySuggestion(s)} style={{
                      width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none',
                      background: 'transparent', cursor: 'pointer', fontSize: 13,
                      color: 'var(--text-primary)', fontFamily: 'inherit',
                      borderBottom: i < similarSuggestions.length - 1 ? '1px solid var(--border)' : 'none'
                    }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <div>{s.question}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>FAQ · {Math.round(s.score * 100)}% match</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {duplicateLoading && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Checking for duplicates…</div>
            )}

            {duplicates.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {duplicates.map((d, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 4,
                    background: d.type === 'faq' ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)',
                    border: `1px solid ${d.type === 'faq' ? 'rgba(234,179,8,0.3)' : 'rgba(59,130,246,0.3)'}`,
                    fontSize: 13, color: 'var(--text-primary)'
                  }}>
                    {d.type === 'faq' ? (
                      <>
                        <span style={{ fontWeight: 600, color: '#ca8a04' }}>Already in FAQ</span>
                        <p style={{ margin: '2px 0', lineHeight: 1.4 }}>{d.question}</p>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 600, color: '#2563eb' }}>Similar query pending</span>
                        <p style={{ margin: '2px 0', lineHeight: 1.4 }}>{d.question}</p>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status: {d.status}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="q-category" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Category {suggestedCategory && <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>· Auto-suggested</span>}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                id="q-category"
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid var(--border)',
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
              {suggestedCategory && suggestedCategory !== form.category && (
                <button type="button" onClick={acceptCategorySuggestion} style={{
                  padding: '8px 14px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
                }}>Use "{suggestedCategory.replace(/-/g, ' ')}"</button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Tags <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {form.tags.map(t => (
                <span key={t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 10px', borderRadius: '12px', fontSize: 12,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)'
                }}>
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 14, color: 'var(--text-muted)', lineHeight: 1
                  }}>&times;</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                placeholder="Type a tag and press Enter"
                style={{
                  flex: 1, padding: '8px 12px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'inherit',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  outline: 'none', boxSizing: 'border-box'
                }}
              />
              <button type="button" onClick={() => addTag(tagInput)} style={{
                padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit'
              }}>Add</button>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {SUGGESTED_TAGS.filter(t => !form.tags.includes(t)).map(t => (
                <button key={t} type="button" onClick={() => addTag(t)} style={{
                  padding: '2px 8px', border: '1px dashed var(--border)', borderRadius: '10px',
                  background: 'transparent', fontSize: 11, color: 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}>+ {t}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="q-desc" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="q-desc"
              placeholder="Provide any additional details..."
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
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

          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              Post anonymously (name won't be shown)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.notifyOnResponse} onChange={(e) => setForm(prev => ({ ...prev, notifyOnResponse: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              Notify me when there's a response
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isUrgent} onChange={(e) => setForm(prev => ({ ...prev, isUrgent: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              ⚡ Mark as urgent
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={loading || blockSubmit} style={{
              flex: 1, padding: '12px', border: 'none',
              borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 600,
              background: loading ? 'var(--text-muted)' : 'var(--accent)',
              color: '#fff', cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'opacity 150ms ease'
            }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
              onMouseOut={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}>
              {loading ? 'Submitting...' : 'Submit Query'}
            </button>
            <button type="button" onClick={() => setShowPreview(true)}
              disabled={!form.question.trim()}
              style={{
                padding: '12px 20px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
                background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                cursor: form.question.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', opacity: form.question.trim() ? 1 : 0.5
              }}>Preview</button>
          </div>
        </form>
      </div>

      {showDupConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24
        }} onClick={() => setShowDupConfirm(false)}>
          <div style={{ maxWidth: 440, width: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Similar questions already exist</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                We found questions similar to yours in our FAQ. Are you sure you want to post? You may find your answer faster by searching.
              </p>
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {duplicates.filter(d => d.type === 'faq').slice(0, 3).map((d, i) => (
                  <div key={i} style={{ padding: '6px 10px', background: 'rgba(234,179,8,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 4, fontSize: 13 }}>
                    {d.question}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => { setShowDupConfirm(false); setBlockSubmit(true); }} style={{
                padding: '8px 18px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                color: 'var(--text-secondary)'
              }}>Cancel</button>
              <button type="button" onClick={submitQuery} style={{
                padding: '8px 18px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit'
              }}>Yes, post anyway</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24
        }} onClick={() => setShowPreview(false)}>
          <div style={{
            maxWidth: 520, width: '100%', background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
            overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Preview</span>
              <button type="button" onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20 }}>&times;</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>QUESTION</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{form.question}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>CATEGORY</div>
                <div style={{ fontSize: 13 }}>{form.category.replace(/-/g, ' ')}</div>
              </div>
              {form.tags?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>TAGS</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {form.tags.map(t => <span key={t} style={{ padding: '1px 8px', borderRadius: 10, fontSize: 12, background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>#{t}</span>)}
                  </div>
                </div>
              )}
              {form.description && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>DESCRIPTION</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{form.description}</div>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Posted as: {form.isAnonymous ? 'Anonymous' : user?.name} · Notifications: {form.notifyOnResponse ? 'On' : 'Off'} · {form.isUrgent ? '⚡ Urgent' : ''}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowPreview(false)} style={{
                padding: '8px 18px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                color: 'var(--text-secondary)'
              }}>Edit</button>
              <button type="button" onClick={() => { setShowPreview(false); submitQuery(); }} style={{
                padding: '8px 18px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit'
              }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
