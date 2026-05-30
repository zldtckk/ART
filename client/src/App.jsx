import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import api from './api/client';
import LoginPage from './pages/LoginPage';
import FeedPage from './pages/FeedPage';
import CreatePostPage from './pages/CreatePostPage';
import PostDetailPage from './pages/PostDetailPage';
import ProfilePage from './pages/ProfilePage';
import VerifyPage from './pages/VerifyPage';
import AdminVerifyPage from './pages/AdminVerifyPage';
import BoardsPage from './pages/BoardsPage';
import ComingSoonPage from './pages/ComingSoonPage';
import BoardCirclePage from './pages/BoardCirclePage';
import BoardMarketPage from './pages/BoardMarketPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import MyPostsPage from './pages/MyPostsPage';
import MyCommentsPage from './pages/MyCommentsPage';
import MyFavoritesPage from './pages/MyFavoritesPage';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      try {
        const res = await api.get('/messages/notifications');
        setUnreadCount(res.data.unread_count);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const hideTabs = ['/login', '/create', '/verify', '/admin', '/my/', '/settings'].some(p => location.pathname.startsWith(p));
  if (hideTabs) return null;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="tab-bar">
      <button className={`tab-item ${isActive('/') ? 'active' : ''}`} onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill={isActive('/') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="24" height="24">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <span>首页</span>
      </button>

      <button className={`tab-item ${isActive('/messages') ? 'active' : ''}`} onClick={() => navigate('/messages')} style={{ position: 'relative' }}>
        <svg viewBox="0 0 24 24" fill={isActive('/messages') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="24" height="24">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <span>消息</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: '50%', marginRight: -28,
            background: 'var(--danger)', color: '#fff', fontSize: 10,
            borderRadius: 9, padding: '1px 6px', minWidth: 16, textAlign: 'center',
            lineHeight: '16px',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <button className="tab-fab" onClick={() => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }
        if (JSON.parse(localStorage.getItem('user') || '{}').verification_status !== 'approved') {
          navigate('/verify');
          return;
        }
        navigate('/create');
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <button className={`tab-item ${isActive('/board') ? 'active' : ''}`} onClick={() => navigate('/boards')}>
        <svg viewBox="0 0 24 24" fill={isActive('/boards') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="24" height="24">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span>板块</span>
      </button>

      <button className={`tab-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
        <svg viewBox="0 0 24 24" fill={isActive('/profile') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="24" height="24">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>我的</span>
      </button>
    </div>
  );
}

function AppRoutes() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<FeedPage />} />
        <Route path="/create" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
        <Route path="/post/:id" element={<PostDetailPage />} />
        <Route path="/verify" element={<ProtectedRoute><VerifyPage /></ProtectedRoute>} />
        <Route path="/admin/verify" element={<ProtectedRoute><AdminVerifyPage /></ProtectedRoute>} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/board/circle" element={<BoardCirclePage />} />
        <Route path="/board/market" element={<BoardMarketPage />} />
        <Route path="/board/fan" element={<ComingSoonPage name="爱豆专区" />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/my/posts" element={<ProtectedRoute><MyPostsPage /></ProtectedRoute>} />
        <Route path="/my/comments" element={<ProtectedRoute><MyCommentsPage /></ProtectedRoute>} />
        <Route path="/my/favorites" element={<ProtectedRoute><MyFavoritesPage /></ProtectedRoute>} />
      </Routes>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
