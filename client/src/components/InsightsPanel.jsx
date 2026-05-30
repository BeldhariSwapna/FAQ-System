import { useState, useEffect } from 'react';
import api from '../api/axios';

function InsightsCard({ title, children, icon }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden'
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span>{icon}</span>}
        {title}
      </div>
      <div style={{ padding: '12px 18px' }}>
        {children}
      </div>
    </div>
  );
}

export default function InsightsPanel() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const { data } = await api.get('/admin/insights');
      setInsights(data.insights);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Insights</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 200, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Insights</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Analytics and knowledge gap identification</p>
      </header>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatBox label="Total FAQs" value={insights?.totals?.totalFaqs || 0} />
        <StatBox label="Open Questions" value={insights?.totals?.totalOpenQueries || 0} color="#ca8a04" />
        <StatBox label="Unresolved" value={insights?.totals?.unresolvedQueries || 0} color="#dc2626" />
        <StatBox label="Escalated" value={insights?.totals?.escalatedQueries || 0} color="#dc2626" />
        <StatBox label="This Week" value={insights?.totals?.queriesThisWeek || 0} color="#2563eb" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <InsightsCard title="Most Asked Topics" icon="📈">
          {insights?.topicClusters?.length === 0 ? (
            <EmptyRow />
          ) : (
            insights?.topicClusters?.map((t, i) => (
              <Row key={i} label={t.topic.replace(/-/g, ' ')} value={`${t.count} questions`} bar={t.percentage} max={insights.topicClusters[0]?.percentage || 1} />
            ))
          )}
        </InsightsCard>

        <InsightsCard title="Failing FAQs" icon="❗">
          {insights?.failingFaqs?.length === 0 ? (
            <EmptyRow text="No recurring questions on FAQ topics" />
          ) : (
            insights?.failingFaqs?.map((f, i) => (
              <Row key={i} label={f.word} value={`${f.count} times`} bar={f.count} max={insights.failingFaqs[0]?.count || 1} color="var(--error)" />
            ))
          )}
        </InsightsCard>

        <InsightsCard title="Active Users (This Week)" icon="👤">
          {insights?.activeUsers?.length === 0 ? (
            <EmptyRow text="No active users this week" />
          ) : (
            insights?.activeUsers?.map((u, i) => (
              <Row key={i} label={u.name} value={`${u.count} questions`} bar={u.count} max={insights.activeUsers[0]?.count || 1} color="var(--accent)" />
            ))
          )}
        </InsightsCard>

        <InsightsCard title="Knowledge Gaps" icon="🧠">
          {insights?.knowledgeGaps?.length === 0 ? (
            <EmptyRow text="No uncovered topics detected" />
          ) : (
            insights?.knowledgeGaps?.map((g, i) => (
              <Row key={i} label={g.word} value={`${g.count} questions`} bar={g.count} max={insights.knowledgeGaps[0]?.count || 1} color="var(--warning)" />
            ))
          )}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Words appearing in open questions but missing from FAQ titles
          </div>
        </InsightsCard>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '12px 18px', minWidth: 120
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function Row({ label, value, bar, max, color }) {
  const pct = max > 0 ? Math.round((bar / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
        <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color || 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>{text || 'No data'}</div>;
}
