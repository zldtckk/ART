import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function MyCommentsPage() {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/comments?limit=50')
      .then(r => setComments(r.data.comments))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (t) => { const d = new Date(t+'Z'); return `${d.getMonth()+1}/${d.getDate()}`; };

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          返回
        </button>
        <span className="header-title">我的评论</span>
        <div />
      </div>
      {loading ? <div className="loading-spinner" /> : comments.length === 0 ? (
        <div className="empty-state"><p>还没有评论</p></div>
      ) : comments.map(c => (
        <div key={c.id} className="post-card" onClick={() => navigate(`/post/${c.post_id}`)}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            回复了: {c.post_preview}
          </div>
          <div className="post-content" style={{ fontSize: 14, marginBottom: 4 }}>{c.content}</div>
          <div className="post-meta" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fmt(c.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
