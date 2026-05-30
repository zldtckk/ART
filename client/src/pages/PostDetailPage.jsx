import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      const res = await api.get(`/posts/${id}`);
      setPost(res.data.post);
      setComments(res.data.comments);
    } catch (err) {
      if (err.response?.status === 404) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post(`/posts/${id}/like`);
      setPost((prev) => ({
        ...prev,
        is_liked: res.data.liked,
        like_count: prev.like_count + (res.data.liked ? 1 : -1),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFavorite = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post(`/users/posts/${id}/favorite`);
      setPost((prev) => ({ ...prev, is_favorited: res.data.favorited }));
    } catch (err) {
      console.error(err);
    }
  };

  const startChat = async (peerId) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post('/messages/conversations', { peer_id: peerId });
      navigate('/messages', { state: { openConvId: res.data.conversation.id } });
    } catch (err) {
      alert(err.response?.data?.error || '无法发起私信');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${id}/comments`, { content: commentText.trim() });
      setComments((prev) => [...prev, res.data.comment]);
      setPost((prev) => ({ ...prev, comment_count: prev.comment_count + 1 }));
      setCommentText('');
    } catch (err) {
      alert(err.response?.data?.error || '评论失败');
    } finally {
      setSubmitting(false);
    }
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

  const CATEGORY_LABELS = {
    general: '闲聊', help: '求助', anonymous: '树洞',
    carpool: '拼车', food: '拼饭', other: '其他',
  };
  const MARKET_TAG_LABELS = { buy: '求购', sell: '出售', giveaway: '赠送' };
  const MARKET_TAG_COLORS = { buy: '#ff9500', sell: '#007aff', giveaway: '#34c759' };
  const MARKET_CAT_LABELS = { free: '免费赠送', art_supplies: '画材', books: '书籍', other: '其他' };

  if (loading) return <div className="loading-spinner" />;
  if (!post) return null;

  return (
    <div>
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
      </div>

      <div style={{ padding: '0' }}>
        <div className="post-card" style={{ cursor: 'default', borderBottom: 'none' }}>
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
                {post.is_anonymous ? '匿名用户' : (post.display_name || '未知用户')}
              </div>
              <div className="post-meta">
                <span>{formatTime(post.created_at)}</span>
                <span className={`tag ${post.circle_type}`}>
                  {CATEGORY_LABELS[post.circle_type] || post.circle_type}
                </span>
                {post.studio_name && (
                  <span className="studio-badge">{post.studio_name}</span>
                )}
              </div>
            </div>
            {user && !post.is_anonymous && post.user_id !== user.id && (
              <button
                onClick={(e) => { e.stopPropagation(); startChat(post.user_id); }}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg)', flexShrink: 0,
                }}
                title="发私信"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" width="16" height="16">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </button>
            )}
          </div>

          <div className="post-content">{post.content}</div>

          {post.images && (() => {
            const imgs = JSON.parse(post.images);
            if (imgs.length === 0) return null;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {imgs.map((url, i) => (
                  <img key={i} src={url} alt="" style={{ borderRadius: 8, maxHeight: 400, objectFit: 'cover', background: 'var(--border)' }} />
                ))}
              </div>
            );
          })()}

          {post.board === 'market' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {post.price && (
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                  ¥{parseFloat(post.price).toFixed(2)}
                </span>
              )}
              <span style={{
                fontSize: 12, padding: '2px 10px', borderRadius: 8,
                background: MARKET_TAG_COLORS[post.market_tag] + '18',
                color: MARKET_TAG_COLORS[post.market_tag],
                fontWeight: 500,
              }}>
                {MARKET_TAG_LABELS[post.market_tag] || post.market_tag}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {MARKET_CAT_LABELS[post.market_category] || post.market_category}
              </span>
            </div>
          )}

          <div className="post-footer" style={{ padding: '8px 0 0' }}>
            <span className="post-action" onClick={handleLike} style={post.is_liked ? { color: 'var(--accent)' } : {}}>
              <svg viewBox="0 0 24 24" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              {post.like_count}
            </span>
            <span className="post-action" onClick={handleFavorite} style={post.is_favorited ? { color: 'var(--warning)' } : {}}>
              <svg viewBox="0 0 24 24" fill={post.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              {post.is_favorited ? '已收藏' : '收藏'}
            </span>
          </div>
        </div>

        <div className="divider" />

        <div style={{ padding: '0 16px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            评论 ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', padding: '20px 0', textAlign: 'center' }}>
              暂无评论，来聊点什么吧
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="comment-item">
                <div className="post-avatar" style={{ width: 28, height: 28 }}>
                  {c.display_avatar ? (
                    <img src={c.display_avatar} alt="" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className="comment-content">
                  <div className="comment-name">{c.display_name || '匿名用户'}</div>
                  <div className="comment-text">{c.content}</div>
                  <div className="comment-time">{formatTime(c.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {user && (
        <div style={{
          position: 'sticky',
          bottom: 'var(--tab-height)',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-light)',
          padding: '10px 16px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          {user.is_verified ? (
            <>
              <input
                className="form-input"
                style={{ flex: 1, background: 'var(--bg)', borderRadius: 20, padding: '8px 14px', fontSize: 14 }}
                placeholder="写评论..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              />
              <button
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: 14, borderRadius: 20 }}
                onClick={handleComment}
                disabled={!commentText.trim() || submitting}
              >
                发送
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary btn-block"
              style={{ borderRadius: 20, fontSize: 14 }}
              onClick={() => navigate('/verify')}
            >
              认证后即可评论
            </button>
          )}
        </div>
      )}
    </div>
  );
}
