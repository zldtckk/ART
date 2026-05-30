import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [bannerIdx, setBannerIdx] = useState(0);

  // Banner auto-scroll
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Load hot posts for banner + feed
  const loadData = async () => {
    setLoading(true);
    try {
      const [hotRes, feedRes] = await Promise.all([
        api.get('/posts', { params: { limit: 10, sort: 'hot' } }).catch(() => null),
        api.get('/posts', { params: { page, limit: 20 } }),
      ]);

      if (hotRes?.data?.posts?.length) {
        setBanners(hotRes.data.posts.slice(0, 6));
      } else {
        setBanners(feedRes.data.posts.slice(0, 6));
      }

      if (page === 1) {
        setPosts(feedRes.data.posts);
      } else {
        setPosts((prev) => [...prev, ...feedRes.data.posts]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData();
  }, []);

  useEffect(() => {
    if (page > 1) loadData();
  }, [page]);

  const handleLike = async (e, postId) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post(`/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: res.data.liked, like_count: p.like_count + (res.data.liked ? 1 : -1) }
            : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const startChat = async (e, peerId) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post('/messages/conversations', { peer_id: peerId });
      navigate('/messages', { state: { openConvId: res.data.conversation.id } });
    } catch (err) {
      alert(err.response?.data?.error || '无法发起私信');
    }
  };

  const handleFavorite = async (e, postId) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post(`/users/posts/${postId}/favorite`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_favorited: res.data.favorited } : p
        )
      );
    } catch (err) {
      console.error(err);
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

  return (
    <div className="page">
      <div className="header">
        <span className="header-title">首页</span>
      </div>

      {user && user.verification_status !== 'approved' && (
        <div style={{
          margin: '8px 12px',
          padding: '10px 14px',
          background: user.verification_status === 'pending' ? 'rgba(0,122,255,0.06)' : 'rgba(255,149,0,0.1)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
        }}>
          <span style={{ color: user.verification_status === 'pending' ? 'var(--accent)' : '#8d6300' }}>
            {user.verification_status === 'pending' ? '认证审核中，请耐心等待' : '认证后即可发帖互动'}
          </span>
          {user.verification_status !== 'pending' && (
            <button onClick={() => navigate('/verify')} style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 13 }}>
              去认证
            </button>
          )}
        </div>
      )}

      {/* === 热帖排行 === */}
      {banners.length > 0 && (
        <div
          onClick={() => navigate(`/post/${banners[bannerIdx].id}`)}
          style={{
            margin: '8px 12px 4px',
            height: 60,
            borderRadius: 'var(--radius-md)',
            background: '#fff',
            display: 'flex',
            overflow: 'hidden',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{
            width: '20%',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            background: '#e74c3c',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>热帖</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>排行</div>
          </div>
          <div style={{
            flex: 1, padding: '0 12px',
            position: 'relative', overflow: 'hidden',
          }}>
            {banners.map((b, i) => (
              <div key={b.id} style={{
                position: 'absolute',
                left: 12, right: 12,
                top: 0, bottom: 0,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center',
                transition: 'opacity 0.5s, transform 0.5s',
                opacity: i === bannerIdx ? 1 : 0,
                transform: i === bannerIdx ? 'translateY(0)' : 'translateY(10px)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                  lineHeight: 1.3, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  paddingRight: 60,
                }}>
                  {b.content}
                </div>
                <div style={{
                  position: 'absolute', right: 0, bottom: 0,
                  fontSize: 9, color: 'var(--text-tertiary)',
                }}>
                  阅读量 {b.like_count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === 板块入口 === */}
      <div style={{
        margin: '8px 12px 4px',
        display: 'flex',
        gap: 10,
      }}>
        <div
          onClick={() => navigate('/board/circle')}
          style={{
            flex: 1, height: 50,
            background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
            borderRadius: 'var(--radius-md)',
            padding: '0 14px',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>画室圈子</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>闲聊·求助·树洞·拼车·拼饭</div>
        </div>
        <div
          onClick={() => navigate('/board/market')}
          style={{
            flex: 1, height: 50,
            background: 'linear-gradient(135deg, #ff9500 0%, #ff6b35 100%)',
            borderRadius: 'var(--radius-md)',
            padding: '0 14px',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>闲置交易</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>画材二手·低价好物</div>
        </div>
      </div>

      {/* === 最新动态 标题 === */}
      <div style={{
        padding: '16px 16px 8px',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        最新动态
      </div>

      {/* === 帖子流 === */}
      <div className="feed">
        {loading && page === 1 ? (
          <div className="loading-spinner" />
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <h3>还没有帖子</h3>
            <p>来发布第一条吧</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
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
                      {post.is_anonymous ? '匿名用户' : (post.display_name || '未知用户')}
                    </div>
                    <div className="post-meta">
                      <span>{formatTime(post.created_at)}</span>
                      {post.circle_type && (
                        <span className={`tag ${post.circle_type}`}>
                          {{general:'闲聊',help:'求助',anonymous:'树洞',carpool:'拼车',food:'拼饭',other:'其他'}[post.circle_type] || post.circle_type}
                        </span>
                      )}
                      {post.studio_name && (
                        <span className="studio-badge">{post.studio_name}</span>
                      )}
                    </div>
                  </div>
                  {user && !post.is_anonymous && post.user_id !== user.id && (
                    <button
                      onClick={(e) => startChat(e, post.user_id)}
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

                {post.content && (
                  <div className="post-content">{post.content}</div>
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

                <div className="post-footer">
                  <span className="post-action">
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
                  <span
                    className={`post-action ${post.is_favorited ? 'active' : ''}`}
                    onClick={(e) => handleFavorite(e, post.id)}
                  >
                    <svg viewBox="0 0 24 24" fill={post.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                    </svg>
                    {post.is_favorited ? '已收藏' : ''}
                  </span>
                </div>
              </div>
            ))}

            {!loading && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <button className="btn btn-secondary" onClick={() => setPage((p) => p + 1)}>
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
