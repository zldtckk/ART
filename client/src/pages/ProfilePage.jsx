import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ posts: 0, comments: 0, favorites: 0 });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/users/me/posts?limit=1').catch(() => null),
      api.get('/users/me/comments?limit=1').catch(() => null),
      api.get('/users/me/favorites?limit=1').catch(() => null),
    ]).then(([p, c, f]) => {
      setStats({
        posts: p?.data?.pagination?.total || 0,
        comments: c?.data?.pagination?.total || 0,
        favorites: f?.data?.pagination?.total || 0,
      });
    });
  }, [user]);

  if (!user) {
    return (
      <div className="page">
        <div className="header">
          <span className="header-title">我的</span>
        </div>
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3>未登录</h3>
          <p>登录后查看个人主页</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/login')}>
            去登录
          </button>
        </div>
      </div>
    );
  }

  const ENTRIES = [
    { key: 'posts', label: '我的帖子', icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" width="22" height="22">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ), color: '#007aff', count: stats.posts, path: '/my/posts' },
    { key: 'comments', label: '我的评论', icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" width="22" height="22">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ), color: '#34c759', count: stats.comments, path: '/my/comments' },
    { key: 'favorites', label: '我的收藏', icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" width="22" height="22">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    ), color: '#ff9500', count: stats.favorites, path: '/my/favorites' },
  ];

  return (
    <div className="page">
      <div className="header">
        <span className="header-title">我的</span>
        <button className="header-action" onClick={() => navigate('/settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* 个人信息头 */}
      <div style={{
        padding: '24px 16px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'var(--border)', overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user.nickname}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
            {user.studio_name || '未认证画室'}
            {user.class_name ? ` · ${user.class_name}` : ''}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
            ID: {user.sys_user_id || String(user.id).padStart(6, '0')}
          </p>
        </div>
        <div style={{
          fontSize: 12, textAlign: 'center', padding: '4px 10px',
          borderRadius: 12, whiteSpace: 'nowrap',
          background: user.verification_status === 'approved' ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)',
          color: user.verification_status === 'approved' ? 'var(--success)' : 'var(--warning)',
          fontWeight: 500,
        }}>
          {user.verification_status === 'approved' ? '已认证' : user.verification_status === 'pending' ? '审核中' : '未认证'}
        </div>
      </div>

      {/* 三个入口 */}
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {ENTRIES.map((e, i) => (
          <div
            key={e.key}
            onClick={() => navigate(e.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px',
              borderBottom: i < ENTRIES.length - 1 ? '1px solid var(--border-light)' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${e.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {e.icon(e.color)}
            </div>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{e.label}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>{e.count}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" width="18" height="18">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        ))}
      </div>

      {/* 快速入口 */}
      <div style={{ margin: '12px 16px', display: 'flex', gap: 8 }}>
        {user.verification_status !== 'approved' && (
          <button className="btn btn-primary" style={{ flex: 1, fontSize: 13, padding: '8px 0' }}
            onClick={() => navigate('/verify')}>
            {user.verification_status === 'pending' ? '查看审核状态' : '去认证'}
          </button>
        )}
        {(user.role === 'admin' || user.role === 'circle_master') && (
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13, padding: '8px 0' }}
            onClick={() => navigate('/admin/verify')}>
            管理后台
          </button>
        )}
      </div>

      {/* 退出登录 */}
      <div style={{ padding: '24px 16px' }}>
        <button className="btn btn-secondary btn-block" onClick={() => { logout(); navigate('/login'); }}>
          退出登录
        </button>
      </div>
    </div>
  );
}
