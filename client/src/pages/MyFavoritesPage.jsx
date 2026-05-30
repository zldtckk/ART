import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function MyFavoritesPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/favorites?limit=50')
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
        <span className="header-title">我的收藏</span>
        <div />
      </div>
      {loading ? <div className="loading-spinner" /> : posts.length === 0 ? (
        <div className="empty-state"><p>还没有收藏</p></div>
      ) : posts.map(p => (
        <div key={p.id} className="post-card" onClick={() => navigate(`/post/${p.id}`)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="post-avatar" style={{ width: 24, height: 24 }}>
              {p.avatar_url ? <img src={p.avatar_url} alt="" /> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nickname}</span>
          </div>
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
