import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { searchFAQs, getSuggestions } from '../api/searchApi';
import SearchBar from '../components/SearchBar';
import SearchSuggestions from '../components/SearchSuggestions';
import FaqAssistant from '../components/FaqAssistant';
import '../styles/search.css';
import '../styles/yaksha.css';

const CATEGORIES = [
  'about-internship', 'certificate', 'code-of-conduct', 'coursework-vibe',
  'interviews', 'noc', 'rosetta', 'selection-offer', 'team-formation',
  'timing-dates', 'vibe-platform', 'work-mentorship', 'yaksha-chat',
  'programme-overview',
];

export default function UserPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchFaqIds, setSearchFaqIds] = useState(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [highlightedFaq, setHighlightedFaq] = useState(null);
  const debounceRef = useRef(null);
  const overviewRef = useRef(null);
  const faqRefs = useRef({});
  const searchContainerRef = useRef(null);

  useEffect(() => {
    fetchAllFAQs();
    fetchOverview();
  }, []);

  const fetchAllFAQs = async () => {
    setFaqsLoading(true);
    try {
      const { data } = await api.get('/faqs?limit=200');
      setFaqs(data.results || []);
    } catch {
      setFaqs([]);
    } finally {
      setFaqsLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const { data } = await api.get('/internship/overview');
      if (data.success) setOverview(data.sections);
    } catch {
      // ignore
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSuggestionsLoading(true);
    try {
      const data = await getSuggestions(q);
      setSuggestions(data.results || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 3) return;
    setQuery(q);
    setShowSuggestions(false);
    setSemanticLoading(true);
    try {
      const data = await searchFAQs(q);
      if (data.sources && data.sources.length > 0) {
        const ids = data.sources.map(s => s.faqId);
        setSearchFaqIds(ids);
        setActiveCategory(null);
        setOverviewOpen(false);
        setTimeout(() => {
          const first = faqRefs.current[ids[0]];
          if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      } else {
        setSearchFaqIds([]);
      }
    } catch {
      setSearchFaqIds([]);
    } finally {
      setSemanticLoading(false);
    }
  }, []);

  const handleSelectSuggestion = useCallback((suggestion) => {
    if (!suggestion) {
      setQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setQuery(suggestion.question);
    setShowSuggestions(false);
    handleSearch(suggestion.question);
  }, [handleSearch]);

  const handleInputChange = (val) => {
    setQuery(val);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleInputKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleSearch(query);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) handleSelectSuggestion(suggestions[selectedIndex]);
      else handleSearch(query);
    } else if (e.key === 'Escape') setShowSuggestions(false);
  };

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const showOverview = overviewOpen && !searchFaqIds;

  const sectionContent = (section, i) => {
    switch (section.type) {
      case 'lead': return <p key={i} style={{ fontSize: 15, marginBottom: 16, lineHeight: 1.7 }}>{section.content}</p>;
      case 'heading': return <h3 key={i} style={{ fontSize: 16, fontWeight: 600, margin: '20px 0 10px', color: 'var(--text-primary)' }}>{section.content}</h3>;
      case 'text': return <p key={i} style={{ marginBottom: 12, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: section.html }} />;
      case 'note': return <div key={i} style={{ background: 'var(--accent-light)', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 12, borderLeft: '3px solid var(--accent)' }}>{section.content}</div>;
      case 'tracks': return section.tracks?.map((t, ti) => (
        <div key={`${i}-${ti}`} style={{ marginBottom: 16 }}><strong style={{ color: 'var(--text-primary)' }}>{t.title}</strong><p style={{ marginTop: 4 }}>{t.content}</p></div>
      ));
      case 'table': return (
        <div key={i} style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--bg-secondary)' }}>
              {['Badge', 'Phase', 'Description', 'Required?'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border)', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{section.rows?.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{cell}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      );
      case 'list': return <ul key={i} style={{ paddingLeft: 20, marginBottom: 12 }}>{section.items?.map((item, li) => <li key={li} style={{ marginBottom: 4 }}>{item}</li>)}</ul>;
      case 'ordered-list': return <ol key={i} style={{ paddingLeft: 20, marginBottom: 12 }}>{section.items?.map((item, li) => <li key={li} style={{ marginBottom: 4 }}>{item}</li>)}</ol>;
      default: return null;
    }
  };

  const displayedFaqs = searchFaqIds ? faqs.filter(f => searchFaqIds.includes(f._id)) : activeCategory ? faqs.filter(f => f.category === activeCategory) : faqs;

  const topFaqs = searchFaqIds ? [] : faqs.slice(0, 4);

  return (
    <div className="auth-container" style={{ flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', backdropFilter: 'blur(16px)'
      }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Samagama FAQs</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/queries')} style={{
            padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: 13, background: 'transparent', color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit'
          }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
            View Queries
          </button>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer'
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 8 }}>How can we help you?</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Search our knowledge base for instant answers</p>
        </div>

        <div ref={searchContainerRef} className="faq-page-search-area" style={{ marginBottom: 24 }}>
          <SearchBar
            onSearch={handleSearch}
            onSelectSuggestion={handleSelectSuggestion}
            loading={semanticLoading}
            onQueryChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
          />
          {showSuggestions && (
            <SearchSuggestions
              suggestions={suggestions}
              loading={suggestionsLoading}
              onSelect={handleSelectSuggestion}
              selectedIndex={selectedIndex}
              query={query}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {CATEGORIES.map(cat => {
            const isActive = cat === activeCategory;
            return (
              <button key={cat} onClick={() => {
                if (cat === 'programme-overview') {
                  if (overviewOpen) { setOverviewOpen(false); return; }
                  setQuery(''); setSearchFaqIds(null); setActiveCategory(null); setOverviewOpen(true);
                  setTimeout(() => overviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                } else {
                  setActiveCategory(isActive ? null : cat); setSearchFaqIds(null); setOverviewOpen(false);
                }
              }}
                style={{
                  padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms ease', textTransform: 'capitalize'
                }}
                onMouseOver={e => { if (!isActive) { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}}
                onMouseOut={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}}>
                {cat === 'programme-overview' ? 'Programme Overview' : cat.replace(/-/g, ' ')}
              </button>
            );
          })}
        </div>

        {showOverview && (
          <div ref={overviewRef} style={{
            background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            overflow: 'hidden', marginBottom: 24
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px', borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Programme Overview</span>
              </div>
              <button onClick={() => setOverviewOpen(false)} style={{
                padding: '6px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit'
              }}>Back</button>
            </div>
            <div style={{ padding: '20px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              {overviewLoading ? (
                <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
              ) : overview ? (
                overview.map((s, i) => sectionContent(s, i))
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Failed to load overview</p>
              )}
            </div>
          </div>
        )}

        {!showOverview && (faqsLoading ? (
          <div>{[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 48, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 8, animation: 'shimmer 1.5s infinite', backgroundImage: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-card) 50%, var(--bg-secondary) 100%)', backgroundSize: '200% 100%' }} />
          ))}</div>
        ) : (
          <div>
            {!searchFaqIds && !activeCategory && topFaqs.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Trending FAQs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
                  {topFaqs.map(faq => (
                    <div key={faq._id} onClick={() => {
                      document.querySelector(`details[data-faq-id="${faq._id}"]`)?.scrollIntoView({ behavior: 'smooth' });
                    }} style={{
                      padding: '10px 14px', background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)',
                      transition: 'border-color 150ms ease'
                    }}
                      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      {faq.question}
                    </div>
                  ))}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>All FAQs</h3>
              </>
            )}
            {activeCategory && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'capitalize' }}>
                Showing: <strong style={{ color: 'var(--text-primary)' }}>{activeCategory.replace(/-/g, ' ')}</strong>
              </p>
            )}
            {displayedFaqs.length === 0 && !faqsLoading && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                {searchFaqIds ? 'No matching FAQs found for your search.' : 'No FAQs in this category yet.'}
              </div>
            )}
            {displayedFaqs.map(faq => {
              const matched = searchFaqIds?.includes(faq._id);
              return (
                <details key={faq._id} data-faq-id={faq._id} open={!!matched || highlightedFaq === faq._id}
                  ref={el => { if (el) faqRefs.current[faq._id] = el; }}
                  onToggle={e => { if (!e.target.open && highlightedFaq === faq._id) setHighlightedFaq(null); }}
                  style={{
                    display: searchFaqIds && !matched ? 'none' : 'block',
                    background: matched ? 'var(--accent-light)' : 'var(--bg-card)',
                    backdropFilter: 'blur(16px)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', marginBottom: 8, overflow: 'hidden'
                  }}>
                  <summary style={{
                    padding: '14px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                    color: 'var(--text-primary)'
                  }}>
                    {faq.question}
                  </summary>
                  <div style={{ padding: '0 20px 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {faq.answer}
                  </div>
                </details>
              );
            })}
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/query')} title="Raise a Query" style={{
        position: 'fixed', bottom: 100, right: 24, zIndex: 100,
        width: 56, height: 56, borderRadius: '50%', border: 'none',
        background: 'var(--accent)', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', transition: 'transform 150ms ease',
        fontSize: 24, fontFamily: 'inherit'
      }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </button>
      <FaqAssistant />
    </div>
  );
}
