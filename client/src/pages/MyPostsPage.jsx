import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function MyPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/posts?limit=50')
      .then(r => setPosts(r.data.posts))
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
        <span className="header-title">我的帖子</span>
        <div />
      </div>
      {loading ? <div className="loading-spinner" /> : posts.length === 0 ? (
        <div className="empty-state"><p>还没有发帖</p></div>
      ) : posts.map(p => (
        <div key={p.id} className="post-card" onClick={() => navigate(`/post/${p.id}`)}>
          <div className="post-content" style={{ fontSize: 14, marginBottom: 6 }}>{p.content}</div>
          <div className="post-meta" style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', gap: 8 }}>
            <span>{fmt(p.created_at)}</span>
            <span>{p.like_count} 赞 · {p.comment_count} 评论</span>
          </div>
        </div>
      ))}
    </div>
  );
}
