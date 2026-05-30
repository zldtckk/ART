import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('chat');
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatView, setChatView] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadConversations();
    loadNotifications();
  }, [user]);

  const loadConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations);
      // 如果从外部跳转过来要打开某个会话
      const openId = location.state?.openConvId;
      if (openId) {
        const conv = res.data.conversations.find(c => c.id === openId);
        if (conv) openChat(conv);
        window.history.replaceState({}, '');
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadNotifications = async () => {
    try {
      const res = await api.get('/messages/notifications');
      setNotifications(res.data.notifications);
      setUnreadNotif(res.data.unread_count);
    } catch (err) { console.error(err); }
  };

  const openChat = async (conv) => {
    setChatView(conv);
    setMsgText('');
    try {
      const res = await api.get(`/messages/conversations/${conv.id}/messages`);
      setMessages(res.data.messages);
      loadConversations();
    } catch (err) { console.error(err); }
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !chatView) return;
    try {
      const res = await api.post(`/messages/conversations/${chatView.id}/messages`, {
        content: msgText.trim()
      });
      setMessages(prev => [...prev, res.data.message]);
      setMsgText('');
      loadConversations();
    } catch (err) {
      alert(err.response?.data?.error || '发送失败');
    }
  };

  const markAllRead = async () => {
    await api.post('/messages/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadNotif(0);
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

  if (!user) return null;

  // === 聊天视图 ===
  if (chatView) {
    return (
      <div className="page">
        <div className="header">
          <button className="back-btn" onClick={() => setChatView(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <span className="header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="post-avatar" style={{ width: 28, height: 28 }}>
              {chatView.peer_avatar ? (
                <img src={chatView.peer_avatar} alt="" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            {chatView.peer_name}
          </span>
          <div />
        </div>

        <div style={{ padding: '0 16px', minHeight: 'calc(100vh - 160px)' }}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>发送第一条消息吧</p>
            </div>
          ) : (
            messages.map(m => {
              const isMe = m.sender_id === user.id;
              return (
                <div key={m.id} style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                  gap: 8,
                }}>
                  {!isMe && (
                    <div className="post-avatar" style={{ width: 32, height: 32, flexShrink: 0 }}>
                      {chatView.peer_avatar ? (
                        <img src={chatView.peer_avatar} alt="" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: 16,
                    background: isMe ? 'var(--accent)' : 'var(--bg-card)',
                    color: isMe ? '#fff' : 'var(--text-primary)',
                    fontSize: 15,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    {m.content}
                    <div style={{
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.6,
                      textAlign: 'right',
                    }}>
                      {formatTime(m.created_at)}
                      {isMe && (
                        <span style={{ marginLeft: 4 }}>{m.is_read ? '已读' : '送达'}</span>
                      )}
                    </div>
                  </div>
                  {isMe && (
                    <div className="post-avatar" style={{ width: 32, height: 32, flexShrink: 0 }}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{
          position: 'sticky', bottom: 'var(--tab-height)',
          background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)',
          padding: '10px 16px', display: 'flex', gap: 8,
        }}>
          <input
            className="form-input"
            style={{ flex: 1, borderRadius: 20, padding: '8px 14px', fontSize: 14 }}
            placeholder="输入消息..."
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: 14, borderRadius: 20 }}
            onClick={sendMessage}
            disabled={!msgText.trim()}
          >
            发送
          </button>
        </div>
      </div>
    );
  }

  // === 主列表视图 ===
  return (
    <div className="page">
      <div className="header">
        <span className="header-title">消息</span>
        {tab === 'notification' && unreadNotif > 0 && (
          <button className="header-action" onClick={markAllRead}>全部已读</button>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
        {[
          { key: 'chat', label: '私信', badge: conversations.reduce((s, c) => s + c.unread_count, 0) },
          { key: 'notification', label: '系统消息', badge: unreadNotif },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 0', fontSize: 15, fontWeight: 500,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-tertiary)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.badge > 0 && (
              <span style={{
                background: 'var(--danger)', color: '#fff', fontSize: 11,
                borderRadius: 10, padding: '1px 7px', minWidth: 20, textAlign: 'center',
              }}>
                {t.badge > 99 ? '99+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 私信列表 */}
      {tab === 'chat' && (
        <div>
          {loading ? (
            <div className="loading-spinner" />
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <h3>还没有私信</h3>
              <p>去帖子页面找同学聊天吧</p>
            </div>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                onClick={() => openChat(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: '#fff',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                }}
              >
                <div className="post-avatar" style={{ width: 44, height: 44 }}>
                  {c.peer_avatar ? (
                    <img src={c.peer_avatar} alt="" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{c.peer_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 14, color: 'var(--text-secondary)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.last_message || '暂无消息'}
                    </span>
                    {c.unread_count > 0 && (
                      <span style={{
                        background: 'var(--danger)', color: '#fff', fontSize: 11,
                        borderRadius: 10, padding: '1px 7px', flexShrink: 0,
                      }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 系统消息列表 */}
      {tab === 'notification' && (
        <div>
          {notifications.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <h3>暂无系统消息</h3>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={async () => {
                  if (!n.is_read) {
                    await api.post(`/messages/notifications/${n.id}/read`);
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x));
                    setUnreadNotif(prev => Math.max(0, prev - 1));
                  }
                  // 认证相关通知跳转
                  if (n.type === 'verify_result') {
                    if (n.title === '新认证申请') {
                      navigate('/admin/verify');
                    } else if (n.related_post_id) {
                      navigate(`/post/${n.related_post_id}`);
                    }
                  }
                }}
                style={{
                  padding: '14px 16px', background: n.is_read ? '#fff' : 'rgba(0,122,255,0.04)',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: n.type === 'verify_result' ? 'rgba(52,199,89,0.1)' : 'rgba(0,122,255,0.1)',
                  }}>
                    {n.type === 'verify_result' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" width="18" height="18">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" width="18" height="18">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                      {n.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
