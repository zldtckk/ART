import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'free', label: '免费赠送' },
  { key: 'art_supplies', label: '画材' },
  { key: 'books', label: '书籍' },
  { key: 'other', label: '其他' },
];

const TAG_LABELS = { buy: '求购', sell: '出售', giveaway: '赠送' };
const TAG_COLORS = { buy: '#ff9500', sell: '#007aff', giveaway: '#34c759' };
const CATEGORY_LABELS = { free: '免费赠送', art_supplies: '画材', books: '书籍', other: '其他' };

export default function BoardMarketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    loadPosts(1);
  }, [category, tagFilter]);

  const loadPosts = async (p) => {
    setLoading(true);
    try {
      const params = { board: 'market', limit: 20, page: p };
      if (category !== 'all') params.market_category = category;
      if (tagFilter !== 'all') params.market_tag = tagFilter;
      const res = await api.get('/posts', { params });
      if (p === 1) {
        setPosts(res.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.posts]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (e, postId) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post(`/posts/${postId}/like`);
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, is_liked: res.data.liked, like_count: p.like_count + (res.data.liked ? 1 : -1) }
            : p
        )
      );
    } catch (err) { console.error(err); }
  };

  const formatTime = (t) => {
    const d = new Date(t + 'Z');
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/boards')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <span className="header-title">二手集市</span>
        <div />
      </div>

      {/* 分类导航 */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px',
        borderBottom: '1px solid var(--border-light)', flexShrink: 0,
        WebkitOverflowScrolling: 'touch',
      }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{
              flexShrink: 0, padding: '6px 16px', fontSize: 14, fontWeight: 500,
              borderRadius: 16, border: 'none',
              background: category === c.key ? 'var(--accent)' : 'var(--bg)',
              color: category === c.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 标签筛选 */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 16px',
        borderBottom: '1px solid var(--border-light)',
      }}>
        {['all', 'sell', 'buy', 'giveaway'].map(t => (
          <button
            key={t}
            onClick={() => setTagFilter(t)}
            style={{
              padding: '4px 12px', fontSize: 12, fontWeight: 500,
              borderRadius: 12, border: 'none',
              background: tagFilter === t
                ? (t === 'all' ? 'var(--accent)' : TAG_COLORS[t])
                : 'var(--bg)',
              color: tagFilter === t ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'all' ? '全部' : TAG_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 帖子列表 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && page === 1 ? (
          <div className="loading-spinner" />
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
            </svg>
            <h3>还没有商品</h3>
            <p>来发布第一条闲置吧</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <div
                key={post.id}
                className="post-card"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <div className="post-header">
                  <div className="post-avatar">
                    {post.display_avatar ? (
                      <img src={post.display_avatar} alt="" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                  <div className="post-author">
                    <div className="post-author-name">
                      {post.nickname || '未知用户'}
                    </div>
                    <div className="post-meta">
                      <span>{formatTime(post.created_at)}</span>
                      <span style={{
                        fontSize: 11, padding: '1px 8px', borderRadius: 8,
                        background: TAG_COLORS[post.market_tag] + '18',
                        color: TAG_COLORS[post.market_tag],
                        fontWeight: 500,
                      }}>
                        {TAG_LABELS[post.market_tag] || post.market_tag}
                      </span>
                      {post.studio_name && (
                        <span className="studio-badge">{post.studio_name}</span>
                      )}
                    </div>
                  </div>
                  {user && post.user_id !== user.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) { navigate('/login'); return; }
                        api.post('/messages/conversations', { peer_id: post.user_id })
                          .then(r => navigate('/messages', { state: { openConvId: r.data.conversation.id } }))
                          .catch(() => alert('无法发起私信'));
                      }}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg)', flexShrink: 0, marginLeft: 'auto',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" width="14" height="14">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </button>
                  )}
                </div>

                {post.price && (
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
                    ¥{parseFloat(post.price).toFixed(2)}
                  </div>
                )}

                {post.images && (() => {
                  const imgs = JSON.parse(post.images);
                  if (imgs.length === 0) return null;
                  return (
                    <div className={`post-images ${imgs.length === 1 ? 'single' : 'multi'}`}>
                      {imgs.slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt="" />
                      ))}
                    </div>
                  );
                })()}

                {post.content && (
                  <div className="post-content">{post.content}</div>
                )}

                <div className="post-footer">
                  <span style={{
                    fontSize: 12, color: 'var(--text-tertiary)',
                    background: 'var(--bg)', padding: '2px 10px', borderRadius: 8,
                  }}>
                    {CATEGORY_LABELS[post.market_category] || post.market_category}
                  </span>
                  <span className="post-action" style={{ marginLeft: 'auto' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    {post.comment_count}
                  </span>
                  <span
                    className={`post-action ${post.is_liked ? 'active' : ''}`}
                    onClick={(e) => handleLike(e, post.id)}
                  >
                    <svg viewBox="0 0 24 24" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    {post.like_count}
                  </span>
                </div>
              </div>
            ))}

            {!loading && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  loadPosts(nextPage);
                }}>
                  加载更多
                </button>
              </div>
            )}

            {loading && page > 1 && <div className="loading-spinner" />}
          </>
        )}
      </div>
    </div>
  );
}
